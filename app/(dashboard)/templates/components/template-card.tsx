'use client'

import { useState } from 'react'
import type { TemplateWithAttachments } from '@/lib/types/template'
import { CategoryLabels } from '@/lib/types/template'
import { Pencil, Trash2, ScrollText, Paperclip } from 'lucide-react'
import { StatusBadge } from '@/components/nextadmin'
import { TemplateFormDialog } from './template-form-dialog'
import { deleteTemplate } from '@/app/actions/templates'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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

interface TemplateCardProps {
  template: TemplateWithAttachments
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteTemplate(template.id)
      if (result.success) {
        toast.success('Vorlage gelöscht')
        router.refresh()
      } else {
        toast.error(result.error || 'Fehler beim Löschen')
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card hover:shadow-card-2 transition-shadow">
      {/* Header */}
      <div className="border-b border-border px-7.5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbb928]/10">
            <ScrollText className="size-5 text-[#fbb928]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">{template.name}</h3>
            <StatusBadge variant="neutral" className="mt-1">
              {CategoryLabels[template.category]}
            </StatusBadge>
          </div>
        </div>
        {template.attachments && template.attachments.length > 0 && (
          <StatusBadge variant="info" className="shrink-0 ml-3">
            <Paperclip className="size-3 mr-1" />
            {template.attachments.length} Anhang{template.attachments.length !== 1 ? 'e' : ''}
          </StatusBadge>
        )}
      </div>

      {/* Content */}
      <div className="px-7.5 py-4">
        <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
          {template.content}
        </p>
      </div>

      {/* Footer with actions */}
      <div className="border-t border-border px-7.5 py-3 flex items-center justify-end gap-1">
        <TemplateFormDialog mode="edit" template={template}>
          <button
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#fbb928]"
            title="Bearbeiten"
          >
            <Pencil className="size-[18px]" />
          </button>
        </TemplateFormDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={isDeleting}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#F23030] disabled:opacity-50"
              title="Löschen"
            >
              <Trash2 className="size-[18px]" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie die Vorlage &quot;{template.name}&quot; wirklich löschen?
                Diese Aktion kann nicht rückgängig gemacht werden.
                {template.attachments && template.attachments.length > 0 && (
                  <>
                    <br /><br />
                    <strong>Hinweis:</strong> {template.attachments.length} Anhang{template.attachments.length !== 1 ? 'e' : ''} wird ebenfalls gelöscht.
                  </>
                )}
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
