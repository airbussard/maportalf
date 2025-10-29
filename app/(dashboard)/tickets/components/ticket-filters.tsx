'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

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
    </div>
  )
}
