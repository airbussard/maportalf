'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function TicketFilters({
  currentFilter,
  currentStatus,
  isManagerOrAdmin
}: {
  currentFilter: string
  currentStatus?: string
  isManagerOrAdmin: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
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
  )
}
