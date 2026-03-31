/**
 * Request List View Component
 *
 * Displays work requests as NextAdmin chat-list style items with filtering and sorting
 */

'use client'

import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
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
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-7.5 pt-7.5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Meine Requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredRequests.length} von {requests.length} Requests
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkRequestStatus | 'all')}
            className="rounded-lg border-[1.5px] border-border bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-[#fbb928] dark:border-dark-3 dark:bg-dark-2"
          >
            <option value="all">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="approved">Genehmigt</option>
            <option value="rejected">Abgelehnt</option>
            <option value="withdrawn">Zuruckgezogen</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border-[1.5px] border-border bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-[#fbb928] dark:border-dark-3 dark:bg-dark-2"
          >
            <option value="date-desc">Neueste zuerst</option>
            <option value="date-asc">Alteste zuerst</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* List items */}
      <div className="border-t border-border">
        {filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="size-10 mb-3 opacity-40" />
            <p>
              {statusFilter === 'all'
                ? 'Keine Requests vorhanden'
                : 'Keine Requests mit diesem Status'}
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              userId={userId}
              onEdit={onEdit}
              onWithdraw={onWithdraw}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
