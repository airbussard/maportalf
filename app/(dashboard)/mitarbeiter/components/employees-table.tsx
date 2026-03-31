'use client'

import { useState } from 'react'
import type { Employee } from '@/app/actions/employees'
import type { EmployeeSettings } from '@/lib/types/time-tracking'
import { Button } from '@/components/ui/button'
import { Search, UserPlus, Eye } from 'lucide-react'
import { StatusBadge } from '@/components/nextadmin'
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

  const getRoleBadge = (role: string): { variant: 'info' | 'brand' | 'error'; label: string } => {
    const badges = {
      employee: { variant: 'info' as const, label: 'Mitarbeiter' },
      manager: { variant: 'brand' as const, label: 'Manager' },
      admin: { variant: 'error' as const, label: 'Administrator' }
    }
    return badges[role as keyof typeof badges] || badges.employee
  }

  const getEmployeeName = (employee: Employee) => {
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
    }
    return employee.email
  }

  const getInitials = (employee: Employee) => {
    const first = employee.first_name?.[0]?.toUpperCase() || ''
    const last = employee.last_name?.[0]?.toUpperCase() || ''
    if (first || last) return `${first}${last}`
    return employee.email[0]?.toUpperCase() || '?'
  }

  const getCompensationDisplay = (employeeId: string) => {
    const settings = settingsMap.get(employeeId)
    if (!settings) return '-'

    if (settings.compensation_type === 'hourly') {
      return `${settings.hourly_rate?.toFixed(2) || '0.00'}\u20AC/Std.`
    } else {
      return `${settings.monthly_salary?.toFixed(0) || '0'}\u20AC/Monat`
    }
  }

  const colCount = isAdmin ? 6 : 5

  return (
    <>
      <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-7.5 pt-7.5 pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Mitarbeiter</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredEmployees.length} von {employees.length} Mitarbeiter{filteredEmployees.length !== 1 ? 'n' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <input
                type="search"
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-w-[180px] rounded-full border border-border bg-accent/30 py-2.5 pl-11 pr-5 text-sm outline-none transition focus:border-[#fbb928] dark:border-dark-3 dark:bg-dark-2"
              />
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border-[1.5px] border-border bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-[#fbb928] dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="all">Alle Rollen</option>
              <option value="employee">Mitarbeiter</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border-[1.5px] border-border bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-[#fbb928] dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>

            {/* Add button */}
            {isAdmin && (
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-[#fbb928] hover:bg-[#e5a820] text-zinc-900 font-medium"
              >
                <UserPlus className="size-4 mr-2" />
                Hinzufugen
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-border bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-sm [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                <th className="pl-7.5 text-left min-w-[220px]">Mitarbeiter</th>
                <th className="text-left min-w-[120px]">Rolle</th>
                <th className="text-left min-w-[140px]">Status</th>
                {isAdmin && (
                  <th className="text-left min-w-[130px]">Vergutung</th>
                )}
                <th className="text-left min-w-[100px]">Erstellt</th>
                <th className="pr-7.5 text-right min-w-[80px]">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="py-12 text-center text-muted-foreground">
                    Keine Mitarbeiter gefunden
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const roleBadge = getRoleBadge(employee.role)
                  const isInactive = isEmployeeInactive(employee)

                  return (
                    <tr
                      key={employee.id}
                      onClick={() => setSelectedEmployee(employee)}
                      className={`border-b border-border transition-colors hover:bg-accent/30 cursor-pointer ${isInactive ? 'opacity-50' : ''}`}
                    >
                      {/* Avatar + Name + Email */}
                      <td className="py-4 pl-7.5">
                        <div className="flex items-center gap-3.5">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbb928] text-sm font-bold text-zinc-900">
                            {getInitials(employee)}
                          </div>
                          <div>
                            <h5 className="font-medium text-foreground leading-tight">
                              {getEmployeeName(employee)}
                            </h5>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="py-4">
                        <StatusBadge variant={roleBadge.variant}>
                          {roleBadge.label}
                        </StatusBadge>
                      </td>

                      {/* Status with dot */}
                      <td className="py-4">
                        {!employee.is_active ? (
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full bg-[#6B7280]" />
                            <span className="text-sm text-[#6B7280]">Inaktiv</span>
                          </div>
                        ) : employee.exit_date && new Date(employee.exit_date) <= new Date() ? (
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full bg-[#FF9C55]" />
                            <span className="text-sm text-[#FF9C55]">Ausgetreten</span>
                          </div>
                        ) : employee.exit_date ? (
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full bg-[#FFA70B]" />
                            <span className="text-sm text-[#FFA70B]">
                              Austritt {format(new Date(employee.exit_date), 'dd.MM.yyyy', { locale: de })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full bg-[#219653]" />
                            <span className="text-sm text-[#219653]">Aktiv</span>
                          </div>
                        )}
                      </td>

                      {/* Compensation (admin only) */}
                      {isAdmin && (
                        <td className="py-4 text-sm text-muted-foreground">
                          {getCompensationDisplay(employee.id)}
                        </td>
                      )}

                      {/* Created date */}
                      <td className="py-4 text-sm text-muted-foreground">
                        {format(new Date(employee.created_at), 'dd.MM.yyyy', { locale: de })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pr-7.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEmployee(employee)
                            }}
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#fbb928]"
                            title="Details anzeigen"
                          >
                            <Eye className="size-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
