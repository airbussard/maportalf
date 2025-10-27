/**
 * Request List View Component
 *
 * Displays work requests in a grid/list layout with filtering and sorting
 */

'use client'

import { useState, useMemo } from 'react'
import { Filter, SortAsc } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RequestCard } from './request-card'
import { type WorkRequest, type WorkRequestStatus } from '@/lib/types/work-requests'

interface RequestListViewProps {
  requests: WorkRequest[]
  userId: string
  onEdit?: (request: WorkRequest) => void
  onWithdraw?: (request: WorkRequest) => void
  onDelete?: (request: WorkRequest) => void
}

type SortOption = 'date-desc' | 'date-asc' | 'status'

export function RequestListView({
  requests,
  userId,
  onEdit,
  onWithdraw,
  onDelete
}: RequestListViewProps) {
  const [statusFilter, setStatusFilter] = useState<WorkRequestStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')

  // Filter and sort requests
  const filteredRequests = useMemo(() => {
    let result = [...requests]

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.request_date).getTime() - new Date(a.request_date).getTime()
        case 'date-asc':
          return new Date(a.request_date).getTime() - new Date(b.request_date).getTime()
        case 'status':
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    return result
  }, [requests, statusFilter, sortBy])

  return (
    <div className="space-y-4">
      {/* Filters & Sorting */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as WorkRequestStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="pending">Ausstehend</SelectItem>
              <SelectItem value="approved">Genehmigt</SelectItem>
              <SelectItem value="rejected">Abgelehnt</SelectItem>
              <SelectItem value="withdrawn">Zurückgezogen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sortieren nach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Datum (neueste zuerst)</SelectItem>
              <SelectItem value="date-asc">Datum (älteste zuerst)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <div className="text-sm text-muted-foreground self-center">
          {filteredRequests.length} von {requests.length} Requests
        </div>
      </div>

      {/* Request Grid */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {statusFilter === 'all'
              ? 'Keine Requests vorhanden'
              : 'Keine Requests mit diesem Status'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              userId={userId}
              onEdit={onEdit}
              onWithdraw={onWithdraw}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
