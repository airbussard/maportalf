'use client'

import { AlertTriangle, Euro, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function CompensationNotice() {
  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
        <Euro className="h-4 w-4" />
        Schadensersatz nach AGB
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300 mt-2 space-y-3">
        <p>
          Bei Absage durch den Kunden besteht ein Anspruch auf Schadensersatz
          in Höhe von <strong>50,00 EUR</strong> gemäß unseren AGB.
        </p>
        <p className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Aus Kulanzgründen können bei triftigem Grund (z.B. Krankheit mit Nachweis)
            auch <strong>30,00 EUR</strong> angesetzt werden.
          </span>
        </p>
        <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900 rounded-md">
          <p className="text-sm font-medium">
            Wurde der Kunde auf den Schadensersatzanspruch hingewiesen?
          </p>
          <p className="text-sm mt-1 text-amber-600 dark:text-amber-400">
            Bitte dokumentieren Sie dies in der Kundenkommunikation.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
