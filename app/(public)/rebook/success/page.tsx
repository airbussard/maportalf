import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, Calendar, Mail } from 'lucide-react'

export default function RebookSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header with Logo */}
        <div className="bg-[#121212] p-6 flex justify-center">
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Buchung erfolgreich!
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            Ihr neuer Termin wurde erfolgreich gebucht. Wir freuen uns auf Ihren Besuch!
          </p>

          {/* Info cards */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg text-left">
              <Mail className="w-5 h-5 text-[#fbb928]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Bestätigung per E-Mail</p>
                <p className="text-xs text-gray-500">Sie erhalten in Kürze eine E-Mail mit allen Details.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg text-left">
              <Calendar className="w-5 h-5 text-[#fbb928]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Kalender-Eintrag</p>
                <p className="text-xs text-gray-500">Den Termin finden Sie in Ihrer Bestätigungs-E-Mail.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="https://flighthour.de"
              className="block w-full py-3 px-6 bg-[#fbb928] hover:bg-[#e5a820] text-white font-semibold rounded-lg transition-colors"
            >
              Zur FLIGHTHOUR Website
            </Link>
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
