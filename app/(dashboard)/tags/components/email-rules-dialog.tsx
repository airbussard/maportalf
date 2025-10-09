'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { getEmailRules, createEmailRule, deleteEmailRule, type EmailRule } from '@/app/actions/tags'
import { Trash2, Plus } from 'lucide-react'

interface Tag {
  id: string
  name: string
}

interface EmailRulesDialogProps {
  tag: Tag
  onUpdate?: () => void
  children: React.ReactNode
}

export function EmailRulesDialog({ tag, onUpdate, children }: EmailRulesDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rules, setRules] = useState<EmailRule[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [createTicket, setCreateTicket] = useState(true)
  const [useReplyTo, setUseReplyTo] = useState(false)

  useEffect(() => {
    if (open) {
      loadRules()
    }
  }, [open])

  const loadRules = async () => {
    const result = await getEmailRules(tag.id)
    if (result.success) {
      setRules(result.data)
    }
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newEmail.trim()) {
      return
    }

    setLoading(true)

    const result = await createEmailRule({
      tag_id: tag.id,
      email_address: newEmail.trim(),
      create_ticket: createTicket,
      use_reply_to: useReplyTo
    })

    if (result.success) {
      setNewEmail('')
      setCreateTicket(true)
      setUseReplyTo(false)
      await loadRules()
      onUpdate?.()
    } else {
      alert(result.error || 'Fehler beim Hinzufügen der Regel')
    }

    setLoading(false)
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Diese Regel wirklich löschen?')) {
      return
    }

    const result = await deleteEmailRule(id)

    if (result.success) {
      await loadRules()
      onUpdate?.()
    } else {
      alert(result.error || 'Fehler beim Löschen')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>E-Mail-Regeln für "{tag.name}"</DialogTitle>
          <DialogDescription>
            Eingehende E-Mails von diesen Adressen werden automatisch mit diesem Tag versehen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Rules */}
          {rules.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Aktive Regeln:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2 p-2 border rounded">
                    <span className="flex-1 text-sm">{rule.email_address}</span>
                    <Badge variant={rule.create_ticket ? 'default' : 'secondary'} className="text-xs">
                      {rule.create_ticket ? '✓ Ticket' : '✗ Kein Ticket'}
                    </Badge>
                    {rule.use_reply_to && (
                      <Badge variant="outline" className="text-xs">
                        ✓ Reply-To
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Rule */}
          <form onSubmit={handleAddRule} className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium">Neue Regel hinzufügen:</h4>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse *</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={loading}
                required
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createTicket}
                  onChange={(e) => setCreateTicket(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <span className="text-sm">Ticket erstellen</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useReplyTo}
                  onChange={(e) => setUseReplyTo(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <span className="text-sm">Reply-To verwenden</span>
              </label>
            </div>

            <Button type="submit" disabled={loading} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Wird hinzugefügt...' : 'Regel hinzufügen'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
