'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

function ConfirmedContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || 'success'
  const type = searchParams.get('type') || 'shift'

  const statusConfig = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      title: 'Vielen Dank!',
      message: type === 'shift'
        ? 'Wir haben Ihre Bestätigung erhalten. Wir freuen uns auf Ihren Besuch zum neuen Termin!'
        : 'Wir haben Ihre Bestätigung erhalten. Es tut uns leid, dass wir absagen mussten.',
      bgColor: 'bg-green-50'
    },
    already: {
      icon: CheckCircle,
      iconColor: 'text-blue-500',
      title: 'Bereits bestätigt',
      message: 'Sie haben diese Benachrichtigung bereits bestätigt.',
      bgColor: 'bg-blue-50'
    },
    expired: {
      icon: Clock,
      iconColor: 'text-orange-500',
      title: 'Link abgelaufen',
      message: 'Dieser Bestätigungslink ist leider abgelaufen. Bei Fragen kontaktieren Sie uns bitte.',
      bgColor: 'bg-orange-50'
    },
    invalid: {
      icon: XCircle,
      iconColor: 'text-red-500',
      title: 'Ungültiger Link',
      message: 'Dieser Bestätigungslink ist ungültig. Bitte überprüfen Sie den Link in Ihrer E-Mail.',
      bgColor: 'bg-red-50'
    },
    error: {
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      title: 'Fehler aufgetreten',
      message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns.',
      bgColor: 'bg-red-50'
    }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.error
  const Icon = config.icon

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header with Logo */}
        <div className="bg-white p-6 flex justify-center border-b border-gray-200">
          <Image
            src="/logo.png"
            alt="FLIGHTHOUR"
            width={180}
            height={48}
            className="h-10 w-auto"
          />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-10 h-10 ${config.iconColor}`} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {config.title}
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            {config.message}
          </p>

          <div className="space-y-3">
            <Link
              href="https://flighthour.de"
              className="block w-full py-3 px-6 bg-[#fbb928] hover:bg-[#e5a820] text-white font-semibold rounded-lg transition-colors"
            >
              Zur FLIGHTHOUR Website
            </Link>

            {status === 'success' && type === 'cancel' && (
              <Link
                href="https://flighthour.de/buchen"
                className="block w-full py-3 px-6 bg-white border-2 border-[#fbb928] text-[#fbb928] hover:bg-[#fbb928] hover:text-white font-semibold rounded-lg transition-colors"
              >
                Neuen Termin buchen
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t">
          <p className="text-sm text-gray-500">
            Bei Fragen erreichen Sie uns unter{' '}
            <a href="mailto:info@flighthour.de" className="text-[#fbb928] hover:underline">
              info@flighthour.de
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MaydayConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fbb928]" />
      </div>
    }>
      <ConfirmedContent />
    </Suspense>
  )
}
