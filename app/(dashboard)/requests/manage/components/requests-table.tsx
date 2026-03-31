/**
 * Requests Table Component
 *
 * Table view for managing all work requests
 * Features: Sorting, filtering, row selection, quick actions
 */

'use client'

import { useState, useMemo } from 'react'
import { Check, X, Eye, Trash2, AlertTriangle, ArrowUpDown } from 'lucide-react'
import { StatusBadge as NextAdminStatusBadge } from '@/components/nextadmin'
import {
  type WorkRequestWithRelations,
  type WorkRequestStatus,
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
  conflictDates?: Map<string, WorkRequestWithRelations[]>
}

type SortField = 'date' | 'employee' | 'status'
type SortDirection = 'asc' | 'desc'

const statusVariantMap: Record<WorkRequestStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  withdrawn: 'neutral',
}

const statusLabelMap: Record<WorkRequestStatus, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  withdrawn: 'Zuruckgezogen',
}

export function RequestsTable({
  requests,
  onApprove,
  onReject,
  onViewDetails,
  onDelete,
  selectedIds = [],
  onSelectionChange,
  isAdmin = false,
  conflictDates = new Map()
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

  // Helper to check if a request has conflicts
  const hasConflict = (request: WorkRequestWithRelations) => {
    return conflictDates.has(request.request_date)
  }

  // Get conflict info for a request
  const getConflictInfo = (request: WorkRequestWithRelations) => {
    if (!hasConflict(request)) return null

    const conflictingRequests = conflictDates.get(request.request_date) || []
    const otherEmployees = conflictingRequests
      .filter(r => r.id !== request.id)
      .map(r => getEmployeeName(r))

    return {
      count: conflictingRequests.length,
      employees: otherEmployees
    }
  }

  const getInitials = (request: WorkRequestWithRelations) => {
    if (!request.employee) return '?'
    const first = request.employee.first_name?.[0]?.toUpperCase() || ''
    const last = request.employee.last_name?.[0]?.toUpperCase() || ''
    if (first || last) return `${first}${last}`
    return request.employee.email?.[0]?.toUpperCase() || '?'
  }

  const formatCreatedDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('de-DE')
  }

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-7.5 pt-7.5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Anfragen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {sortedRequests.length} Request{sortedRequests.length !== 1 ? 's' : ''}
            {selectedIds.length > 0 && ` (${selectedIds.length} ausgewahlt)`}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-border bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-sm [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
              {onSelectionChange && (
                <th className="pl-7.5 w-[48px]">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="size-4 rounded border-border"
                  />
                </th>
              )}
              <th
                className={`${onSelectionChange ? '' : 'pl-7.5'} text-left min-w-[200px] cursor-pointer hover:text-foreground`}
                onClick={() => handleSort('employee')}
              >
                <span className="inline-flex items-center gap-1">
                  Mitarbeiter
                  {sortField === 'employee' && <ArrowUpDown className="size-3.5" />}
                </span>
              </th>
              <th
                className="text-left min-w-[130px] cursor-pointer hover:text-foreground"
                onClick={() => handleSort('date')}
              >
                <span className="inline-flex items-center gap-1">
                  Datum
                  {sortField === 'date' && <ArrowUpDown className="size-3.5" />}
                </span>
              </th>
              <th className="text-left min-w-[120px]">Schicht</th>
              <th
                className="text-left min-w-[120px] cursor-pointer hover:text-foreground"
                onClick={() => handleSort('status')}
              >
                <span className="inline-flex items-center gap-1">
                  Status
                  {sortField === 'status' && <ArrowUpDown className="size-3.5" />}
                </span>
              </th>
              <th className="text-left min-w-[110px]">Erstellt</th>
              <th className="pr-7.5 text-right min-w-[120px]">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {sortedRequests.length === 0 ? (
              <tr>
                <td colSpan={onSelectionChange ? 7 : 6} className="py-12 text-center text-muted-foreground">
                  Keine Requests gefunden
                </td>
              </tr>
            ) : (
              sortedRequests.map((request) => {
                const conflictInfo = getConflictInfo(request)

                return (
                  <tr
                    key={request.id}
                    className={`border-b border-border transition-colors hover:bg-accent/30 ${
                      isSelected(request.id) ? 'bg-accent/20' : ''
                    } ${hasConflict(request) ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}
                  >
                    {/* Checkbox */}
                    {onSelectionChange && (
                      <td className="py-4 pl-7.5 w-[48px]">
                        <input
                          type="checkbox"
                          checked={isSelected(request.id)}
                          onChange={() => toggleSelection(request.id)}
                          className="size-4 rounded border-border"
                        />
                      </td>
                    )}

                    {/* Employee avatar + name */}
                    <td className={`py-4 ${onSelectionChange ? '' : 'pl-7.5'}`}>
                      <div className="flex items-center gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbb928] text-sm font-bold text-zinc-900">
                          {getInitials(request)}
                        </div>
                        <h5 className="font-medium text-foreground leading-tight">
                          {getEmployeeName(request)}
                        </h5>
                      </div>
                    </td>

                    {/* Date + conflict indicator */}
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{formatRequestDateShort(request.request_date)}</span>
                        {conflictInfo && (
                          <div
                            className="flex items-center gap-1"
                            title={`Konflikt mit: ${conflictInfo.employees.join(', ')}`}
                          >
                            <AlertTriangle className="size-3.5 text-yellow-600" />
                            <span className="inline-flex items-center rounded-full bg-[#FFA70B]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#FFA70B]">
                              {conflictInfo.count}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Shift time */}
                    <td className="py-4 text-sm text-muted-foreground">
                      {formatRequestTime(request)}
                    </td>

                    {/* Status badge */}
                    <td className="py-4">
                      <NextAdminStatusBadge variant={statusVariantMap[request.status]}>
                        {statusLabelMap[request.status]}
                      </NextAdminStatusBadge>
                    </td>

                    {/* Created date */}
                    <td className="py-4 text-sm text-muted-foreground">
                      {formatCreatedDate(request.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 pr-7.5">
                      <div className="flex items-center justify-end gap-1">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onApprove(request)}
                              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#219653]/10 hover:text-[#219653]"
                              title="Genehmigen"
                            >
                              <Check className="size-[18px]" />
                            </button>
                            <button
                              onClick={() => onReject(request)}
                              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F23030]/10 hover:text-[#F23030]"
                              title="Ablehnen"
                            >
                              <X className="size-[18px]" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onViewDetails(request)}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#fbb928]"
                          title="Details"
                        >
                          <Eye className="size-[18px]" />
                        </button>
                        {isAdmin && onDelete && request.status !== 'pending' && (
                          <button
                            onClick={() => onDelete(request)}
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F23030]/10 hover:text-[#F23030]"
                            title="Loschen"
                          >
                            <Trash2 className="size-[18px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
