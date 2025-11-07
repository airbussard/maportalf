'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollText, Paperclip } from 'lucide-react'
import { getTemplatesByCategory } from '@/app/actions/templates'
import type { TemplatesByCategory, TemplateWithAttachments } from '@/lib/types/template'

interface TemplateSelectorProps {
  onSelectTemplate: (template: TemplateWithAttachments) => void
  disabled?: boolean
}

export function TemplateSelector({ onSelectTemplate, disabled }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<TemplatesByCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    setLoading(true)
    const result = await getTemplatesByCategory()
    if (result.success) {
      setTemplates(result.data)
    }
    setLoading(false)
  }

  const handleSelect = (template: TemplateWithAttachments) => {
    onSelectTemplate(template)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <ScrollText className="w-4 h-4 mr-2" />
          Vorlage einfügen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Antwort-Vorlage auswählen</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Laden...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-2">Keine Vorlagen vorhanden.</p>
              <p className="text-sm">
                Erstellen Sie Vorlagen in der Template-Verwaltung.
              </p>
            </div>
          ) : (
            templates.map((group) => (
              <div key={group.category}>
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
                  {group.categoryLabel}
                </h3>
                <div className="space-y-2">
                  {group.templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="w-full text-left p-4 rounded-lg border hover:border-primary hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="font-medium">{template.name}</div>
                        {template.attachments && template.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Paperclip className="w-3 h-3" />
                            <span>{template.attachments.length}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {template.content}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
