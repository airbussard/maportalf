'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getTimeEntries, getMonthlyStats } from '@/app/actions/time-tracking'
import { closeMonth, reopenMonth, getTimeReport } from '@/app/actions/time-reports'
import type { MonthlyStats, EmployeeSettings } from '@/lib/types/time-tracking'
import { ReportExportDialog } from './report-export-dialog'
import { CompensationConfigDialog } from './compensation-config-dialog'
import { Download, Settings } from 'lucide-react'

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

interface Employee {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

interface AdminTimeTrackingViewProps {
  initialYear: number
  initialMonth: number
  selectedEmployee: string
  employees: Employee[]
  employeeSettings: EmployeeSettings[]
}

interface EmployeeStats {
  employee: Employee
  stats: MonthlyStats
  isClosed: boolean
  calculatedSalary: number
}

export function AdminTimeTrackingView({
  initialYear,
  initialMonth,
  selectedEmployee,
  employees,
  employeeSettings,
}: AdminTimeTrackingViewProps) {
  const router = useRouter()
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [employee, setEmployee] = useState(selectedEmployee)
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [compensationDialogOpen, setCompensationDialogOpen] = useState(false)
  const [selectedEmployeeForConfig, setSelectedEmployeeForConfig] = useState<Employee | null>(null)

  // Create map for quick lookup
  const settingsMap = new Map(employeeSettings.map(s => [s.employee_id, s]))

  useEffect(() => {
    loadData()
  }, [year, month, employee])

  const calculateSalary = (
    totalMinutes: number,
    bonusAmount: number,
    employeeId: string
  ): number => {
    const settings = settingsMap.get(employeeId)
    if (!settings) return 0

    const totalHours = totalMinutes / 60

    switch (settings.compensation_type) {
      case 'hourly':
        // Hourly: hours × rate + bonus
        return (totalHours * (settings.hourly_rate || 0)) + bonusAmount

      case 'combined':
        // Combined: monthly salary + (hours × rate) + bonus
        return (settings.monthly_salary || 0) + (totalHours * (settings.hourly_rate || 0)) + bonusAmount

      case 'salary':
        // Salary (Legacy): just monthly salary + bonus
        return (settings.monthly_salary || 0) + bonusAmount

      default:
        return 0
    }
  }

  const loadData = async () => {
    setLoading(true)

    if (employee === 'all') {
      // Load stats for all employees
      const allStats: EmployeeStats[] = []

      for (const emp of employees) {
        const statsResult = await getMonthlyStats(year, month, emp.id)
        const reportResult = await getTimeReport(year, month, emp.id)

        if (statsResult.success && statsResult.data) {
          const bonusAmount = reportResult.data?.bonus_amount || 0
          const calculatedSalary = calculateSalary(
            statsResult.data.total_minutes,
            bonusAmount,
            emp.id
          )

          allStats.push({
            employee: emp,
            stats: statsResult.data,
            isClosed: reportResult.data?.is_closed || false,
            calculatedSalary,
          })
        }
      }

      setEmployeeStats(allStats)
    } else {
      // Load stats for selected employee
      const emp = employees.find((e) => e.id === employee)
      if (emp) {
        const statsResult = await getMonthlyStats(year, month, employee)
        const reportResult = await getTimeReport(year, month, employee)

        if (statsResult.success && statsResult.data) {
          const bonusAmount = reportResult.data?.bonus_amount || 0
          const calculatedSalary = calculateSalary(
            statsResult.data.total_minutes,
            bonusAmount,
            emp.id
          )

          setEmployeeStats([
            {
              employee: emp,
              stats: statsResult.data,
              isClosed: reportResult.data?.is_closed || false,
              calculatedSalary,
            },
          ])
        }
      }
    }

    setLoading(false)
  }

  const handleMonthChange = (value: string) => {
    setMonth(parseInt(value))
    router.push(
      `/zeiterfassung/verwaltung?year=${year}&month=${value}&employee=${employee}`
    )
  }

  const handleYearChange = (value: string) => {
    setYear(parseInt(value))
    router.push(
      `/zeiterfassung/verwaltung?year=${value}&month=${month}&employee=${employee}`
    )
  }

  const handleEmployeeChange = (value: string) => {
    setEmployee(value)
    router.push(`/zeiterfassung/verwaltung?year=${year}&month=${month}&employee=${value}`)
  }

  const handleCloseMonth = async (employeeId: string) => {
    const stats = employeeStats.find((s) => s.employee.id === employeeId)
    if (!stats) return

    if (!confirm('Möchten Sie diesen Monat wirklich abschließen?')) return

    setActionLoading(employeeId)
    const result = await closeMonth(year, month, employeeId, stats.stats.total_minutes)

    if (result.success) {
      await loadData()
    } else {
      alert(result.error || 'Fehler beim Abschließen')
    }

    setActionLoading(null)
  }

  const handleReopenMonth = async (employeeId: string) => {
    if (!confirm('Möchten Sie diesen Monat wieder öffnen?')) return

    setActionLoading(employeeId)
    const result = await reopenMonth(year, month, employeeId)

    if (result.success) {
      await loadData()
    } else {
      alert(result.error || 'Fehler beim Öffnen')
    }

    setActionLoading(null)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getEmployeeName = (emp: Employee) => {
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
    return name || emp.email
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

  const handleConfigureCompensation = (emp: Employee) => {
    setSelectedEmployeeForConfig(emp)
    setCompensationDialogOpen(true)
  }

  const handleCompensationSaved = () => {
    // Reload data after compensation settings are saved
    loadData()
  }

  // Generate year options (current year - 2 to current year + 1)
  const currentYear = new Date().getFullYear()
  const yearOptions = []
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    yearOptions.push(y)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zeiterfassung Verwaltung</h1>
          <p className="text-muted-foreground mt-2">
            Übersicht und Verwaltung der Mitarbeiter-Arbeitszeiten
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/zeiterfassung">Meine Zeiterfassung</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/zeiterfassung/verwaltung/kategorien">Kategorien</Link>
          </Button>
          <Button onClick={() => setExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Monatsbericht exportieren
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Monat</label>
              <Select value={month.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Jahr</label>
              <Select value={year.toString()} onValueChange={handleYearChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mitarbeiter</label>
              <Select value={employee} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {getEmployeeName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          {employeeStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine Daten für diesen Zeitraum vorhanden
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Mitarbeiter</th>
                    <th className="text-right p-4 font-medium">Gesamtstunden</th>
                    <th className="text-right p-4 font-medium">Arbeitstage</th>
                    <th className="text-right p-4 font-medium">Einträge</th>
                    <th className="text-right p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Gesamtgehalt</th>
                    <th className="text-right p-4 font-medium">Vergütung</th>
                    <th className="text-right p-4 font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeStats.map((stat) => (
                    <tr key={stat.employee.id} className="border-b last:border-0">
                      <td className="p-4">{getEmployeeName(stat.employee)}</td>
                      <td className="p-4 text-right font-semibold">
                        {formatDuration(stat.stats.total_minutes)}
                      </td>
                      <td className="p-4 text-right">{stat.stats.days_worked}</td>
                      <td className="p-4 text-right">{stat.stats.entries_count}</td>
                      <td className="p-4 text-right">
                        {stat.isClosed ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            Geschlossen
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Offen</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-lg font-bold ${stat.isClosed ? 'text-green-600 dark:text-green-400' : ''}`}>
                          {formatCurrency(stat.calculatedSalary)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-medium">
                            {getCompensationDisplay(stat.employee.id)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfigureCompensation(stat.employee)}
                            title="Vergütung konfigurieren"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {stat.isClosed ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReopenMonth(stat.employee.id)}
                            disabled={actionLoading === stat.employee.id}
                          >
                            Wieder öffnen
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCloseMonth(stat.employee.id)}
                            disabled={actionLoading === stat.employee.id}
                          >
                            Abschließen
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <ReportExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        year={year}
        month={month}
        employeeId={employee}
        monthName={MONTH_NAMES[month - 1]}
        employees={employees}
      />

      {/* Compensation Config Dialog */}
      {selectedEmployeeForConfig && (
        <CompensationConfigDialog
          isOpen={compensationDialogOpen}
          onClose={() => {
            setCompensationDialogOpen(false)
            setSelectedEmployeeForConfig(null)
          }}
          employeeId={selectedEmployeeForConfig.id}
          employeeName={getEmployeeName(selectedEmployeeForConfig)}
          onSave={handleCompensationSaved}
        />
      )}
    </div>
  )
}
