'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InputGroup, ShowcaseSection } from '@/components/nextadmin'
import { addToBlacklist, removeFromBlacklist, type BlacklistEntry } from '@/app/actions/tags'
import { useRouter } from 'next/navigation'
import { Ban, Trash2, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface BlacklistSectionProps {
  initialBlacklist: BlacklistEntry[]
}

export function BlacklistSection({ initialBlacklist }: BlacklistSectionProps) {
  const router = useRouter()
  const [blacklist, setBlacklist] = useState(initialBlacklist)
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newReason, setNewReason] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newEmail.trim()) {
      return
    }

    setLoading(true)

    const result = await addToBlacklist({
      email_address: newEmail.trim(),
      reason: newReason.trim() || undefined
    })

    if (result.success) {
      setNewEmail('')
      setNewReason('')
      setShowAddForm(false)
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Hinzufügen')
    }

    setLoading(false)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Diese E-Mail-Adresse wirklich von der Blacklist entfernen?')) {
      return
    }

    const result = await removeFromBlacklist(id)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Entfernen')
    }
  }

  return (
    <ShowcaseSection title="E-Mail Blacklist">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Blockierte E-Mail-Adressen werden automatisch gefiltert und als Spam markiert
        </p>
        <Button
          variant={showAddForm ? "outline" : "default"}
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Abbrechen' : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              E-Mail blockieren
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <InputGroup
              label="E-Mail-Adresse"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="spam@example.com"
              disabled={loading}
              required
            />

            <InputGroup
              label="Grund (optional)"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="z.B. Spam, Belästigung..."
              disabled={loading}
            />

            <Button type="submit" disabled={loading}>
              {loading ? 'Wird hinzugefügt...' : 'Zur Blacklist hinzufügen'}
            </Button>
          </form>
        )}

        {/* Blacklist */}
        {blacklist.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine blockierten E-Mail-Adressen
          </div>
        ) : (
          <div className="space-y-2">
            {blacklist.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Ban className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{entry.email_address}</div>
                  {entry.reason && (
                    <div className="text-sm text-muted-foreground">{entry.reason}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Blockiert {formatDistanceToNow(new Date(entry.created_at), {
                      addSuffix: true,
                      locale: de
                    })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(entry.id)}
                  className="text-destructive hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ShowcaseSection>
  )
}
