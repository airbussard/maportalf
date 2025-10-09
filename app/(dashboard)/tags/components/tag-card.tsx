'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteTag, getEmailRules, type EmailRule } from '@/app/actions/tags'
import { useRouter } from 'next/navigation'
import { TagFormDialog } from './tag-form-dialog'
import { EmailRulesDialog } from './email-rules-dialog'
import { Pencil, Mail, Trash2 } from 'lucide-react'

interface TagWithCount {
  id: string
  name: string
  color: string
  ticket_count: number
  created_at: string
  updated_at: string
}

export function TagCard({ tag }: { tag: TagWithCount }) {
  const router = useRouter()
  const [emailRules, setEmailRules] = useState<EmailRule[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadEmailRules()
  }, [tag.id])

  const loadEmailRules = async () => {
    const result = await getEmailRules(tag.id)
    if (result.success) {
      setEmailRules(result.data)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Sind Sie sicher? Dieses Tag wird von allen Tickets entfernt.')) {
      return
    }

    setDeleting(true)
    const result = await deleteTag(tag.id)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Löschen')
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <h3 className="font-semibold flex-1">{tag.name}</h3>
          <Badge variant="secondary">{tag.ticket_count}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {emailRules.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">E-Mail-Regeln:</h4>
            <div className="space-y-1">
              {emailRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{rule.email_address}</span>
                  <Badge variant={rule.create_ticket ? 'default' : 'secondary'} className="text-xs">
                    {rule.create_ticket ? '✓ Ticket' : '✗ Kein Ticket'}
                  </Badge>
                  {rule.use_reply_to && (
                    <Badge variant="outline" className="text-xs">
                      ✓ Reply-To
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <TagFormDialog tag={tag}>
            <Button variant="outline" size="sm" className="flex-1">
              <Pencil className="w-3 h-3 mr-1" />
              Bearbeiten
            </Button>
          </TagFormDialog>

          <EmailRulesDialog tag={tag} onUpdate={loadEmailRules}>
            <Button variant="outline" size="sm" className="flex-1">
              <Mail className="w-3 h-3 mr-1" />
              E-Mail-Regeln
            </Button>
          </EmailRulesDialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
