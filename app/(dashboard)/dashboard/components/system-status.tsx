'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { checkSystemStatus, type SystemStatus } from '@/app/actions/system'
import { Database, Server, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export function SystemStatusWidget() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  const fetchStatus = async () => {
    const result = await checkSystemStatus()
    setStatus(result)
    setLastChecked(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchStatus()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System-Status</CardTitle>
          <CardDescription>Prüfe Status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System-Status</CardTitle>
        <CardDescription>
          Letzte Prüfung: {formatDistanceToNow(lastChecked, { addSuffix: true, locale: de })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Database Status */}
          <div className="relative group">
            <div className={`
              relative overflow-hidden rounded-lg border p-4 transition-all duration-300
              ${status.database.online
                ? 'bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-900'
                : 'bg-gradient-to-br from-red-50/50 to-rose-50/50 border-red-200 dark:from-red-950/20 dark:to-rose-950/20 dark:border-red-900'
              }
            `}>
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>

              {/* Content */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg transition-transform duration-300 group-hover:rotate-12
                    ${status.database.online
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                    }
                  `}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Datenbank</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Pulsing indicator */}
                  <div className="relative flex h-3 w-3">
                    {status.database.online && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    )}
                    <span className={`
                      relative inline-flex rounded-full h-3 w-3
                      ${status.database.online ? 'bg-green-500' : 'bg-red-500'}
                    `}></span>
                  </div>
                  <span className={`
                    font-bold text-sm
                    ${status.database.online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                  `}>
                    {status.database.online ? 'Online' : 'Offline'}
                  </span>
                  {status.database.responseTime && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-white/50 dark:bg-black/20">
                      {status.database.responseTime}ms
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {status.database.message}
                </p>
              </div>

              {/* Glowing effect */}
              {status.database.online && (
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg opacity-0 group-hover:opacity-20 blur transition duration-300"></div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="relative group">
            <div className={`
              relative overflow-hidden rounded-lg border p-4 transition-all duration-300
              bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-200
              dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-900
            `}>
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>

              {/* Content */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110">
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">System</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Pulsing indicator */}
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </div>
                  <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                    Online
                  </span>
                  <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/50 dark:bg-black/20">
                    <Zap className="w-3 h-3" />
                    {status.system.uptime}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Version {status.system.version}
                </p>
              </div>

              {/* Glowing effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg opacity-0 group-hover:opacity-20 blur transition duration-300"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
