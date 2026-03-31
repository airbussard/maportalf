'use client'

import { useState, useEffect } from 'react'
import { deleteTag, getEmailRules, type EmailRule } from '@/app/actions/tags'
import { useRouter } from 'next/navigation'
import { TagFormDialog } from './tag-form-dialog'
import { EmailRulesDialog } from './email-rules-dialog'
import { Pencil, Mail, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/nextadmin'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

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
    setDeleting(true)
    try {
      const result = await deleteTag(tag.id)
      if (result.success) {
        toast.success('Tag gelöscht')
        router.refresh()
      } else {
        toast.error(result.error || 'Fehler beim Löschen')
        setDeleting(false)
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten')
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card hover:shadow-card-2 transition-shadow">
      {/* Header */}
      <div className="border-b border-border px-7.5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${tag.color}15` }}
          >
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
          </div>
          <h3 className="font-medium text-foreground truncate">{tag.name}</h3>
        </div>
        <StatusBadge variant="info" className="shrink-0 ml-3">
          {tag.ticket_count} {tag.ticket_count === 1 ? 'Ticket' : 'Tickets'}
        </StatusBadge>
      </div>

      {/* Content - email rules */}
      <div className="px-7.5 py-4">
        {emailRules.length > 0 ? (
          <div className="space-y-2.5">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">E-Mail-Regeln</h4>
            <div className="space-y-2">
              {emailRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 text-sm">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-foreground">{rule.email_address}</span>
                  <StatusBadge variant={rule.create_ticket ? 'success' : 'neutral'}>
                    {rule.create_ticket ? 'Ticket' : 'Kein Ticket'}
                  </StatusBadge>
                  {rule.use_reply_to && (
                    <StatusBadge variant="info">Reply-To</StatusBadge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine E-Mail-Regeln konfiguriert</p>
        )}
      </div>

      {/* Footer with actions */}
      <div className="border-t border-border px-7.5 py-3 flex items-center justify-end gap-1">
        <TagFormDialog tag={tag}>
          <button
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#fbb928]"
            title="Bearbeiten"
          >
            <Pencil className="size-[18px]" />
          </button>
        </TagFormDialog>

        <EmailRulesDialog tag={tag} onUpdate={loadEmailRules}>
          <button
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#3C50E0]"
            title="E-Mail-Regeln"
          >
            <Mail className="size-[18px]" />
          </button>
        </EmailRulesDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={deleting}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#F23030] disabled:opacity-50"
              title="Löschen"
            >
              <Trash2 className="size-[18px]" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tag löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher? Dieses Tag wird von allen Tickets entfernt.
                Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
