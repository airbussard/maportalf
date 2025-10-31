'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface CronJobCardProps {
  title: string
  description: string
  icon: React.ReactNode
  endpoint: string
  onSuccess?: (result: any) => void
}

export function CronJobCard({ title, description, icon, endpoint, onSuccess }: CronJobCardProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<{
    success: boolean
    message?: string
    processed?: number
    timestamp: Date
  } | null>(null)

  const handleRun = async () => {
    setIsRunning(true)
    const startTime = new Date()

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        const result = {
          success: true,
          message: data.message || 'Erfolgreich ausgeführt',
          processed: data.processed || data.imported || data.exported || 0,
          timestamp: startTime
        }
        setLastResult(result)
        toast.success(`${title} erfolgreich ausgeführt`, {
          description: result.message
        })
        onSuccess?.(data)
      } else {
        const result = {
          success: false,
          message: data.error || 'Fehler bei der Ausführung',
          timestamp: startTime
        }
        setLastResult(result)
        toast.error(`${title} fehlgeschlagen`, {
          description: result.message
        })
      }
    } catch (error) {
      const result = {
        success: false,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: startTime
      }
      setLastResult(result)
      toast.error(`${title} fehlgeschlagen`, {
        description: result.message
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          <Button
            onClick={handleRun}
            disabled={isRunning}
            size="sm"
            className="ml-4"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Läuft...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Ausführen
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {lastResult && (
        <CardContent>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
            {lastResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {lastResult.success ? 'Erfolgreich' : 'Fehlgeschlagen'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {lastResult.message}
              </p>
              {lastResult.processed !== undefined && lastResult.processed > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {lastResult.processed} Element(e) verarbeitet
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {lastResult.timestamp.toLocaleTimeString('de-DE')}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
