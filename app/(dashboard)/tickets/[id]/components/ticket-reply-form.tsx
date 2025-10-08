'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { addMessage } from '@/app/actions/tickets'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

export function TicketReplyForm({
  ticketId,
  isManagerOrAdmin
}: {
  ticketId: string
  isManagerOrAdmin: boolean
}) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError('Bitte geben Sie eine Nachricht ein')
      return
    }

    setLoading(true)
    setError(null)

    const result = await addMessage(ticketId, content, isInternal)

    if (result.success) {
      setContent('')
      setIsInternal(false)
      router.refresh()
    } else {
      setError(result.error || 'Fehler beim Senden')
    }

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antworten</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ihre Nachricht..."
              rows={5}
              disabled={loading}
            />
          </div>

          {isManagerOrAdmin && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_internal"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-4 h-4 rounded border-border"
                disabled={loading}
              />
              <Label htmlFor="is_internal" className="cursor-pointer">
                Als interne Notiz markieren
              </Label>
            </div>
          )}

          <Button type="submit" disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Wird gesendet...' : 'Antworten'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
