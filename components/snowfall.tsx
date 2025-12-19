'use client'

import { useState, useEffect, useMemo } from 'react'
import { Snowflake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Prüft ob aktuelles Datum im Weihnachtszeitraum liegt (19.-26. Dez)
function isChristmasPeriod(): boolean {
  const now = new Date()
  const month = now.getMonth() // 0-11, Dezember = 11
  const day = now.getDate()
  return month === 11 && day >= 19 && day <= 26
}

interface SnowflakeData {
  id: number
  left: number // Position in %
  size: number // Größe in px
  duration: number // Animation Dauer in s
  delay: number // Animation Delay in s
  opacity: number
}

// Generiert zufällige Schneeflocken-Daten
function generateSnowflakes(count: number): SnowflakeData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 4 + Math.random() * 6, // 4-10px
    duration: 8 + Math.random() * 12, // 8-20s
    delay: Math.random() * 10, // 0-10s
    opacity: 0.3 + Math.random() * 0.4, // 0.3-0.7
  }))
}

function SnowflakeOverlay() {
  // Generiere Schneeflocken nur einmal (client-side)
  const snowflakes = useMemo(() => generateSnowflakes(40), [])

  return (
    <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake absolute text-white"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
          }}
        >
          *
        </div>
      ))}
    </div>
  )
}

export function Snowfall() {
  const [enabled, setEnabled] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Nur im Weihnachtszeitraum anzeigen
    if (!isChristmasPeriod()) return

    setIsVisible(true)

    // localStorage Präferenz laden
    const stored = localStorage.getItem('snowfall-enabled')
    if (stored !== null) {
      setEnabled(stored === 'true')
    }
  }, [])

  const toggle = () => {
    const newValue = !enabled
    setEnabled(newValue)
    localStorage.setItem('snowfall-enabled', String(newValue))
  }

  // SSR: Nichts rendern bis mounted
  if (!mounted) return null

  // Außerhalb des Weihnachtszeitraums nichts anzeigen
  if (!isVisible) return null

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="relative"
        title={enabled ? 'Schnee ausschalten' : 'Schnee einschalten'}
      >
        <Snowflake
          className={cn(
            'h-5 w-5 transition-colors',
            enabled ? 'text-blue-400' : 'text-muted-foreground'
          )}
        />
      </Button>

      {/* Schneeflocken Overlay */}
      {enabled && <SnowflakeOverlay />}
    </>
  )
}
