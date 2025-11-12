'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, Calendar } from 'lucide-react'
import { getTags } from '@/app/actions/tags'
import { TagPill } from '@/components/tickets/tag-pill'
import type { Tag } from '@/lib/types/ticket'
import { cn } from '@/lib/utils'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

export function TicketFilters({
  currentFilter,
  currentStatus,
  currentSearch,
  isManagerOrAdmin
}: {
  currentFilter: string
  currentStatus?: string
  currentSearch?: string
  isManagerOrAdmin: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(currentSearch || '')
  const [debouncedSearch, setDebouncedSearch] = useState(currentSearch || '')
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [datePreset, setDatePreset] = useState<string>(searchParams.get('date_preset') || '')
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('created_from') || '')
  const [dateTo, setDateTo] = useState<string>(searchParams.get('created_to') || '')

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('filter', filter)
    params.delete('page')
    router.push(`/tickets?${params.toString()}`)
  }

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams)
    if (status === 'all') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    params.delete('page')
    router.push(`/tickets?${params.toString()}`)
  }

  const handleClearSearch = () => {
    setSearchValue('')
    setDebouncedSearch('')
    const params = new URLSearchParams(searchParams)
    params.delete('search')
    params.delete('page')
    router.push(`/tickets?${params.toString()}`)
  }

  const handleTagToggle = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId]

    const params = new URLSearchParams(searchParams)
    params.set('page', '1')

    if (newSelectedTags.length > 0) {
      params.set('tags', newSelectedTags.join(','))
    } else {
      params.delete('tags')
    }

    router.push(`/tickets?${params.toString()}`)
  }

  const handleDatePresetChange = (preset: 'today' | 'week' | 'month' | 'custom') => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')

    if (preset === 'custom') {
      setDatePreset('custom')
      setShowCustomRange(true)
      params.set('date_preset', 'custom')
    } else {
      setDatePreset(preset)
      setShowCustomRange(false)
      params.set('date_preset', preset)

      // Calculate date range based on preset
      const now = new Date()
      let from: Date, to: Date

      switch (preset) {
        case 'today':
          from = startOfDay(now)
          to = endOfDay(now)
          break
        case 'week':
          from = startOfWeek(now, { weekStartsOn: 1 }) // Monday
          to = endOfWeek(now, { weekStartsOn: 1 })
          break
        case 'month':
          from = startOfMonth(now)
          to = endOfMonth(now)
          break
      }

      const fromStr = format(from, 'yyyy-MM-dd')
      const toStr = format(to, 'yyyy-MM-dd')

      params.set('created_from', fromStr)
      params.set('created_to', toStr)

      setDateFrom(fromStr)
      setDateTo(toStr)
    }

    router.push(`/tickets?${params.toString()}`)
  }

  const handleCustomDateChange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)

    const params = new URLSearchParams(searchParams)
    params.set('page', '1')
    params.set('date_preset', 'custom')

    if (from) params.set('created_from', from)
    else params.delete('created_from')

    if (to) params.set('created_to', to)
    else params.delete('created_to')

    router.push(`/tickets?${params.toString()}`)
  }

  const handleClearDateFilter = () => {
    setDatePreset('')
    setDateFrom('')
    setDateTo('')
    setShowCustomRange(false)

    const params = new URLSearchParams(searchParams)
    params.delete('date_preset')
    params.delete('created_from')
    params.delete('created_to')
    params.set('page', '1')

    router.push(`/tickets?${params.toString()}`)
  }

  // Fetch available tags on mount
  useEffect(() => {
    getTags().then(response => {
      if (response.success && response.data) {
        setAvailableTags(response.data)
      }
    })
  }, [])

  // Parse selected tags from URL
  useEffect(() => {
    const tagsParam = searchParams.get('tags')
    setSelectedTags(tagsParam ? tagsParam.split(',') : [])
  }, [searchParams])

  // Parse date filters from URL and show custom range if needed
  useEffect(() => {
    const preset = searchParams.get('date_preset')
    const from = searchParams.get('created_from')
    const to = searchParams.get('created_to')

    if (preset === 'custom' && (from || to)) {
      setShowCustomRange(true)
    }
  }, [searchParams])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue])

  // Update URL when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
      params.delete('page') // Reset to page 1 on search
    } else {
      params.delete('search')
    }
    router.push(`/tickets?${params.toString()}`)
  }, [debouncedSearch])

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Tickets durchsuchen (Betreff, Beschreibung, E-Mail, Nummer)..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
      <Tabs value={currentFilter} onValueChange={handleFilterChange}>
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="assigned">Mir zugewiesen</TabsTrigger>
          {isManagerOrAdmin && (
            <TabsTrigger value="spam">Spam</TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <Select value={currentStatus || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Status filtern" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Status</SelectItem>
          <SelectItem value="open">Offen</SelectItem>
          <SelectItem value="in_progress">In Bearbeitung</SelectItem>
          <SelectItem value="resolved">Gelöst</SelectItem>
          <SelectItem value="closed">Geschlossen</SelectItem>
        </SelectContent>
      </Select>
      </div>

      {/* Date Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium">Erstelldatum</label>
          {(datePreset || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearDateFilter}
              className="h-6 px-2 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Zurücksetzen
            </Button>
          )}
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={datePreset === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleDatePresetChange('today')}
          >
            Heute
          </Button>
          <Button
            variant={datePreset === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleDatePresetChange('week')}
          >
            Diese Woche
          </Button>
          <Button
            variant={datePreset === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleDatePresetChange('month')}
          >
          Dieser Monat
          </Button>
          <Button
            variant={datePreset === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (showCustomRange) {
                setShowCustomRange(false)
                handleClearDateFilter()
              } else {
                handleDatePresetChange('custom')
              }
            }}
          >
            Benutzerdefiniert
          </Button>
        </div>

        {/* Custom Date Range */}
        {showCustomRange && (
          <div className="flex flex-col sm:flex-row gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Von</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => handleCustomDateChange(e.target.value, dateTo)}
                max={dateTo || undefined}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-center text-muted-foreground mt-5">
              bis
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Bis</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleCustomDateChange(dateFrom, e.target.value)}
                min={dateFrom || undefined}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Nach Tags filtern</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                  className={cn(
                    "transition-all cursor-pointer",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <TagPill tag={tag} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
