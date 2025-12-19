'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================
// Zeitraum-Erkennung
// ============================================

type FestivePeriod = 'christmas' | 'transition' | 'silvester' | 'newyear' | null

function getFestivePeriod(): FestivePeriod {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const day = now.getDate()

  // Weihnachten: 19.-26. Dezember
  if (month === 11 && day >= 19 && day <= 26) return 'christmas'
  // Übergang: 27.-30. Dezember (noch Schnee)
  if (month === 11 && day >= 27 && day <= 30) return 'transition'
  // Silvester: 31. Dezember
  if (month === 11 && day === 31) return 'silvester'
  // Neujahr: 1. Januar
  if (month === 0 && day === 1) return 'newyear'

  return null
}

function shouldShowFireworks(period: FestivePeriod): boolean {
  return period === 'silvester' || period === 'newyear'
}

function canShowFireworks(): boolean {
  const lastShown = localStorage.getItem('fireworks-last-shown')
  if (!lastShown) return true
  const threeHours = 3 * 60 * 60 * 1000
  return Date.now() - parseInt(lastShown) > threeHours
}

function markFireworksShown(): void {
  localStorage.setItem('fireworks-last-shown', Date.now().toString())
}

// ============================================
// Partikel-Daten
// ============================================

interface ParticleData {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  opacity: number
  color?: string
  rotation?: number
}

function generateSnowflakes(count: number): ParticleData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 4 + Math.random() * 6,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 10,
    opacity: 0.3 + Math.random() * 0.4,
  }))
}

function generateConfetti(count: number): ParticleData[] {
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#ffa500']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 8,
    opacity: 0.7 + Math.random() * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
  }))
}

// ============================================
// Schnee-Overlay
// ============================================

