'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { getEmployeeSettings, saveEmployeeSettings } from '@/app/actions/employee-settings'

interface CompensationConfigDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  employeeName: string
  onSave?: () => void
}

export function CompensationConfigDialog({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onSave,
}: CompensationConfigDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [compensationType, setCompensationType] = useState<'hourly' | 'salary' | 'combined'>('hourly')
  const [hourlyRate, setHourlyRate] = useState('')
  const [monthlySalary, setMonthlySalary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && employeeId) {
      loadSettings()
    }
  }, [isOpen, employeeId])

  const loadSettings = async () => {
    setLoadingData(true)
    setError(null)

    try {
      const result = await getEmployeeSettings(employeeId)

      if (result.success && result.data) {
        setCompensationType(result.data.compensation_type)
        setHourlyRate(result.data.hourly_rate?.toString() || '')
        setMonthlySalary(result.data.monthly_salary?.toString() || '')
      } else {
        // No settings yet - use defaults
        setCompensationType('hourly')
        setHourlyRate('')
        setMonthlySalary('')
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Einstellungen')
    } finally {
      setLoadingData(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    // Validation
    if (compensationType === 'hourly' && (!hourlyRate || parseFloat(hourlyRate) <= 0)) {
      setError('Bitte geben Sie einen gültigen Stundenlohn ein')
      return
    }

    if (compensationType === 'salary' && (!monthlySalary || parseFloat(monthlySalary) <= 0)) {
      setError('Bitte geben Sie ein gültiges Monatsgehalt ein')
      return
    }

    if (compensationType === 'combined') {
      if (!monthlySalary || parseFloat(monthlySalary) <= 0) {
        setError('Bitte geben Sie ein gültiges Festgehalt ein')
        return
      }
      if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
        setError('Bitte geben Sie einen gültigen Stundenlohn ein')
        return
      }
    }

    setLoading(true)

    try {
      const result = await saveEmployeeSettings({
        employee_id: employeeId,
        compensation_type: compensationType,
        hourly_rate: (compensationType === 'hourly' || compensationType === 'combined') ? parseFloat(hourlyRate) : undefined,
        monthly_salary: (compensationType === 'salary' || compensationType === 'combined') ? parseFloat(monthlySalary) : undefined,
      })

      if (result.success) {
        setSuccess('Einstellungen erfolgreich gespeichert')
        setTimeout(() => {
          if (onSave) onSave()
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Fehler beim Speichern')
      }
    } catch (err: any) {
      setError(err.message || 'Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setSuccess(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Vergütung konfigurieren</DialogTitle>
          <p className="text-sm text-muted-foreground">{employeeName}</p>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md">
                {success}
              </div>
            )}

            <div className="space-y-3">
              <Label>Vergütungsart</Label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="compensation_type"
                    value="hourly"
                    checked={compensationType === 'hourly'}
                    onChange={(e) => setCompensationType(e.target.value as 'hourly')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Nur Stundenlohn</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="compensation_type"
                    value="salary"
                    checked={compensationType === 'salary'}
                    onChange={(e) => setCompensationType(e.target.value as 'salary')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Nur Festgehalt (Legacy)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="compensation_type"
                    value="combined"
                    checked={compensationType === 'combined'}
                    onChange={(e) => setCompensationType(e.target.value as 'combined')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Festgehalt + Stundenlohn (Kombiniert)</span>
                </label>
              </div>
            </div>

            {compensationType === 'hourly' && (
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Stundenlohn (€)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="z.B. 25.00"
                />
                <p className="text-xs text-muted-foreground">
                  Betrag pro Arbeitsstunde
                </p>
              </div>
            )}

            {compensationType === 'salary' && (
              <div className="space-y-2">
                <Label htmlFor="monthly_salary">Monatsgehalt (€)</Label>
                <Input
                  id="monthly_salary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  placeholder="z.B. 3000.00"
                />
                <p className="text-xs text-muted-foreground">
                  Fester monatlicher Betrag (Legacy-Modus)
                </p>
              </div>
            )}

            {compensationType === 'combined' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="monthly_salary_combined">Festgehalt (€/Monat)</Label>
                  <Input
                    id="monthly_salary_combined"
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    placeholder="z.B. 3000.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fester monatlicher Betrag (Basis)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_rate_combined">Stundenlohn (€/h)</Label>
                  <Input
                    id="hourly_rate_combined"
                    type="number"
                    step="0.01"
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="z.B. 20.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wird für abgerechnete Stunden zusätzlich zum Festgehalt bezahlt
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    <strong>Berechnung:</strong> Festgehalt + (Stunden × Stundenlohn) + Bonus = Gesamtgehalt<br/>
                    <strong>Export-Stunden:</strong> Gesamtgehalt / Stundenlohn (für Abrechnungssystem)
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={loading || loadingData}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              'Speichern'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
