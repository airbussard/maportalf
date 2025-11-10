'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verify2FACode, resend2FACode } from '@/app/actions/two-factor'
import { CodeInput } from './components/code-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, RefreshCw, Shield, Clock } from 'lucide-react'

function Verify2FAContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(600) // 10 minutes in seconds

  // Countdown timer for code expiration
  useEffect(() => {
    if (timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setError('Code ist abgelaufen. Bitte fordern Sie einen neuen Code an.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCooldown])

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      router.push('/login')
    }
  }, [email, router])

  const handleComplete = async (code: string) => {
    setError('')
    setIsVerifying(true)

    try {
      const result = await verify2FACode(email, code)

      if (result.success && result.data?.verified) {
        setSuccess(true)

        // If we have a token, redirect to complete-2fa route
        if (result.data?.token) {
          setTimeout(() => {
            router.push(`/login/complete-2fa?token=${result.data!.token}`)
          }, 1500)
        } else {
          // Fallback: redirect to dashboard (will be blocked by middleware if no session)
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        }
      } else {
        setError(result.error || 'Ungültiger Code')
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    setError('')
    setIsResending(true)

    try {
      const result = await resend2FACode(email)

      if (result.success) {
        setResendCooldown(30) // 30 seconds cooldown
        setTimeRemaining(600) // Reset to 10 minutes
        // Show success message briefly
        setError('')
      } else {
        setError(result.error || 'Fehler beim erneuten Senden')
        // If there's a wait time, set the cooldown
        if (result.data?.waitSeconds) {
          setResendCooldown(result.data.waitSeconds)
        }
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setIsResending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@')
    if (!local || !domain) return email
    const maskedLocal = local[0] + '*'.repeat(Math.max(0, local.length - 2)) + (local.length > 1 ? local[local.length - 1] : '')
    return `${maskedLocal}@${domain}`
  }

  if (!email) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-[#fbb928] rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Sicherheitscode</CardTitle>
          <CardDescription className="text-base">
            Wir haben einen 6-stelligen Code an <br />
            <span className="font-medium text-foreground">{maskEmail(email)}</span> gesendet
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Time remaining */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Code gültig für: <strong className="text-foreground">{formatTime(timeRemaining)}</strong>
            </span>
          </div>

          {/* Code Input */}
          <div>
            <CodeInput
              onComplete={handleComplete}
              disabled={isVerifying || success || timeRemaining === 0}
              error={!!error}
            />
          </div>

          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800 text-center">
                ✓ Erfolgreich verifiziert! Sie werden weitergeleitet...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && !success && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800 text-center">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Resend Button */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Code nicht erhalten?
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0 || success}
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Erneut senden in {resendCooldown}s
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Code erneut senden
                </>
              )}
            </Button>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/login')}
              disabled={isVerifying || success}
              className="text-sm"
            >
              Zurück zum Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fbb928] mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lädt...</p>
        </div>
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  )
}
