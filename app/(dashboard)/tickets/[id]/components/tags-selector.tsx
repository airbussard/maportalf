'use client'

import { useState, useEffect } from 'react'
import { getTags, type Tag as TagType } from '@/app/actions/tags'
import { updateTicketTags } from '@/app/actions/tickets'
import { useRouter } from 'next/navigation'
import type { Tag } from '@/lib/types/ticket'

interface TagsSelectorProps {
  ticketId: string
  currentTags: Tag[]
  disabled?: boolean
}

export function TagsSelector({ ticketId, currentTags, disabled }: TagsSelectorProps) {
  const router = useRouter()
  const [allTags, setAllTags] = useState<TagType[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    currentTags.map(t => t.id)
  )
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    const result = await getTags()
    if (result.success) {
      setAllTags(result.data)
    }
    setLoading(false)
  }

  const handleToggleTag = async (tagId: string) => {
    if (disabled || updating) return

    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId]

    setSelectedTagIds(newSelection)
    setUpdating(true)

    const result = await updateTicketTags(ticketId, newSelection)

    if (result.success) {
      router.refresh()
    } else {
      // Revert on error
      setSelectedTagIds(selectedTagIds)
      alert(result.error || 'Fehler beim Aktualisieren der Tags')
    }

    setUpdating(false)
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Laden...</div>
  }

  if (allTags.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Keine Tags verfügbar. Erstellen Sie Tags in der Tag-Verwaltung.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allTags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id)

        return (
          <label
            key={tag.id}
            className={`
              inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer
              transition-all border-2
              ${isSelected
                ? 'border-transparent'
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600'
              }
              ${disabled || updating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
            style={{
              backgroundColor: isSelected ? tag.color : 'transparent',
              color: isSelected ? '#ffffff' : 'inherit'
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleTag(tag.id)}
              disabled={disabled || updating}
              className="sr-only"
            />
            <span>{tag.name}</span>
          </label>
        )
      })}
    </div>
  )
}
