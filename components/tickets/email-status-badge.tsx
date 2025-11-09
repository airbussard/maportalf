'use client'

import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface EmailStatusBadgeProps {
  status: 'pending' | 'sending' | 'sent' | 'failed'
  sentAt?: string
  errorMessage?: string
  attempts?: number
  maxAttempts?: number
}

export function EmailStatusBadge({
  status,
  sentAt,
  errorMessage,
  attempts = 0,
  maxAttempts = 3
}: EmailStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'sent':
        return {
          icon: CheckCircle,
          label: 'E-Mail gesendet',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        }
      case 'failed':
        return {
          icon: XCircle,
          label: `E-Mail fehlgeschlagen`,
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        }
      case 'sending':
        return {
          icon: Loader2,
          label: 'E-Mail wird gesendet',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
        }
      case 'pending':
      default:
        return {
          icon: Clock,
          label: 'Ausstehend',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const getTooltipContent = () => {
    const parts = []

    if (status === 'sent' && sentAt) {
      const timeAgo = formatDistanceToNow(new Date(sentAt), { addSuffix: true, locale: de })
      parts.push(`Gesendet ${timeAgo}`)
    }

    if (status === 'failed') {
      parts.push(`Versuche: ${attempts}/${maxAttempts}`)
      if (errorMessage) {
        parts.push(`Fehler: ${errorMessage}`)
      }
    }

    return parts.length > 0 ? parts.join('\n') : config.label
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={`${config.className} text-xs cursor-help`}>
            <Icon className={`w-3 h-3 mr-1 ${status === 'sending' ? 'animate-spin' : ''}`} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-pre-line">
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
