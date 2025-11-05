'use client'

import { useState } from 'react'
import type { Employee } from '@/app/actions/employees'
import type { EmployeeSettings } from '@/lib/types/time-tracking'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, UserCircle, UserPlus } from 'lucide-react'
import { EmployeeDetailModal } from './employee-detail-modal'
import { AddEmployeeDialog } from './add-employee-dialog'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface EmployeesTableProps {
  employees: Employee[]
  employeeSettings: EmployeeSettings[]
  isAdmin: boolean
  isManager: boolean
}

export function EmployeesTable({ employees, employeeSettings, isAdmin, isManager }: EmployeesTableProps) {
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Create a map for quick lookup
  const settingsMap = new Map(employeeSettings.map(s => [s.employee_id, s]))

  // Check if employee is inactive (either is_active false OR exit_date in past/today)
  const isEmployeeInactive = (employee: Employee) => {
    return employee.is_active === false ||
           (employee.exit_date && new Date(employee.exit_date) <= new Date())
  }

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const searchLower = search.toLowerCase()
    const matchesSearch =
      !search ||
      employee.first_name?.toLowerCase().includes(searchLower) ||
      employee.last_name?.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower)

    const matchesRole = roleFilter === 'all' || employee.role === roleFilter
    const isInactive = isEmployeeInactive(employee)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !isInactive) ||
      (statusFilter === 'inactive' && isInactive)

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (role: string) => {
    const badges = {
      employee: { variant: 'secondary' as const, label: 'Mitarbeiter' },
      manager: { variant: 'default' as const, label: 'Manager' },
      admin: { variant: 'destructive' as const, label: 'Administrator' }
    }
    return badges[role as keyof typeof badges] || badges.employee
  }

  const getEmployeeName = (employee: Employee) => {
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
    }
    return employee.email
  }

  const getCompensationDisplay = (employeeId: string) => {
    const settings = settingsMap.get(employeeId)
    if (!settings) return '-'

    if (settings.compensation_type === 'hourly') {
      return `${settings.hourly_rate?.toFixed(2) || '0.00'}€/Std.`
    } else {
      return `${settings.monthly_salary?.toFixed(0) || '0'}€/Monat`
    }
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          {/* Header with Add Button */}
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Mitarbeiter hinzufügen
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Nach Name oder E-Mail suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="all">Alle Rollen</option>
              <option value="employee">Mitarbeiter</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>

          {/* Results Count */}
          <p className="text-sm text-muted-foreground mb-4">
            {filteredEmployees.length} von {employees.length} Mitarbeiter{filteredEmployees.length !== 1 ? 'n' : ''}
          </p>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-sm">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">E-Mail</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Rolle</th>
                  {(isAdmin || isManager) && (
                    <th className="text-left py-3 px-4 font-medium text-sm">Vergütung</th>
                  )}
                  <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={(isAdmin || isManager) ? 5 : 4} className="text-center py-8 text-muted-foreground">
                      Keine Mitarbeiter gefunden
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => {
                    const roleBadge = getRoleBadge(employee.role)
                    const name = getEmployeeName(employee)
                    const isInactive = isEmployeeInactive(employee)

                    return (
                      <tr
                        key={employee.id}
                        onClick={() => setSelectedEmployee(employee)}
                        className={`border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${isInactive ? 'opacity-50' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <UserCircle className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">{name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {employee.email}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={roleBadge.variant}>
                            {roleBadge.label}
                          </Badge>
                        </td>
                        {(isAdmin || isManager) && (
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {getCompensationDisplay(employee.id)}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          {!employee.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                              Inaktiv
                            </span>
                          ) : employee.exit_date && new Date(employee.exit_date) <= new Date() ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-orange-600">
                              <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                              Ausgetreten
                            </span>
                          ) : employee.exit_date ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-yellow-600">
                              <span className="w-2 h-2 rounded-full bg-yellow-600"></span>
                              Austritt {format(new Date(employee.exit_date), 'dd.MM.yyyy', { locale: de })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                              <span className="w-2 h-2 rounded-full bg-green-600"></span>
                              Aktiv
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          employeeSettings={settingsMap.get(selectedEmployee.id) || null}
          isAdmin={isAdmin}
          isManager={isManager}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </>
  )
}
