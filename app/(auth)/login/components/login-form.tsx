'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generate2FACode } from '@/app/actions/two-factor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginLoader } from './login-loader'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showLoader, setShowLoader] = useState(false)

  // Check for error parameter on mount
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
      // Debug: Check if ENV vars are loaded
      console.log('ENV Check:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...'
      })

      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Supabase Auth Error:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.session) {
        // Check if user is active (both is_active and exit_date)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active, exit_date')
          .eq('id', data.user.id)
          .single()

        if (profileError || !profile) {
          console.error('Profile fetch error:', profileError)
          setError('Fehler beim Laden des Profils')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // Check if user is inactive (is_active = false OR exit_date in past/today)
        const isInactive = profile.is_active === false ||
                          (profile.exit_date && new Date(profile.exit_date) <= new Date())

        if (isInactive) {
          setError('Ihr Account wurde deaktiviert. Bitte kontaktieren Sie einen Administrator.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // ========================================
        // TEMPORARY: 2FA DISABLED
        // TODO: Re-enable when email worker is stable and 2FA tables are verified
        // ========================================

        // Direct login without 2FA (TEMPORARY) - Show loader animation
        console.log('✅ Login successful - showing loader animation')
        setShowLoader(true)
        // handleLoaderComplete() will be called after animation finishes

        /* DISABLED 2FA CODE - Re-enable later:

        // Generate 2FA code
        const twoFactorResult = await generate2FACode(email, undefined)

        // Defensive check for undefined result
        if (!twoFactorResult || typeof twoFactorResult !== 'object') {
          console.error('Invalid 2FA result:', twoFactorResult)
          setError('Fehler beim Senden des Sicherheitscodes. Bitte versuchen Sie es erneut.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        if (!twoFactorResult.success) {
          setError('Fehler beim Senden des Sicherheitscodes. Bitte versuchen Sie es erneut.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // Sign out user until 2FA is verified
        await supabase.auth.signOut()
        setLoading(false)

        // Redirect to 2FA verification page
        router.push(`/verify-2fa?email=${encodeURIComponent(email)}`)

        */
      }
    } catch (err) {
      console.error('Login Exception:', err)
      const errorMessage = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
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

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Anmelden</CardTitle>
          <CardDescription>
            Geben Sie Ihre Email und Passwort ein, um sich anzumelden
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Vergessen?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Wird geladen...' : 'Anmelden'}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Noch kein Konto?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Registrieren
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </>
  )
}
