'use client'

import { useState } from 'react'
import type { Employee } from '@/app/actions/employees'
import type { EmployeeSettings } from '@/lib/types/time-tracking'
import { updateEmployeeRole, toggleEmployeeStatus, deleteEmployee, resendInvitationEmail } from '@/app/actions/employees'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { UserCircle, Mail, Calendar, Shield, ToggleLeft, ToggleRight, Euro, Trash2, Send } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { CompensationConfigDialog } from '@/app/(dashboard)/zeiterfassung/verwaltung/components/compensation-config-dialog'

interface EmployeeDetailModalProps {
  employee: Employee
  employeeSettings: EmployeeSettings | null
  isAdmin: boolean
  isManager: boolean
  onClose: () => void
}

export function EmployeeDetailModal({ employee, employeeSettings, isAdmin, isManager, onClose }: EmployeeDetailModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'employee' | 'manager' | 'admin'>(employee.role)
  const [compensationDialogOpen, setCompensationDialogOpen] = useState(false)

  const getEmployeeName = () => {
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
    }
    return employee.email
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      employee: { variant: 'secondary' as const, label: 'Mitarbeiter' },
      manager: { variant: 'default' as const, label: 'Manager' },
      admin: { variant: 'destructive' as const, label: 'Administrator' }
    }
    return badges[role as keyof typeof badges] || badges.employee
  }

  const handleRoleChange = async () => {
    if (selectedRole === employee.role) return

    setLoading(true)
    setError(null)

    const result = await updateEmployeeRole(employee.id, selectedRole)

    if (result.success) {
      router.refresh()
      onClose()
    } else {
      setError(result.error || 'Fehler beim Ändern der Rolle')
    }

    setLoading(false)
  }

  const handleStatusToggle = async () => {
    setLoading(true)
    setError(null)

    const newStatus = !employee.is_active

    const result = await toggleEmployeeStatus(employee.id, newStatus)

    if (result.success) {
      router.refresh()
      onClose()
    } else {
      setError(result.error || 'Fehler beim Ändern des Status')
    }

    setLoading(false)
  }

  const roleBadge = getRoleBadge(employee.role)

  const getCompensationDisplay = () => {
    if (!employeeSettings) return 'Nicht konfiguriert'

    if (employeeSettings.compensation_type === 'hourly') {
      return `${employeeSettings.hourly_rate?.toFixed(2) || '0.00'}€/Stunde`
    } else {
      return `${employeeSettings.monthly_salary?.toFixed(0) || '0'}€/Monat (Stundensatz: ${employeeSettings.hourly_rate?.toFixed(2) || '0.00'}€)`
    }
  }

  const handleCompensationSaved = () => {
    setCompensationDialogOpen(false)
    router.refresh()
  }

  const handleResendInvitation = async () => {
    if (!confirm('Einladungs-E-Mail erneut senden? Ein neues Passwort wird generiert.')) {
      return
    }

    setLoading(true)
    setError(null)

    const result = await resendInvitationEmail(employee.id)

    if (result.success) {
      toast.success('Einladung wurde erneut versendet!')
      onClose()
    } else {
      setError(result.error || 'Fehler beim Versenden der Einladung')
    }

    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Mitarbeiter "${getEmployeeName()}" wirklich löschen?\n\nDies kann nicht rückgängig gemacht werden!`)) {
      return
    }

    setLoading(true)
    setError(null)

    const result = await deleteEmployee(employee.id)

    if (result.success) {
      toast.success('Mitarbeiter wurde gelöscht')
      router.refresh()
      onClose()
    } else {
      setError(result.error || 'Fehler beim Löschen des Mitarbeiters')
    }

    setLoading(false)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mitarbeiter-Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <UserCircle className="w-10 h-10 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">{getEmployeeName()}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {employee.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label className="text-xs text-muted-foreground">Rolle</Label>
                <div className="mt-1">
                  <Badge variant={roleBadge.variant}>
                    {roleBadge.label}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {employee.is_active ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-green-600"></span>
                      Aktiv
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      Inaktiv
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Erstellt am</Label>
                <p className="text-sm mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(employee.created_at), 'dd.MM.yyyy', { locale: de })}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Aktualisiert am</Label>
                <p className="text-sm mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(employee.updated_at), 'dd.MM.yyyy', { locale: de })}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Administrator-Aktionen
              </h4>

              {/* Role Change */}
              <div className="space-y-2">
                <Label htmlFor="role">Rolle ändern</Label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'employee' | 'manager' | 'admin')}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  disabled={loading}
                >
                  <option value="employee">Mitarbeiter</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
                {selectedRole !== employee.role && (
                  <Button
                    onClick={handleRoleChange}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    {loading ? 'Wird geändert...' : 'Rolle speichern'}
                  </Button>
                )}
              </div>

              {/* Status Toggle */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Button
                  onClick={handleStatusToggle}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  {employee.is_active ? (
                    <>
                      <ToggleRight className="w-4 h-4 mr-2" />
                      Mitarbeiter deaktivieren
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 mr-2" />
                      Mitarbeiter aktivieren
                    </>
                  )}
                </Button>
              </div>

              {/* Compensation */}
              <div className="space-y-2">
                <Label>Vergütung</Label>
                <div className="p-3 bg-muted/50 rounded-md text-sm">
                  {getCompensationDisplay()}
                </div>
                <Button
                  onClick={() => setCompensationDialogOpen(true)}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Euro className="w-4 h-4 mr-2" />
                  Vergütung bearbeiten
                </Button>
              </div>

              {/* Resend Invitation */}
              <div className="space-y-2">
                <Label>Einladung</Label>
                <Button
                  onClick={handleResendInvitation}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Einladung erneut senden
                </Button>
              </div>

              {/* Delete Employee */}
              <div className="space-y-2 pt-4 border-t border-destructive/20">
                <Label className="text-destructive">Gefahrenzone</Label>
                <Button
                  onClick={handleDelete}
                  disabled={loading}
                  variant="destructive"
                  className="w-full justify-start"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Mitarbeiter löschen
                </Button>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Compensation Config Dialog */}
      <CompensationConfigDialog
        isOpen={compensationDialogOpen}
        onClose={() => setCompensationDialogOpen(false)}
        employeeId={employee.id}
        employeeName={getEmployeeName()}
        onSave={handleCompensationSaved}
      />
    </Dialog>
  )
}
