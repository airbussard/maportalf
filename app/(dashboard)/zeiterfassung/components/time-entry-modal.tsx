'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TimeEntry, TimeCategory } from '@/lib/types/time-tracking'
import { createTimeEntry, updateTimeEntry } from '@/app/actions/time-tracking'

interface TimeEntryModalProps {
  entry: TimeEntry | null
  categories: TimeCategory[]
  year: number
  month: number
  onClose: () => void
  onSuccess: () => void
}

export function TimeEntryModal({
  entry,
  categories,
  year,
  month,
  onClose,
  onSuccess,
}: TimeEntryModalProps) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [duration, setDuration] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Initialize form with entry data if editing
  useEffect(() => {
    if (entry) {
      setDate(entry.date)
      setStartTime(entry.start_time || '')
      setEndTime(entry.end_time || '')
      const hours = Math.floor(entry.duration_minutes / 60)
      const minutes = entry.duration_minutes % 60
      setDuration(`${hours}:${String(minutes).padStart(2, '0')}`)
      setCategoryId(entry.category_id || '')
      setDescription(entry.description || '')
    } else {
      // Set default date to today (if in current month) or first day of selected month
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      if (year === currentYear && month === currentMonth) {
        setDate(now.toISOString().split('T')[0])
      } else {
        setDate(`${year}-${String(month).padStart(2, '0')}-01`)
      }
    }
  }, [entry, year, month])

  const parseDuration = (durationStr: string): number | null => {
    const match = durationStr.match(/^(\d+):([0-5][0-9])$/)
    if (!match) return null

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    return hours * 60 + minutes
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate duration
    const durationMinutes = parseDuration(duration)
    if (!durationMinutes || durationMinutes <= 0) {
      setError('Bitte geben Sie eine gültige Dauer im Format hh:mm ein (z.B. 2:30)')
      return
    }

    setSaving(true)

    const formData = {
      date,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      duration_minutes: durationMinutes,
      category_id: categoryId || undefined,
      description: description || undefined,
    }

    let result
    if (entry) {
      result = await updateTimeEntry(entry.id, formData)
    } else {
      result = await createTimeEntry(formData)
    }

    setSaving(false)

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error || 'Fehler beim Speichern')
    }
  }

  // Calculate max date (end of current month)
  const now = new Date()
  const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{entry ? 'Zeiteintrag bearbeiten' : 'Neue Zeiterfassung'}</DialogTitle>
            <DialogDescription>
              Erfassen Sie Ihre Arbeitszeit für den ausgewählten Tag
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={lastDayOfCurrentMonth}
                required
              />
            </div>

            {/* Start and End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Startzeit</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">Endzeit</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="grid gap-2">
              <Label htmlFor="duration">Dauer (Stunden:Minuten) *</Label>
              <Input
                id="duration"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="z.B. 2:30"
                pattern="^(\d+):([0-5][0-9])$"
                required
              />
              <p className="text-xs text-muted-foreground">
                Format: Stunden:Minuten (z.B. 2:30 für 2 Stunden 30 Minuten)
              </p>
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Keine Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keine Kategorie</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Bemerkungen (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
