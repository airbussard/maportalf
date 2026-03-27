'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoginLoader } from './login-loader'
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'

export function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'account_deactivated') {
      setError('Ihr Account wurde deaktiviert. Bitte kontaktieren Sie einen Administrator.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('E-Mail oder Passwort ist falsch.')
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }

      if (data.session) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active, exit_date')
          .eq('id', data.user.id)
          .single()

        if (profileError || !profile) {
          setError('Fehler beim Laden des Profils')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        const isInactive = profile.is_active === false ||
          (profile.exit_date && new Date(profile.exit_date) <= new Date())

        if (isInactive) {
          setError('Ihr Account wurde deaktiviert. Bitte kontaktieren Sie einen Administrator.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        setShowLoader(true)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleLoaderComplete = () => {
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      {showLoader && <LoginLoader onComplete={handleLoaderComplete} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Anmelden</h2>
          <p className="text-sm text-muted-foreground">
            Melden Sie sich mit Ihren Zugangsdaten an
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">E-Mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="ihre.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="pl-10 h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">Passwort</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#fbb928] hover:text-[#e5a820] transition-colors"
              >
                Vergessen?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pl-10 pr-10 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#fbb928] hover:bg-[#e5a820] text-zinc-900 font-semibold shadow-sm"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                Wird angemeldet...
              </span>
            ) : (
              'Anmelden'
            )}
          </Button>
        </form>
      </div>
    </>
  )
}
