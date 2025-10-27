/**
 * Management Content Component (Client-side)
 *
 * Handles filtering, tabs, dialogs, and user interactions for request management
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, CheckCircle, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { StatsCards } from './components/stats-cards'
import { RequestsTable } from './components/requests-table'
import { ApprovalDialog } from './components/approval-dialog'
import { RejectionDialog } from './components/rejection-dialog'
import { DirectCreateDialog } from './components/direct-create-dialog'
import { deleteWorkRequest, approveWorkRequest } from '@/app/actions/work-requests'
import type { WorkRequestWithRelations, WorkRequestStats } from '@/lib/types/work-requests'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface ManageContentProps {
  requests: WorkRequestWithRelations[]
  stats: WorkRequestStats
  employees: Employee[]
  isAdmin: boolean
  userId: string
}

export function ManageContent({
  requests,
  stats,
  employees,
  isAdmin,
  userId
}: ManageContentProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Tab state
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending')

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)

  // Dialog state
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false)
  const [directCreateDialogOpen, setDirectCreateDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<WorkRequestWithRelations | null>(null)

  // Selection state (for batch actions)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Detect conflicts: count approved requests per date
  const conflictDates = useMemo(() => {
    const dateMap = new Map<string, WorkRequestWithRelations[]>()

    requests
      .filter(r => r.status === 'approved')
      .forEach(request => {
        const existing = dateMap.get(request.request_date) || []
        dateMap.set(request.request_date, [...existing, request])
      })

    // Only keep dates with multiple employees
    const conflicts = new Map<string, WorkRequestWithRelations[]>()
    dateMap.forEach((reqs, date) => {
      if (reqs.length > 1) {
        conflicts.set(date, reqs)
      }
    })

    return conflicts
  }, [requests])

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    let result = requests

    // Tab filter
    if (activeTab === 'pending') {
      result = result.filter(r => r.status === 'pending')
    } else if (activeTab === 'approved') {
      result = result.filter(r => r.status !== 'pending')
    }

    // Employee filter
    if (selectedEmployee !== 'all') {
      result = result.filter(r => r.employee_id === selectedEmployee)
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(r => {
        const employeeName = r.employee
          ? `${r.employee.first_name} ${r.employee.last_name}`.toLowerCase()
          : ''
        const reason = (r.reason || '').toLowerCase()
        return employeeName.includes(term) || reason.includes(term)
      })
    }

    // Conflict filter
    if (showConflictsOnly) {
      result = result.filter(r => conflictDates.has(r.request_date))
    }

    return result
  }, [requests, activeTab, selectedEmployee, searchTerm, showConflictsOnly, conflictDates])

  // Handle approval
  const handleApprove = (request: WorkRequestWithRelations) => {
    setSelectedRequest(request)
    setApprovalDialogOpen(true)
  }

  // Handle rejection
  const handleReject = (request: WorkRequestWithRelations) => {
    setSelectedRequest(request)
    setRejectionDialogOpen(true)
  }

  // Handle view details
  const handleViewDetails = (request: WorkRequestWithRelations) => {
    setSelectedRequest(request)
    setDetailsDialogOpen(true)
  }

  // Handle delete (admin only)
  const handleDelete = async (request: WorkRequestWithRelations) => {
    if (!isAdmin) return

    if (!confirm(`Request von ${request.employee?.first_name} ${request.employee?.last_name} wirklich löschen?`)) {
      return
    }

    try {
      await deleteWorkRequest(request.id)
      toast({
        title: 'Request gelöscht',
        description: 'Der Request wurde erfolgreich gelöscht.'
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive'
      })
    }
  }

  // Handle batch approve
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return

    if (!confirm(`${selectedIds.length} Request(s) genehmigen?`)) {
      return
    }

    try {
      // Approve all selected requests in parallel
      await Promise.all(
        selectedIds.map(id => approveWorkRequest(id))
      )

      toast({
        title: 'Requests genehmigt',
        description: `${selectedIds.length} Request(s) wurden genehmigt.`
      })

      setSelectedIds([])
      router.refresh()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Einige Requests konnten nicht genehmigt werden.',
        variant: 'destructive'
      })
    }
  }

  // Handle batch delete (admin only)
  const handleBatchDelete = async () => {
    if (!isAdmin || selectedIds.length === 0) return

    if (!confirm(`${selectedIds.length} Request(s) wirklich löschen?`)) {
      return
    }

    try {
      await Promise.all(
        selectedIds.map(id => deleteWorkRequest(id))
      )

      toast({
        title: 'Requests gelöscht',
        description: `${selectedIds.length} Request(s) wurden gelöscht.`
      })

      setSelectedIds([])
      router.refresh()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Einige Requests konnten nicht gelöscht werden.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requests verwalten</h1>
          <p className="text-muted-foreground">
            Genehmige und verwalte Work Requests
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDirectCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Direkt erstellen
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mitarbeiter oder Grund suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={selectedEmployee}
          onValueChange={setSelectedEmployee}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Mitarbeiter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Mitarbeiter</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Conflict Filter */}
        {conflictDates.size > 0 && (
          <div className="flex items-center space-x-2 px-3 py-2 border rounded-md">
            <Checkbox
              id="conflicts-only"
              checked={showConflictsOnly}
              onCheckedChange={(checked) => setShowConflictsOnly(checked === true)}
            />
            <Label
              htmlFor="conflicts-only"
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Nur Konflikte ({conflictDates.size})
            </Label>
          </div>
        )}

        {(searchTerm || selectedEmployee !== 'all' || showConflictsOnly) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setSelectedEmployee('all')
              setShowConflictsOnly(false)
            }}
          >
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {/* Batch Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} ausgewählt
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={handleBatchApprove}
            disabled={!filteredRequests.some(r => selectedIds.includes(r.id) && r.status === 'pending')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Alle genehmigen
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Alle löschen
            </Button>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="pending">
            Ausstehend ({requests.filter(r => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Bearbeitet ({requests.filter(r => r.status !== 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Alle ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <RequestsTable
            requests={filteredRequests}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={handleViewDetails}
            onDelete={isAdmin ? handleDelete : undefined}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isAdmin={isAdmin}
            conflictDates={conflictDates}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        request={selectedRequest}
      />

      <RejectionDialog
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
        request={selectedRequest}
      />

      {isAdmin && (
        <DirectCreateDialog
          open={directCreateDialogOpen}
          onOpenChange={setDirectCreateDialogOpen}
          employees={employees}
        />
      )}

      {/* Details Dialog (reuse Approval Dialog structure, just view-only) */}
      {/* TODO: Could create a separate ViewDetailsDialog if needed */}
    </div>
  )
}
