/**
 * Requests Table Component
 *
 * Table view for managing all work requests
 * Features: Sorting, filtering, row selection, quick actions
 */

'use client'

import { useState, useMemo } from 'react'
import { Check, X, Eye, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { StatusBadge } from '../../components/status-badge'
import {
  type WorkRequestWithRelations,
  formatRequestDateShort,
  formatRequestTime,
  getEmployeeName
} from '@/lib/types/work-requests'

interface RequestsTableProps {
  requests: WorkRequestWithRelations[]
  onApprove: (request: WorkRequestWithRelations) => void
  onReject: (request: WorkRequestWithRelations) => void
  onViewDetails: (request: WorkRequestWithRelations) => void
  onDelete?: (request: WorkRequestWithRelations) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  isAdmin?: boolean
}

type SortField = 'date' | 'employee' | 'status'
type SortDirection = 'asc' | 'desc'

export function RequestsTable({
  requests,
  onApprove,
  onReject,
  onViewDetails,
  onDelete,
  selectedIds = [],
  onSelectionChange,
  isAdmin = false
}: RequestsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Sort requests
  const sortedRequests = useMemo(() => {
    const sorted = [...requests]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = new Date(a.request_date).getTime() - new Date(b.request_date).getTime()
          break
        case 'employee':
          comparison = getEmployeeName(a).localeCompare(getEmployeeName(b))
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [requests, sortField, sortDirection])

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Selection handlers
  const isSelected = (id: string) => selectedIds.includes(id)

  const toggleSelection = (id: string) => {
    if (!onSelectionChange) return

    if (isSelected(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const toggleAll = () => {
    if (!onSelectionChange) return

    if (selectedIds.length === sortedRequests.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(sortedRequests.map(r => r.id))
    }
  }

  const allSelected = sortedRequests.length > 0 && selectedIds.length === sortedRequests.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Requests</CardTitle>
            <CardDescription>
              {sortedRequests.length} Request{sortedRequests.length !== 1 ? 's' : ''}
              {selectedIds.length > 0 && ` (${selectedIds.length} ausgewählt)`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine Requests gefunden
          </div>
        ) : (
          <div className="space-y-2">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="min-w-full">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 pb-3 border-b font-medium text-sm">
                  {onSelectionChange && (
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4"
                      />
                    </div>
                  )}
                  <div
                    className="col-span-2 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('employee')}
                  >
                    Mitarbeiter {sortField === 'employee' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                  <div
                    className="col-span-2 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('date')}
                  >
                    Datum {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                  <div className="col-span-2">Zeit</div>
                  <div
                    className="col-span-1 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                  <div className="col-span-3">Grund</div>
                  <div className="col-span-1 text-right">Aktionen</div>
                </div>

                {/* Rows */}
                {sortedRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`grid grid-cols-12 gap-4 py-3 border-b items-center text-sm hover:bg-muted/50 ${
                      isSelected(request.id) ? 'bg-muted' : ''
                    }`}
                  >
                    {onSelectionChange && (
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={isSelected(request.id)}
                          onChange={() => toggleSelection(request.id)}
                          className="h-4 w-4"
                        />
                      </div>
                    )}
                    <div className="col-span-2 font-medium">
                      {getEmployeeName(request)}
                    </div>
                    <div className="col-span-2">
                      {formatRequestDateShort(request.request_date)}
                    </div>
                    <div className="col-span-2 text-muted-foreground">
                      {formatRequestTime(request)}
                    </div>
                    <div className="col-span-1">
                      <StatusBadge status={request.status} />
                    </div>
                    <div className="col-span-3 text-muted-foreground truncate">
                      {request.reason || '-'}
                    </div>
                    <div className="col-span-1 flex justify-end gap-1">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onApprove(request)}
                            className="h-8 w-8 p-0"
                            title="Genehmigen"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReject(request)}
                            className="h-8 w-8 p-0"
                            title="Ablehnen"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(request)}
                        className="h-8 w-8 p-0"
                        title="Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && onDelete && request.status !== 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(request)}
                          className="h-8 w-8 p-0"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {sortedRequests.map((request) => (
                <Card key={request.id} className={isSelected(request.id) ? 'bg-muted' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {onSelectionChange && (
                          <input
                            type="checkbox"
                            checked={isSelected(request.id)}
                            onChange={() => toggleSelection(request.id)}
                            className="h-4 w-4"
                          />
                        )}
                        <div>
                          <div className="font-medium">{getEmployeeName(request)}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatRequestDateShort(request.request_date)}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>

                    <div className="space-y-1 text-sm mb-3">
                      <div className="text-muted-foreground">
                        Zeit: {formatRequestTime(request)}
                      </div>
                      {request.reason && (
                        <div className="text-muted-foreground">
                          Grund: {request.reason}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove(request)}
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Genehmigen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(request)}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Ablehnen
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(request)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
