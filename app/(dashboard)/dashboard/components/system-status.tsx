'use client'

import { useEffect, useState } from 'react'
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
      <div className="rounded-[10px] bg-card py-6 shadow-1 dark:shadow-card">
        <h2 className="mb-4 px-7.5 text-lg font-bold text-foreground">System-Status</h2>
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full size-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  const services = [
    {
      name: 'Datenbank',
      icon: Database,
      online: status.database.online,
      message: status.database.message,
      metric: status.database.responseTime ? `${status.database.responseTime}ms` : null,
      metricLabel: 'Antwortzeit',
    },
    {
      name: 'System',
      icon: Server,
      online: true,
      message: `Version ${status.system.version}`,
      metric: status.system.uptime,
      metricLabel: 'Betriebszeit',
      metricIcon: Zap,
    },
  ]

  return (
    <div className="rounded-[10px] bg-card py-6 shadow-1 dark:shadow-card">
      <div className="mb-5 flex items-center justify-between px-7.5">
        <h2 className="text-lg font-bold text-foreground">System-Status</h2>
        <span className="text-xs font-medium text-muted-foreground">
          Letzte Prüfung: {formatDistanceToNow(lastChecked, { addSuffix: true, locale: de })}
        </span>
      </div>

      <div className="grid gap-4 px-7.5 pb-1 sm:grid-cols-2 2xl:gap-7.5">
        {services.map(service => {
          const Icon = service.icon
          const MetricIcon = service.metricIcon

          return (
            <div
              key={service.name}
              className={`
                rounded-[10px] border bg-card p-5 transition-shadow duration-300 hover:shadow-card-2
                ${!service.online ? 'border-[#F23030]/30' : 'border-border'}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    flex size-11 items-center justify-center rounded-full
                    ${service.online
                      ? 'bg-[#219653]/10 text-[#219653]'
                      : 'bg-[#F23030]/10 text-[#F23030]'
                    }
                  `}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{service.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{service.message}</p>
                  </div>
                </div>

                {/* Pulsing status dot */}
                <div className="relative flex size-3 mt-1">
                  {service.online && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#219653] opacity-75" />
                  )}
                  <span className={`
                    relative inline-flex rounded-full size-3
                    ${service.online ? 'bg-[#219653]' : 'bg-[#F23030]'}
                  `} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`
                  text-sm font-bold
                  ${service.online ? 'text-[#219653]' : 'text-[#F23030]'}
                `}>
                  {service.online ? 'Online' : 'Offline'}
                </span>

                {service.metric && (
                  <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                    {MetricIcon && <MetricIcon className="size-3 text-muted-foreground" />}
                    <span className="text-xs font-medium text-muted-foreground">{service.metric}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