function SnowOverlay() {
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

// ============================================
// Konfetti-Overlay
// ============================================

function ConfettiOverlay() {
  const confetti = useMemo(() => generateConfetti(50), [])

  return (
    <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti absolute"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 0.6}px`,
            backgroundColor: piece.color,
            opacity: piece.opacity,
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
            transform: `rotate(${piece.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ============================================
// Feuerwerk-Overlay
// ============================================

interface FireworkParticle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  maxLife: number
  size: number
}

interface FireworkRocket {
  id: number
  x: number
  y: number
  targetY: number
  color: string
  exploded: boolean
}

function FireworksOverlay({ onComplete }: { onComplete: () => void }) {
  const [particles, setParticles] = useState<FireworkParticle[]>([])
  const [rockets, setRockets] = useState<FireworkRocket[]>([])
  const [timeLeft, setTimeLeft] = useState(10)

  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#ffa500', '#fff']

  const createRocket = useCallback(() => {
    const newRocket: FireworkRocket = {
      id: Date.now() + Math.random(),
      x: 10 + Math.random() * 80,
      y: 100,
      targetY: 20 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      exploded: false,
    }
    setRockets((prev) => [...prev, newRocket])
  }, [])

  const explodeRocket = useCallback((rocket: FireworkRocket) => {
    const newParticles: FireworkParticle[] = []
    const particleCount = 30 + Math.floor(Math.random() * 20)

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const speed = 2 + Math.random() * 3
      newParticles.push({
        id: Date.now() + Math.random() + i,
        x: rocket.x,
        y: rocket.targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: rocket.color,
        life: 100,
        maxLife: 100,
        size: 2 + Math.random() * 2,
      })
    }

    setParticles((prev) => [...prev, ...newParticles])
    setRockets((prev) => prev.filter((r) => r.id !== rocket.id))
  }, [])

  // Animation loop
  useEffect(() => {
    markFireworksShown()
    const interval = setInterval(() => {
      // Update rockets
      setRockets((prev) =>
        prev.map((rocket) => {
          if (rocket.y <= rocket.targetY && !rocket.exploded) {
            explodeRocket(rocket)
            return { ...rocket, exploded: true }
          }
          return { ...rocket, y: rocket.y - 2 }
        }).filter((r) => !r.exploded)
      )

      // Update particles
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * 0.3,
            y: p.y + p.vy * 0.3,
            vy: p.vy + 0.1,
            life: p.life - 2,
          }))
          .filter((p) => p.life > 0)
      )
    }, 30)

    return () => clearInterval(interval)
  }, [explodeRocket])

  // Launch rockets periodically
  useEffect(() => {
    createRocket()
    const launchInterval = setInterval(() => {
      if (Math.random() > 0.3) createRocket()
      if (Math.random() > 0.6) createRocket()
    }, 800)

    return () => clearInterval(launchInterval)
  }, [createRocket])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(onComplete, 500)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden bg-black/30">
      {/* Rockets */}
      {rockets.map((rocket) => (
        <div
          key={rocket.id}
          className="absolute w-1 h-3 rounded-full"
          style={{
            left: `${rocket.x}%`,
            bottom: `${100 - rocket.y}%`,
            backgroundColor: rocket.color,
            boxShadow: `0 0 6px ${rocket.color}`,
          }}
        />
      ))}

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.life / particle.maxLife,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
        />
      ))}

      {/* Timer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-xl font-bold bg-black/50 px-4 py-2 rounded-full">
        🎆 {timeLeft}s
      </div>
    </div>
  )
}

// ============================================
// Lichterkette
// ============================================

export function ChristmasLights({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  const lights = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6'][i % 5],
    delay: i * 0.15,
  }))

  return (
    <div className="h-1.5 flex justify-around items-center bg-black/10 overflow-hidden">
      {lights.map((light) => (
        <div
          key={light.id}
          className="christmas-light w-2 h-2 rounded-full"
          style={{
            backgroundColor: light.color,
            boxShadow: `0 0 4px ${light.color}, 0 0 8px ${light.color}`,
            animationDelay: `${light.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// ============================================
// Haupt-Komponente: FestiveEffects
// ============================================

export function FestiveEffects() {
  const [enabled, setEnabled] = useState(true)
  const [period, setPeriod] = useState<FestivePeriod>(null)
  const [mounted, setMounted] = useState(false)
  const [showFireworks, setShowFireworks] = useState(false)

  useEffect(() => {
    setMounted(true)
    const currentPeriod = getFestivePeriod()
    setPeriod(currentPeriod)

    // localStorage Präferenz laden
    const stored = localStorage.getItem('festive-enabled')
    if (stored !== null) {
      setEnabled(stored === 'true')
    }

    // Feuerwerk triggern wenn passend
    if (shouldShowFireworks(currentPeriod) && canShowFireworks()) {
      setShowFireworks(true)
    }
  }, [])

  const toggle = () => {
    const newValue = !enabled
    setEnabled(newValue)
    localStorage.setItem('festive-enabled', String(newValue))
  }

  const handleFireworksComplete = () => {
    setShowFireworks(false)
  }

  // SSR: Nichts rendern bis mounted
  if (!mounted) return null

  // Außerhalb der festlichen Zeit nichts anzeigen
  if (!period) return null

  // Icon basierend auf Periode
  const getIcon = () => {
    if (period === 'newyear') return '🎊'
    if (period === 'silvester') return '🎆'
    return '❄️'
  }

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="relative"
        title={enabled ? 'Festliche Effekte ausschalten' : 'Festliche Effekte einschalten'}
      >
        <span className={cn(
          'text-lg transition-opacity',
          enabled ? 'opacity-100' : 'opacity-40'
        )}>
          {getIcon()}
        </span>
      </Button>

      {/* Animationen nur wenn enabled */}
      {enabled && (
        <>
          {/* Schnee für Weihnachten, Übergang, Silvester */}
          {(period === 'christmas' || period === 'transition' || period === 'silvester') && (
            <SnowOverlay />
          )}

          {/* Konfetti für Neujahr */}
          {period === 'newyear' && <ConfettiOverlay />}

          {/* Feuerwerk für Silvester & Neujahr */}
          {showFireworks && <FireworksOverlay onComplete={handleFireworksComplete} />}
        </>
      )}
    </>
  )
}

// Export für Lichterketten-Check in anderen Komponenten
export function isChristmasPeriod(): boolean {
  const period = getFestivePeriod()
  return period === 'christmas'
}

export function isNewYearDay(): boolean {
  const period = getFestivePeriod()
  return period === 'newyear'
}

export function isFestivePeriod(): boolean {
  return getFestivePeriod() !== null
}
