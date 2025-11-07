'use client'

import { useState } from 'react'
import type { TemplateWithAttachments } from '@/lib/types/template'
import { CategoryLabels } from '@/lib/types/template'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Paperclip } from 'lucide-react'
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
    <Card className="hover:border-primary transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-1">{template.name}</h3>
            <Badge variant="outline" className="mt-2">
              {CategoryLabels[template.category]}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
          {template.content}
        </p>

        {template.attachments && template.attachments.length > 0 && (
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <Paperclip className="w-3 h-3" />
            <span>{template.attachments.length} Anhang{template.attachments.length !== 1 ? 'e' : ''}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex gap-2">
        <TemplateFormDialog mode="edit" template={template}>
          <Button variant="outline" size="sm" className="flex-1">
            <Edit className="w-4 h-4 mr-2" />
            Bearbeiten
          </Button>
        </TemplateFormDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isDeleting}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie die Vorlage "{template.name}" wirklich löschen?
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
      </CardFooter>
    </Card>
  )
}
