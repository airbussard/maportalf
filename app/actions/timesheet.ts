'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  TimesheetEntry,
  TimesheetDaySummary,
  TimesheetMonthSummary,
  TimesheetAdminOverview,
  BookingDetail,
} from '@/lib/types/timesheet'

// ─── Kernlogik: Kalender → Timesheet ───

/**
 * Generiert/aktualisiert Timesheet-Einträge für einen Mitarbeiter im Monat
 * basierend auf Kalenderdaten (FI-Zuweisungen + Kundenbuchungen)
 */
export async function generateTimesheetForMonth(
  employeeId: string,
  year: number,
  month: number // 1-12
) {
  const supabase = createAdminClient()

  // Monatsgrenzen berechnen
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  // 1. Mitarbeiter-Profil laden (für Name + Nummer Matching)
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, employee_number')
    .eq('id', employeeId)
    .single()

  // 1b. Alle FI-Zuweisungen im Monat laden (breitere Suche)
  const { data: allFiAssignments, error: fiError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('event_type', 'fi_assignment')
    .neq('status', 'cancelled')
    .gte('start_time', startOfMonth.toISOString())
    .lte('start_time', endOfMonth.toISOString())
    .order('start_time', { ascending: true })

  if (fiError) {
    throw new Error(`FI-Termine laden fehlgeschlagen: ${fiError.message}`)
  }

  // Zuordnung: per ID ODER per Name/Nummer im assigned_instructor_name
  const empNumber = profile?.employee_number || ''
  const empName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

  const fiAssignments = (allFiAssignments || []).filter(fi => {
    // Direkte ID-Zuordnung
    if (fi.assigned_instructor_id === employeeId) return true
    // Mitarbeiternummer im Namen (z.B. "David Bente (FH021)")
    if (empNumber && fi.assigned_instructor_name?.includes(empNumber)) return true
    // Name-Match als Fallback
    if (empName && fi.assigned_instructor_name?.startsWith(empName)) return true
    return false
  })

  if (fiAssignments.length === 0) {
    return { days: 0, totalMinutes: 0 }
  }

  // 2. Alle Buchungen im Monat (performance: ein Query statt pro Tag)
  const { data: allBookings, error: bookError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('event_type', 'booking')
    .neq('status', 'cancelled')
    .gte('start_time', startOfMonth.toISOString())
    .lte('start_time', endOfMonth.toISOString())
    .order('start_time', { ascending: true })

  if (bookError) {
    throw new Error(`Buchungen laden fehlgeschlagen: ${bookError.message}`)
  }

  // 3. Pro FI-Tag: Zugehörige Buchungen zuordnen
  const dayMap = new Map<string, {
    calendarMinutes: number
    bookingCount: number
    fiShiftMinutes: number
    bookingDetails: BookingDetail[]
  }>()

  for (const fi of fiAssignments) {
    const fiBerlin = utcToBerlinTime(new Date(fi.start_time))
    const fiDate = `${fiBerlin.getFullYear()}-${String(fiBerlin.getMonth() + 1).padStart(2, '0')}-${String(fiBerlin.getDate()).padStart(2, '0')}`

    // Ist dieser FI-Eintrag ganztägig?
    const isAllDay = fi.is_all_day === true || isGoogleSyncPlaceholder(fi)

    // FI-Schichtdauer berechnen
    let fiShiftMinutes = 0
    if (!isAllDay && fi.actual_work_start_time && fi.actual_work_end_time) {
      fiShiftMinutes = timeStringToMinutes(fi.actual_work_end_time) -
        timeStringToMinutes(fi.actual_work_start_time)
    }

    // Buchungen für diesen Tag filtern
    // WICHTIG: actual_work_start/end sind in deutscher Ortszeit (Europe/Berlin),
    // booking.start_time ist UTC → muss konvertiert werden
    const dayBookings = (allBookings || []).filter(booking => {
      // Datum-Vergleich in Europe/Berlin Timezone
      const bookingBerlin = utcToBerlinTime(new Date(booking.start_time))
      const fiBerlin = utcToBerlinTime(new Date(fi.start_time))
      const bookingDateStr = `${bookingBerlin.getFullYear()}-${String(bookingBerlin.getMonth() + 1).padStart(2, '0')}-${String(bookingBerlin.getDate()).padStart(2, '0')}`
      const fiDateStr = `${fiBerlin.getFullYear()}-${String(fiBerlin.getMonth() + 1).padStart(2, '0')}-${String(fiBerlin.getDate()).padStart(2, '0')}`

      if (bookingDateStr !== fiDateStr) return false

      // Ganztägig → alle Buchungen des Tages
      if (isAllDay) return true

      // Teilzeit → Buchung-Startzeit in Berliner Ortszeit mit FI-Arbeitszeit vergleichen
      if (fi.actual_work_start_time && fi.actual_work_end_time) {
        const bookingMinutes = bookingBerlin.getHours() * 60 + bookingBerlin.getMinutes()
        const shiftStart = timeStringToMinutes(fi.actual_work_start_time)
        const shiftEnd = timeStringToMinutes(fi.actual_work_end_time)
        return bookingMinutes >= shiftStart && bookingMinutes < shiftEnd
      }

      // Fallback: alle Buchungen des Tages
      return true
    })

    // Buchungsdetails aufbereiten
    const details: BookingDetail[] = dayBookings.map(b => ({
      id: b.id,
      title: b.title || '',
      start: b.start_time,
      end: b.end_time,
      duration_min: b.duration || Math.round(
        (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000
      ),
      customer_name: [b.customer_first_name, b.customer_last_name]
        .filter(Boolean).join(' ') || undefined,
    }))

    const calendarMinutes = details.reduce((sum, d) => sum + d.duration_min, 0)

    // Merge mit bestehendem Tag (falls mehrere FI-Einträge am selben Tag)
    const existing = dayMap.get(fiDate)
    if (existing) {
      existing.calendarMinutes += calendarMinutes
      existing.bookingCount += details.length
      existing.fiShiftMinutes += fiShiftMinutes
      existing.bookingDetails.push(...details)
    } else {
      dayMap.set(fiDate, {
        calendarMinutes,
        bookingCount: details.length,
        fiShiftMinutes,
        bookingDetails: details,
      })
    }
  }

  // 4. UPSERT in timesheet_entries (nur calendar-Felder, nicht user-Anpassungen überschreiben)
  let totalMinutes = 0
  for (const [dateStr, day] of dayMap) {
    totalMinutes += day.calendarMinutes

    const { error: upsertError } = await supabase
      .from('timesheet_entries')
      .upsert({
        employee_id: employeeId,
        year,
        month,
        date: dateStr,
        calendar_minutes: day.calendarMinutes,
        calendar_booking_count: day.bookingCount,
        fi_shift_minutes: day.fiShiftMinutes,
        booking_details: day.bookingDetails,
      }, {
        onConflict: 'employee_id,date',
        ignoreDuplicates: false,
      })

    if (upsertError) {
      console.error(`Timesheet upsert error for ${dateStr}:`, upsertError)
    }
  }

  return { days: dayMap.size, totalMinutes }
}

// ─── Lesen ───

export async function getTimesheetEntries(
  year: number,
  month: number,
  employeeId?: string
): Promise<TimesheetDaySummary[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const targetId = employeeId || user.id

  // Prüfe ob Admin (für fremde Einträge)
  if (targetId !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') throw new Error('Keine Berechtigung')
  }

  const client = targetId !== user.id ? createAdminClient() : supabase

  const { data, error } = await client
    .from('timesheet_entries')
    .select('*')
    .eq('employee_id', targetId)
    .eq('year', year)
    .eq('month', month)
    .order('date', { ascending: true })

  if (error) throw new Error(`Timesheet laden fehlgeschlagen: ${error.message}`)

  return (data || []).map(entry => ({
    ...entry,
    effective_minutes: (entry.adjusted_minutes ?? entry.calendar_minutes) + (entry.manual_minutes || 0),
    is_adjusted: entry.adjusted_minutes !== null,
    has_manual: (entry.manual_minutes || 0) > 0,
  }))
}

// ─── User-Anpassungen ───

export async function adjustTimesheetEntry(
  entryId: string,
  adjustedMinutes: number,
  reason: string,
  employeeId?: string // Admin kann für andere anpassen
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const isAdmin = await checkIsAdmin(supabase, user.id)
  const targetId = employeeId || user.id

  // Employees: Prüfe ob Monat geschlossen
  if (!isAdmin) {
    const entry = await getEntryById(supabase, entryId)
    if (entry) {
      const closed = await isMonthClosed(entry.employee_id, entry.year, entry.month)
      if (closed) throw new Error('Monat ist festgeschrieben. Änderungen nicht möglich.')
    }
  }

  const client = isAdmin ? createAdminClient() : supabase

  const updateData: any = {
    adjusted_minutes: adjustedMinutes,
    adjustment_reason: reason,
    adjusted_at: new Date().toISOString(),
    adjusted_by: user.id,
  }

  const query = client.from('timesheet_entries').update(updateData).eq('id', entryId)

  // Employee darf nur eigene bearbeiten
  if (!isAdmin) query.eq('employee_id', user.id)

  const { error } = await query
  if (error) throw new Error(`Anpassung fehlgeschlagen: ${error.message}`)
}

export async function addManualEntry(
  date: string,
  minutes: number,
  description: string,
  employeeId?: string // Admin kann für andere eintragen
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const isAdmin = await checkIsAdmin(supabase, user.id)
  const targetId = employeeId || user.id

  const dateObj = new Date(date)
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1

  // Employees: Prüfe ob Monat geschlossen
  if (!isAdmin && targetId === user.id) {
    const closed = await isMonthClosed(user.id, year, month)
    if (closed) throw new Error('Monat ist festgeschrieben. Änderungen nicht möglich.')
  }

  const client = isAdmin ? createAdminClient() : supabase

  const { error } = await client
    .from('timesheet_entries')
    .upsert({
      employee_id: targetId,
      year,
      month,
      date,
      manual_minutes: minutes,
      manual_description: description,
      calendar_minutes: 0,
      calendar_booking_count: 0,
    }, {
      onConflict: 'employee_id,date',
      ignoreDuplicates: false,
    })

  if (error) throw new Error(`Manueller Eintrag fehlgeschlagen: ${error.message}`)
}

// ─── Admin: Bonus ───

export async function addBonusToMonth(
  employeeId: string,
  year: number,
  month: number,
  amount: number,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const isAdmin = await checkIsAdmin(supabase, user.id)
  if (!isAdmin) throw new Error('Keine Berechtigung')

  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from('time_reports')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (existing) {
    await adminClient.from('time_reports').update({
      bonus_amount: amount,
      notes: notes || null,
    }).eq('id', existing.id)
  } else {
    await adminClient.from('time_reports').insert({
      employee_id: employeeId,
      year,
      month,
      total_minutes: 0,
      bonus_amount: amount,
      notes: notes || null,
      is_closed: false,
    })
  }
}

// ─── Monatsbestätigung ───

export async function confirmMonthlyTimesheet(year: number, month: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  // Prüfe ob Monat geschlossen
  const closed = await isMonthClosed(user.id, year, month)
  if (closed) throw new Error('Monat ist bereits festgeschrieben.')

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from('time_reports')
    .select('id')
    .eq('employee_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (existing) {
    await adminClient
      .from('time_reports')
      .update({
        confirmed_by_employee: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    const entries = await getTimesheetEntries(year, month)
    const totalMinutes = entries.reduce((sum, e) => sum + e.effective_minutes, 0)

    await adminClient
      .from('time_reports')
      .insert({
        employee_id: user.id,
        year,
        month,
        total_minutes: totalMinutes,
        confirmed_by_employee: true,
        confirmed_at: new Date().toISOString(),
        is_closed: false,
      })
  }
}

export async function getTimesheetConfirmation(year: number, month: number, employeeId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const targetId = employeeId || user.id
  const client = targetId !== user.id ? createAdminClient() : supabase

  const { data } = await client
    .from('time_reports')
    .select('confirmed_by_employee, confirmed_at, is_closed, closed_at, closed_by')
    .eq('employee_id', targetId)
    .eq('year', year)
    .eq('month', month)
    .single()

  return data
}

// ─── Admin: Übersicht ───

export async function getTimesheetSummary(
  year: number,
  month: number
): Promise<TimesheetAdminOverview> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Keine Berechtigung')

  const adminClient = createAdminClient()

  // Alle aktiven Mitarbeiter
  const { data: employees } = await adminClient
    .from('profiles')
    .select('id, email, first_name, last_name, employee_number, role, is_active, exit_date')
    .eq('is_active', true)
    .order('last_name', { ascending: true })

  // Alle Timesheet-Einträge für den Monat
  const { data: allEntries } = await adminClient
    .from('timesheet_entries')
    .select('*')
    .eq('year', year)
    .eq('month', month)

  // Alle Reports (Bestätigung/Closed Status)
  const { data: allReports } = await adminClient
    .from('time_reports')
    .select('*')
    .eq('year', year)
    .eq('month', month)

  // Alle Employee Settings (Vergütung)
  const { data: allSettings } = await adminClient
    .from('employee_settings')
    .select('*')

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]

  const summaries: TimesheetMonthSummary[] = (employees || []).map(emp => {
    const entries = (allEntries || []).filter(e => e.employee_id === emp.id)
    const report = (allReports || []).find(r => r.employee_id === emp.id)
    const settings = (allSettings || []).find(s => s.employee_id === emp.id)

    // Minutenberechnung
    const totalCalendar = entries.reduce((s, e) => s + (e.calendar_minutes || 0), 0)
    const totalManual = entries.reduce((s, e) => s + (e.manual_minutes || 0), 0)
    const totalAdjusted = entries.reduce((s, e) => {
      return s + (e.adjusted_minutes !== null ? (e.adjusted_minutes - e.calendar_minutes) : 0)
    }, 0)
    const totalEffective = entries.reduce((s, e) =>
      s + ((e.adjusted_minutes ?? e.calendar_minutes) + (e.manual_minutes || 0)), 0)
    const totalShift = entries.reduce((s, e) => s + (e.fi_shift_minutes || 0), 0)
    const totalBookings = entries.reduce((s, e) => s + (e.calendar_booking_count || 0), 0)
    const workDays = entries.filter(e =>
      (e.calendar_minutes > 0) || (e.manual_minutes > 0) || (e.adjusted_minutes !== null && e.adjusted_minutes > 0)
    ).length

    const totalHours = totalEffective / 60
    const idleMinutes = Math.max(0, totalShift - totalCalendar)

    // Vergütungsberechnung
    // Bei geschlossenen Monaten: Snapshot-Daten verwenden (unveränderlich)
    const isClosed = report?.is_closed === true
    const compensationType = isClosed
      ? (report?.compensation_type || settings?.compensation_type || null)
      : (settings?.compensation_type || null)
    const hourlyRate = isClosed
      ? (report?.hourly_rate || settings?.hourly_rate || null)
      : (settings?.hourly_rate || null)
    const monthlySalary = isClosed
      ? (report?.monthly_salary || settings?.monthly_salary || null)
      : (settings?.monthly_salary || null)
    const bonusAmount = report?.bonus_amount || 0

    const effectiveRate = hourlyRate || 20 // Fallback
    const hasRateFallback = !hourlyRate

    let hourlyPay = 0
    let fixedPay = 0
    let totalPay = 0
    let fictionalHours = 0

    if (compensationType === 'hourly' || (!compensationType && totalHours > 0)) {
      hourlyPay = totalHours * effectiveRate
      totalPay = hourlyPay + bonusAmount
      fictionalHours = totalHours
    } else if (compensationType === 'combined') {
      hourlyPay = totalHours * effectiveRate
      fixedPay = monthlySalary || 0
      totalPay = hourlyPay + fixedPay + bonusAmount
      fictionalHours = effectiveRate > 0 ? totalPay / effectiveRate : 0
    } else if (compensationType === 'salary') {
      fixedPay = monthlySalary || 0
      totalPay = fixedPay + bonusAmount
      fictionalHours = effectiveRate > 0 ? totalPay / effectiveRate : 0
    } else if (bonusAmount > 0) {
      // Kein Typ aber Bonus vorhanden
      totalPay = bonusAmount
      fictionalHours = effectiveRate > 0 ? totalPay / effectiveRate : 0
    }

    // Angezeigte Stunden: tatsächliche ODER fiktive (bei reinem Fixgehalt)
    const displayMinutes = totalEffective > 0
      ? totalEffective
      : Math.round(fictionalHours * 60)
    const displayHours = displayMinutes / 60

    return {
      employee_id: emp.id,
      employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email,
      employee_email: emp.email,
      employee_number: emp.employee_number,
      year,
      month,
      total_calendar_minutes: totalCalendar,
      total_manual_minutes: totalManual,
      total_adjusted_minutes: totalAdjusted,
      total_effective_minutes: displayMinutes,
      total_effective_hours: displayHours,
      work_days: workDays,
      total_bookings: totalBookings,
      idle_minutes: idleMinutes,
      compensation_type: compensationType,
      hourly_rate: hourlyRate,
      monthly_salary: monthlySalary,
      hourly_pay: Math.round(hourlyPay * 100) / 100,
      fixed_pay: Math.round(fixedPay * 100) / 100,
      bonus_amount: Math.round(bonusAmount * 100) / 100,
      total_pay: Math.round(totalPay * 100) / 100,
      fictional_hours: Math.round(fictionalHours * 100) / 100,
      hourly_rate_fallback: hasRateFallback,
      is_confirmed: report?.confirmed_by_employee || false,
      confirmed_at: report?.confirmed_at || null,
      is_closed: report?.is_closed || false,
      closed_at: report?.closed_at || null,
    }
  })

  const totals = {
    total_hours: summaries.reduce((s, e) => s + e.total_effective_hours, 0),
    total_days: summaries.reduce((s, e) => s + e.work_days, 0),
    total_bookings: summaries.reduce((s, e) => s + e.total_bookings, 0),
    total_hourly_pay: summaries.reduce((s, e) => s + e.hourly_pay, 0),
    total_fixed_pay: summaries.reduce((s, e) => s + e.fixed_pay, 0),
    total_pay: summaries.reduce((s, e) => s + e.total_pay, 0),
  }

  return {
    year,
    month,
    month_name: monthNames[month - 1],
    employees: summaries,
    totals,
  }
}

// ─── Admin: Monat schließen ───

export async function closeTimesheetMonth(employeeId: string, year: number, month: number, bonusAmount?: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Keine Berechtigung')

  const adminClient = createAdminClient()

  // Aktuelle Daten berechnen
  const entries = await getTimesheetEntries(year, month, employeeId)
  const totalMinutes = entries.reduce((s, e) => s + e.effective_minutes, 0)
  const calendarMinutes = entries.reduce((s, e) => s + e.calendar_minutes, 0)
  const manualMinutes = entries.reduce((s, e) => s + (e.manual_minutes || 0), 0)

  // Settings Snapshot
  const { data: settings } = await adminClient
    .from('employee_settings')
    .select('*')
    .eq('employee_id', employeeId)
    .single()

  const { error } = await adminClient
    .from('time_reports')
    .upsert({
      employee_id: employeeId,
      year,
      month,
      total_minutes: totalMinutes,
      calendar_total_minutes: calendarMinutes,
      manual_total_minutes: manualMinutes,
      is_closed: true,
      closed_by: user.id,
      closed_at: new Date().toISOString(),
      compensation_type: settings?.compensation_type || null,
      hourly_rate: settings?.hourly_rate || null,
      monthly_salary: settings?.monthly_salary || null,
      compensation_snapshot: settings || {},
      bonus_amount: bonusAmount || 0,
    }, {
      onConflict: 'employee_id,year,month',
    })

  if (error) throw new Error(`Monat schließen fehlgeschlagen: ${error.message}`)
}

export async function reopenTimesheetMonth(employeeId: string, year: number, month: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const adminClient = createAdminClient()

  await adminClient
    .from('time_reports')
    .update({
      is_closed: false,
      closed_by: null,
      closed_at: null,
    })
    .eq('employee_id', employeeId)
    .eq('year', year)
    .eq('month', month)
}

// ─── Admin: Timesheet für alle regenerieren ───

export async function regenerateAllTimesheets(year: number, month: number) {
  const adminClient = createAdminClient()

  const { data: employees } = await adminClient
    .from('profiles')
    .select('id')
    .eq('is_active', true)

  let total = 0
  for (const emp of employees || []) {
    const result = await generateTimesheetForMonth(emp.id, year, month)
    total += result.days
  }

  return { employeesProcessed: employees?.length || 0, totalDays: total }
}

// ─── Hilfsfunktionen ───

async function checkIsAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

async function isMonthClosed(employeeId: string, year: number, month: number): Promise<boolean> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('time_reports')
    .select('is_closed')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .eq('month', month)
    .single()
  return data?.is_closed === true
}

async function getEntryById(supabase: any, entryId: string) {
  const { data } = await supabase
    .from('timesheet_entries')
    .select('employee_id, year, month')
    .eq('id', entryId)
    .single()
  return data
}

function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function utcToBerlinTime(date: Date): Date {
  // Konvertiert UTC Date zu Europe/Berlin Ortszeit
  const berlinStr = date.toLocaleString('en-US', { timeZone: 'Europe/Berlin' })
  return new Date(berlinStr)
}

function isGoogleSyncPlaceholder(event: any): boolean {
  // Ganztägige FI-Einträge werden für Google Calendar als 08:00-09:00 gesetzt
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  const startHour = start.getUTCHours()
  const endHour = end.getUTCHours()
  const durationMinutes = (end.getTime() - start.getTime()) / 60000

  return (startHour === 6 || startHour === 7 || startHour === 8) &&
    durationMinutes <= 60 &&
    !event.actual_work_start_time
}
