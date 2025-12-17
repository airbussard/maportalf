'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, User, MapPin, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { validateRebookToken, getAvailableSlots, rebookEvent, type TimeSlot, type RebookTokenData } from '@/app/actions/rebook-actions'

type PageStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'error' | 'booking' | 'success'

export default function RebookPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [status, setStatus] = useState<PageStatus>('loading')
  const [tokenData, setTokenData] = useState<RebookTokenData | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      const result = await validateRebookToken(token)
      if (result.valid && result.data) {
        setTokenData(result.data)
        setStatus('valid')
      } else {
        setStatus(result.error || 'invalid')
      }
    }
    validate()
  }, [token])

  // Load slots when week changes or token is validated
  const loadSlots = useCallback(async () => {
    if (!tokenData) return

    setLoadingSlots(true)
    try {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      const result = await getAvailableSlots({
        startDate: currentWeekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        duration: tokenData.original_duration
      })

      if (result.success && result.slots) {
        setAvailableSlots(result.slots)
      } else {
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Failed to load slots:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [tokenData, currentWeekStart])

  useEffect(() => {
    if (status === 'valid' && tokenData) {
      loadSlots()
    }
  }, [status, tokenData, loadSlots])

  const handleBooking = async () => {
    if (!selectedSlot) return

    setStatus('booking')
    setBookingError(null)

    const result = await rebookEvent({
      token,
      newStartTime: selectedSlot.start
    })

    if (result.success) {
      router.push('/rebook/success')
    } else {
      setBookingError(result.error || 'Ein Fehler ist aufgetreten.')
      setStatus('valid')
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev =>
      direction === 'next'
        ? addDays(prev, 7)
        : addDays(prev, -7)
    )
    setSelectedSlot(null)
  }

  // Group slots by day
  const slotsByDay = availableSlots.reduce((acc, slot) => {
    const day = format(new Date(slot.start), 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = []
    acc[day].push(slot)
    return acc
  }, {} as Record<string, TimeSlot[]>)

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  // Render error states
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fbb928]" />
      </div>
    )
  }

  if (status === 'invalid' || status === 'expired' || status === 'used' || status === 'error') {
    const errorConfig = {
      invalid: {
        title: 'Ungültiger Link',
        message: 'Dieser Buchungslink ist ungültig. Bitte überprüfen Sie den Link in Ihrer E-Mail.'
      },
      expired: {
        title: 'Link abgelaufen',
        message: 'Dieser Buchungslink ist leider abgelaufen. Bitte kontaktieren Sie uns für einen neuen Termin.'
      },
      used: {
        title: 'Bereits gebucht',
        message: 'Sie haben bereits einen neuen Termin über diesen Link gebucht.'
      },
      error: {
        title: 'Fehler aufgetreten',
        message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.'
      }
    }

    const config = errorConfig[status]

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#121212] p-6 flex justify-center">
            <Image src="/logo.png" alt="FLIGHTHOUR" width={180} height={48} className="h-10 w-auto" />
          </div>
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{config.title}</h1>
            <p className="text-gray-600 mb-8">{config.message}</p>
            <Link
              href="https://flighthour.de"
              className="block w-full py-3 px-6 bg-[#fbb928] hover:bg-[#e5a820] text-white font-semibold rounded-lg transition-colors"
            >
              Zur FLIGHTHOUR Website
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Main booking view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#121212] py-6">
        <div className="max-w-4xl mx-auto px-4 flex justify-center">
          <Image src="/logo.png" alt="FLIGHTHOUR" width={180} height={48} className="h-10 w-auto" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Intro */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Neuen Termin buchen
          </h1>
          <p className="text-gray-600 mb-6">
            Wählen Sie einen neuen Wunschtermin für Ihr Flugsimulator-Erlebnis.
          </p>

          {/* Booking details */}
          {tokenData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">
                    {[tokenData.customer_first_name, tokenData.customer_last_name].filter(Boolean).join(' ') || 'Gast'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Dauer</p>
                  <p className="font-medium text-gray-900">{tokenData.original_duration} Minuten</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Ort</p>
                  <p className="font-medium text-gray-900">{tokenData.original_location || 'FLIGHTHOUR Flugsimulator'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Personen</p>
                  <p className="font-medium text-gray-900">{tokenData.original_attendee_count || 1}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Week navigation */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateWeek('prev')}
              disabled={currentWeekStart <= new Date()}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentWeekStart, 'dd. MMMM', { locale: de })} -{' '}
              {format(addDays(currentWeekStart, 6), 'dd. MMMM yyyy', { locale: de })}
            </h2>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Week grid */}
          {loadingSlots ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#fbb928]" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd')
                const daySlots = slotsByDay[dayKey] || []
                const isPast = day < new Date() && !isSameDay(day, new Date())

                return (
                  <div key={dayKey} className="min-h-[200px]">
                    {/* Day header */}
                    <div className={`text-center py-2 rounded-t-lg ${isPast ? 'bg-gray-100 text-gray-400' : 'bg-[#fbb928] text-white'}`}>
                      <p className="text-xs font-medium">{format(day, 'EEE', { locale: de })}</p>
                      <p className="text-lg font-bold">{format(day, 'd')}</p>
                    </div>

                    {/* Slots */}
                    <div className={`border border-t-0 rounded-b-lg p-1 space-y-1 min-h-[160px] ${isPast ? 'bg-gray-50' : ''}`}>
                      {isPast ? (
                        <p className="text-xs text-gray-400 text-center pt-4">Vergangen</p>
                      ) : daySlots.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center pt-4">Keine Termine</p>
                      ) : (
                        daySlots.map(slot => {
                          const isSelected = selectedSlot?.start === slot.start
                          return (
                            <button
                              key={slot.start}
                              onClick={() => setSelectedSlot(slot)}
                              className={`w-full py-1.5 px-2 text-xs rounded transition-colors ${
                                isSelected
                                  ? 'bg-[#fbb928] text-white font-semibold'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                              }`}
                            >
                              {format(new Date(slot.start), 'HH:mm')}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected slot & booking */}
        {selectedSlot && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Ausgewählter Termin</h3>
            <div className="p-4 bg-[#fbb928]/10 border-2 border-[#fbb928] rounded-lg mb-6">
              <p className="text-lg font-bold text-gray-900">
                {format(new Date(selectedSlot.start), 'EEEE, dd. MMMM yyyy', { locale: de })}
              </p>
              <p className="text-xl font-bold text-[#fbb928]">
                {format(new Date(selectedSlot.start), 'HH:mm')} -{' '}
                {format(new Date(selectedSlot.end), 'HH:mm')} Uhr
              </p>
            </div>

            {bookingError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6 text-red-700">
                {bookingError}
              </div>
            )}

            <button
              onClick={handleBooking}
              disabled={status === 'booking'}
              className="w-full py-4 bg-[#fbb928] hover:bg-[#e5a820] text-white font-bold text-lg rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'booking' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird gebucht...
                </>
              ) : (
                'Termin verbindlich buchen'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Mit Klick auf &quot;Termin verbindlich buchen&quot; bestätigen Sie Ihre Buchung.
              Sie erhalten eine Bestätigung per E-Mail.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Bei Fragen erreichen Sie uns unter{' '}
          <a href="mailto:info@flighthour.de" className="text-[#fbb928] hover:underline">
            info@flighthour.de
          </a>
        </div>
      </div>
    </div>
  )
}
