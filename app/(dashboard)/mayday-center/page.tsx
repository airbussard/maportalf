'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { MaydayDashboard } from './components/mayday-dashboard'
import { AlertTriangle } from 'lucide-react'

export default function MaydayCenterPage() {
  const [showSplash, setShowSplash] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Start fade out after 2.5 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, 2500)

    // Hide splash after 3 seconds
    const hideTimer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (showSplash) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: 'radial-gradient(circle at center, #1a0000 0%, #000000 70%)'
        }}
      >
        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full border border-red-900/20 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full border border-red-800/30 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-[200px] h-[200px] rounded-full border border-red-700/40 animate-ping" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* Warning icon with glow */}
        <div className="relative z-10 mb-8">
          <div className="absolute inset-0 blur-xl bg-red-600/50 rounded-full animate-pulse" />
          <AlertTriangle className="relative w-24 h-24 text-red-500 animate-pulse" />
        </div>

        {/* Logo */}
        <div className="relative z-10 mb-6">
          <Image
            src="/logo.png"
            alt="FLIGHTHOUR"
            width={200}
            height={60}
            className="animate-pulse"
            style={{ filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))' }}
          />
        </div>

        {/* Loading text with glow effect */}
        <div className="relative z-10">
          <h1
            className="text-2xl font-bold text-red-500 tracking-wider animate-pulse"
            style={{
              textShadow: '0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.4)'
            }}
          >
            MAYDAY Center wird gestartet
          </h1>
        </div>

        {/* Loading dots */}
        <div className="relative z-10 mt-6 flex gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MAYDAY Center</h1>
        <p className="text-muted-foreground">
          Notfall-Terminmanagement für kurzfristige Verschiebungen und Absagen
        </p>
      </div>

      <MaydayDashboard />
    </div>
  )
}
