'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Download, Mail, Loader2, Plus, X } from 'lucide-react'
import { getSavedRecipients } from '@/app/actions/time-reports'
import type { TimeReportRecipient } from '@/lib/types/time-tracking'

interface Employee {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

interface ReportExportDialogProps {
  isOpen: boolean
  onClose: () => void
  year: number
  month: number
  employeeId: string
  monthName: string
  employees: Employee[]
}

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

export function ReportExportDialog({
  isOpen,
  onClose,
  year,
  month,
  employeeId,
  monthName,
  employees,
}: ReportExportDialogProps) {
  const [activeTab, setActiveTab] = useState('download')
  const [loading, setLoading] = useState(false)
  const [savedRecipients, setSavedRecipients] = useState<TimeReportRecipient[]>([])
  const [recipients, setRecipients] = useState<string[]>([''])
  const [subject, setSubject] = useState(`Abrechnung ${monthName} ${year}`)
  const [body, setBody] = useState(
    `Sehr geehrte Damen und Herren,\n\nim Anhang befindet sich die Abrechnung für den Monat ${monthName} ${year}.\n\nMit freundlichen Grüßen`
  )
  const [saveRecipients, setSaveRecipients] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Employee selection state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      loadSavedRecipients()
      // Initialize employee selection based on current filter
      if (employeeId === 'all') {
        // Select all employees
        setSelectedEmployeeIds(employees.map(emp => emp.id))
      } else {
        // Select only the current employee
        setSelectedEmployeeIds([employeeId])
      }
    }
  }, [isOpen, employeeId, employees])

  const loadSavedRecipients = async () => {
    const result = await getSavedRecipients()
    if (result.success && result.data) {
      setSavedRecipients(result.data)
    }
  }

  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId)
      } else {
        return [...prev, employeeId]
      }
    })
  }

  const handleSelectAll = () => {
    setSelectedEmployeeIds(employees.map(emp => emp.id))
  }

  const handleSelectNone = () => {
    setSelectedEmployeeIds([])
  }

  const getEmployeeName = (employee: Employee) => {
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`
    }
    return employee.email
  }

  const handleDownload = () => {
    if (selectedEmployeeIds.length === 0) {
      setError('Bitte wählen Sie mindestens einen Mitarbeiter aus')
      return
    }

    const employeeParam = selectedEmployeeIds.join(',')
    const url = `/api/zeiterfassung/pdf?year=${year}&month=${month}&employees=${employeeParam}`
    window.open(url, '_blank')
  }

  const handleAddRecipient = () => {
    setRecipients([...recipients, ''])
  }

  const handleRemoveRecipient = (index: number) => {
    if (recipients.length > 1) {
      const newRecipients = recipients.filter((_, i) => i !== index)
      setRecipients(newRecipients)
    }
  }

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...recipients]
    newRecipients[index] = value
    setRecipients(newRecipients)
  }

  const handleAddSavedRecipient = (email: string) => {
    // Check if already added
    if (recipients.includes(email)) {
      return
    }

    // Find empty field or add new
    const emptyIndex = recipients.findIndex((r) => !r.trim())
    if (emptyIndex !== -1) {
      const newRecipients = [...recipients]
      newRecipients[emptyIndex] = email
      setRecipients(newRecipients)
    } else {
      setRecipients([...recipients, email])
    }
  }

  const handleSendEmail = async () => {
    setError(null)
    setSuccess(null)

    // Validate employee selection
    if (selectedEmployeeIds.length === 0) {
      setError('Bitte wählen Sie mindestens einen Mitarbeiter aus')
      return
    }

    // Validate recipients
    const validRecipients = recipients.filter((r) => r.trim() !== '')

    if (validRecipients.length === 0) {
      setError('Bitte geben Sie mindestens einen Empfänger an')
      return
    }

    if (!subject.trim()) {
      setError('Bitte geben Sie einen Betreff an')
      return
    }

    if (!body.trim()) {
      setError('Bitte geben Sie eine Nachricht an')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/zeiterfassung/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          month,
          employees: selectedEmployeeIds,
          recipients: validRecipients,
          subject,
          body,
          save_recipients: saveRecipients,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message || 'E-Mail erfolgreich versendet')
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(result.message || result.error || 'Fehler beim Versenden der E-Mail')
      }
    } catch (err: any) {
      setError(err.message || 'Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zeitabrechnung exportieren</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {monthName} {year}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="download">
              <Download className="w-4 h-4 mr-2" />
              PDF herunterladen
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Per E-Mail versenden
            </TabsTrigger>
          </TabsList>

          <TabsContent value="download" className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Mitarbeiter auswählen</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    Alle
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectNone}
                  >
                    Keine
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                {employees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onChange={() => handleToggleEmployee(employee.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm flex-1">
                      {getEmployeeName(employee)}
                    </span>
                  </label>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {selectedEmployeeIds.length} von {employees.length} Mitarbeiter ausgewählt
              </p>
            </div>

            <div className="border border-border rounded-lg p-4 bg-muted/50">
              <Button onClick={handleDownload} className="w-full" disabled={selectedEmployeeIds.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                PDF herunterladen
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label>Mitarbeiter auswählen</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    Alle
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectNone}
                  >
                    Keine
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {employees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onChange={() => handleToggleEmployee(employee.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm flex-1">
                      {getEmployeeName(employee)}
                    </span>
                  </label>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {selectedEmployeeIds.length} von {employees.length} Mitarbeiter ausgewählt
              </p>
            </div>

            <div className="space-y-3">
              <Label>Empfänger</Label>
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={recipient}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    placeholder="E-Mail-Adresse"
                    className="flex-1"
                  />
                  {recipients.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveRecipient(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRecipient}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Weiteren Empfänger hinzufügen
              </Button>

              {savedRecipients.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Gespeicherte Empfänger (klicken zum Hinzufügen):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {savedRecipients.map((recipient) => (
                      <Badge
                        key={recipient.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => handleAddSavedRecipient(recipient.email)}
                      >
                        {recipient.name || recipient.email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Nachricht</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Nachricht"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Die E-Mail-Signatur wird automatisch hinzugefügt
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="save_recipients"
                checked={saveRecipients}
                onChange={(e) => setSaveRecipients(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="save_recipients" className="text-sm font-normal cursor-pointer">
                Neue E-Mail-Adressen für zukünftige Abrechnungen speichern
              </Label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Abbrechen
              </Button>
              <Button onClick={handleSendEmail} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird versendet...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    E-Mail versenden
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
