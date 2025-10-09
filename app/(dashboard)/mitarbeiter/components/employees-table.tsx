'use client'

import { useState } from 'react'
import type { Employee } from '@/app/actions/employees'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, UserCircle } from 'lucide-react'
import { EmployeeDetailModal } from './employee-detail-modal'

interface EmployeesTableProps {
  employees: Employee[]
  isAdmin: boolean
}

export function EmployeesTable({ employees, isAdmin }: EmployeesTableProps) {
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const searchLower = search.toLowerCase()
    const matchesSearch =
      !search ||
      employee.first_name?.toLowerCase().includes(searchLower) ||
      employee.last_name?.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower)

    const matchesRole = roleFilter === 'all' || employee.role === roleFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && employee.is_active) ||
      (statusFilter === 'inactive' && !employee.is_active)

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

  return (
    <>
      <Card>
        <CardContent className="pt-6">
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
                  <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      Keine Mitarbeiter gefunden
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => {
                    const roleBadge = getRoleBadge(employee.role)
                    const name = getEmployeeName(employee)

                    return (
                      <tr
                        key={employee.id}
                        onClick={() => setSelectedEmployee(employee)}
                        className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
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
                        <td className="py-3 px-4">
                          {employee.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                              <span className="w-2 h-2 rounded-full bg-green-600"></span>
                              Aktiv
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                              Inaktiv
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
          isAdmin={isAdmin}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </>
  )
}
