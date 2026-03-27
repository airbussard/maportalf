import Image from 'next/image'
import { Plane } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-zinc-900">
        {/* Background image - A320 Cockpit */}
        <Image
          src="/cockpit-bg.jpg"
          alt="Airbus A320 Cockpit"
          fill
          className="object-cover opacity-40"
          priority
          quality={85}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-[#fbb928]/10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo top */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="FLIGHTHOUR"
              width={180}
              height={45}
              className="brightness-0 invert"
              priority
            />
          </div>

          {/* Center content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fbb928]/15 px-4 py-2 text-[#fbb928] text-sm font-medium backdrop-blur-sm border border-[#fbb928]/20">
              <Plane className="h-4 w-4" />
              Mitarbeiterportal
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Willkommen bei<br />
              <span className="text-[#fbb928]">FLIGHTHOUR</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
              Verwalten Sie Ihre Schichten, Dokumente und Anfragen an einem zentralen Ort.
            </p>
          </div>

          {/* Bottom: quote + image credit */}
          <div className="space-y-4">
            <div className="border-l-2 border-[#fbb928]/40 pl-4">
              <p className="text-zinc-500 text-sm italic">
                &ldquo;The engine is the heart of an airplane, but the pilot is its soul.&rdquo;
              </p>
              <p className="text-zinc-600 text-xs mt-1">— Walter Raleigh</p>
            </div>
            <p className="text-zinc-700 text-[10px]">
              Foto: Unsplash (Lizenzfrei)
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-8">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <Image
              src="/logo.png"
              alt="FLIGHTHOUR"
              width={160}
              height={40}
              priority
            />
            <p className="text-muted-foreground text-sm mt-2">Mitarbeiterportal</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
