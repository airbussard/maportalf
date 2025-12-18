/**
 * Shift Coverage Accept Page
 *
 * Public page where employees can accept shift coverage requests
 * No authentication required - token-based access
 */

'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Calendar, Clock, CheckCircle, XCircle, Loader2, Users, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { validateCoverageToken, acceptShiftCoverage } from '@/app/actions/shift-coverage'
import type { TokenValidationResult, AcceptCoverageResult } from '@/lib/types/shift-coverage'

type PageStatus = 'loading' | 'valid' | 'accepting' | 'success' | 'already_accepted' | 'expired' | 'cancelled' | 'invalid'

export default function ShiftCoverageAcceptPage() {
  const params = useParams()
  const token = params.token as string

  const [status, setStatus] = useState<PageStatus>('loading')
  const [validation, setValidation] = useState<TokenValidationResult | null>(null)
  const [acceptResult, setAcceptResult] = useState<AcceptCoverageResult | null>(null)

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      const result = await validateCoverageToken(token)
      setValidation(result)

      if (result.valid) {
        setStatus('valid')
      } else {
        setStatus(result.status as PageStatus)
      }
    }
    validate()
  }, [token])

  const handleAccept = async () => {
    setStatus('accepting')

    const result = await acceptShiftCoverage(token)
    setAcceptResult(result)

    if (result.success) {
      setStatus('success')
    } else if (result.alreadyAccepted) {
      setStatus('already_accepted')
    } else {
      setStatus('invalid')
    }
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return format(date, 'EEEE, dd. MMMM yyyy', { locale: de })
  }

  const formatTime = (request: any) => {
    if (request.is_full_day) {
      return 'Ganztägig'
    }
    if (request.start_time && request.end_time) {
      const start = request.start_time.substring(0, 5)
      const end = request.end_time.substring(0, 5)
      return `${start} - ${end} Uhr`
    }
    return 'Ganztägig'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <Image
            src="/logo.png"
            alt="FLIGHTHOUR"
            width={140}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mx-auto" />
              <p className="mt-4 text-gray-600">Wird geladen...</p>
            </div>
          )}

          {/* Valid - Can Accept */}
          {status === 'valid' && validation?.coverageRequest && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Yellow Header */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-center">
                <Users className="h-12 w-12 text-white mx-auto mb-3" />
                <h1 className="text-xl font-bold text-white">
                  Schicht übernehmen?
                </h1>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Datum</p>
                      <p className="font-semibold">
                        {formatDate(validation.coverageRequest.request_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Zeit</p>
                      <p className="font-semibold">
                        {formatTime(validation.coverageRequest)}
                      </p>
                    </div>
                  </div>

                  {validation.coverageRequest.reason && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-gray-500">Grund</p>
                      <p className="text-gray-700">
                        {validation.coverageRequest.reason}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-xl">
                  <p className="text-sm text-yellow-800 text-center">
                    <strong>Hinweis:</strong> Wer zuerst klickt, bekommt den Tag.
                  </p>
                </div>

                <button
                  onClick={handleAccept}
                  className="w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all"
                >
                  Ich übernehme!
                </button>
              </div>
            </div>
          )}

          {/* Accepting State */}
          {status === 'accepting' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto" />
              <p className="mt-4 text-gray-600">Wird eingetragen...</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && acceptResult && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
                <CheckCircle className="h-16 w-16 text-white mx-auto mb-3" />
                <h1 className="text-xl font-bold text-white">
                  Perfekt!
                </h1>
              </div>
              <div className="p-6 text-center">
                <p className="text-lg text-gray-700 mb-4">
                  {acceptResult.message}
                </p>
                <p className="text-gray-500">
                  Du kannst dieses Fenster jetzt schließen.
                </p>
              </div>
            </div>
          )}

          {/* Already Accepted */}
          {status === 'already_accepted' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-center">
                <Users className="h-12 w-12 text-white mx-auto mb-3" />
                <h1 className="text-xl font-bold text-white">
                  Bereits vergeben
                </h1>
              </div>
              <div className="p-6 text-center">
                <p className="text-lg text-gray-700 mb-4">
                  Diese Schicht wurde bereits von{' '}
                  <strong>{validation?.acceptorName || acceptResult?.acceptorName || 'einem Kollegen'}</strong>{' '}
                  übernommen.
                </p>
                <p className="text-gray-500 mb-4">
                  Trotzdem vielen Dank für dein Interesse!
                </p>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-700">
                    Bei der nächsten Anfrage bist du vielleicht schneller. 😊
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-center">
                <AlertCircle className="h-12 w-12 text-white mx-auto mb-3" />
                <h1 className="text-xl font-bold text-white">
                  Anfrage abgelaufen
                </h1>
              </div>
              <div className="p-6 text-center">
                <p className="text-gray-700 mb-4">
                  Diese Anfrage ist leider abgelaufen.
                </p>
                <p className="text-gray-500">
                  Bei neuen Anfragen wirst du per E-Mail benachrichtigt.
                </p>
              </div>
            </div>
          )}

          {/* Cancelled */}
          {status === 'cancelled' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-6 text-center">
                <XCircle className="h-12 w-12 text-white mx-auto mb-3" />
                <h1 className="text-xl font-bold text-white">
                  Anfrage storniert
                </h1>
              </div>
              <div className="p-6 text-center">
                <p className="text-gray-700 mb-4">
                  Diese Anfrage wurde storniert.
                </p>
                <p className="text-gray-500">
                  Bei neuen Anfragen wirst du per E-Mail benachrichtigt.
                </p>
              </div>
            </div>
          )}

          {/* Invalid */}
          {status === 'invalid' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
                <XCircle className="h-12 w-12 text-white mx-auto mb-3" />
                <h1 className="text-xl font-bold text-white">
                  Link ungültig
                </h1>
              </div>
              <div className="p-6 text-center">
                <p className="text-gray-700 mb-4">
                  {acceptResult?.message || 'Dieser Link ist ungültig oder wurde bereits verwendet.'}
                </p>
                <p className="text-gray-500">
                  Bei Fragen wende dich bitte an das Team.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6">
        <div className="max-w-md mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            FLIGHTHOUR | info@flighthour.de
          </p>
        </div>
      </footer>
    </div>
  )
}
