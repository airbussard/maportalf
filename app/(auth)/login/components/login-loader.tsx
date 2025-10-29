'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface LoginLoaderProps {
  onComplete: () => void
}

const loadingSteps = [
  'Flugsimulator initialisieren...',
  'Cockpit-Systeme hochfahren...',
  'Wetterdaten synchronisieren...',
  'Flugplan validieren...',
  'Instrumente kalibrieren...',
  'Startfreigabe einholen...',
  'Bereit zum Start!'
]

export function LoginLoader({ onComplete }: LoginLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Progress bar animation (0 to 100% in 5 seconds)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2 // Increment by 2% every 100ms = 5 seconds total
      })
    }, 100)

    // Loading text steps (change every ~700ms)
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(stepInterval)
          return prev
        }
        return prev + 1
      })
    }, 700)

    // Complete after 5 seconds
    const completeTimeout = setTimeout(() => {
      onComplete()
    }, 5000)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      clearTimeout(completeTimeout)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8 p-8">
        {/* Flighthour Logo */}
        <div className="relative w-32 h-32 animate-pulse">
          <Image
            src="/logo.png"
            alt="FLIGHTHOUR"
            width={128}
            height={128}
            className="object-contain"
            priority
          />
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Willkommen zurück!</h2>
          <p
            className="text-sm text-muted-foreground min-h-[20px] transition-all duration-300"
            key={currentStep}
          >
            {loadingSteps[currentStep]}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-80 max-w-[90vw]">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-[#EAB308] transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {progress}%
          </div>
        </div>

        {/* Animated dots */}
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}
