'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTag, updateTag } from '@/app/actions/tags'
import { useRouter } from 'next/navigation'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagFormDialogProps {
  tag?: Tag
  children: React.ReactNode
}

export function TagFormDialog({ tag, children }: TagFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(tag?.name || '')
  const [color, setColor] = useState(tag?.color || '#3B82F6')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    setLoading(true)

    const result = tag
      ? await updateTag(tag.id, { name, color })
      : await createTag({ name, color })

    if (result.success) {
      setOpen(false)
      setName('')
      setColor('#3B82F6')
      router.refresh()
    } else {
      alert(result.error || 'Ein Fehler ist aufgetreten')
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{tag ? 'Tag bearbeiten' : 'Neues Tag erstellen'}</DialogTitle>
            <DialogDescription>
              {tag
                ? 'Bearbeiten Sie den Namen und die Farbe des Tags.'
                : 'Erstellen Sie ein neues Tag für die Ticket-Kategorisierung.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Bug, Feature, Support..."
                maxLength={50}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Farbe</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border"
                  disabled={loading}
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3B82F6"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Wird gespeichert...' : tag ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
