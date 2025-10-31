/**
 * Requests Content Component (Client-side)
 *
 * Handles tab navigation between Work Requests and Calendar
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, List, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { RequestListView } from './components/request-list-view'
import { CalendarView } from '@/app/(dashboard)/kalender/components/calendar-view'
import { CreateRequestDialog } from './components/create-request-dialog'
import { EditRequestDialog } from './components/edit-request-dialog'
import { withdrawWorkRequest } from '@/app/actions/work-requests'
import type { WorkRequest } from '@/lib/types/work-requests'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_type?: 'booking' | 'fi_assignment' | 'blocker'
  customer_first_name: string
  customer_last_name: string
  customer_phone: string | null
  customer_email: string | null
  start_time: string
  end_time: string
  duration: number
  location: string
  status: string
  sync_status: string
  google_event_id: string | null
  assigned_instructor_name?: string
  assigned_instructor_number?: string
  assigned_instructor_id?: string
  is_all_day?: boolean
  actual_work_start_time?: string
  actual_work_end_time?: string
}

interface RequestsContentProps {
  requests: WorkRequest[]
  calendarEvents: CalendarEvent[]
  userId: string
  userName: string
}

// Dummy sync action for calendar (not used in read-only mode)
async function dummySyncAction() {
  'use server'
}

export function RequestsContent({ requests, calendarEvents, userId, userName }: RequestsContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'requests' | 'calendar'>('requests')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<WorkRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Handle edit request
  const handleEdit = (request: WorkRequest) => {
    setSelectedRequest(request)
    setEditDialogOpen(true)
  }

  // Handle withdraw request
  const handleWithdraw = async (request: WorkRequest) => {
    if (!confirm('Möchten Sie diesen Request wirklich zurückziehen?')) {
      return
    }

    setIsLoading(true)
    try {
      await withdrawWorkRequest(request.id)
      toast.success('Request zurückgezogen')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'requests' | 'calendar')}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Meine Requests</span>
              <span className="sm:hidden">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Kalender
            </TabsTrigger>
          </TabsList>

          {/* Show Create button only on requests tab */}
          {activeTab === 'requests' && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Neuer Request</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          )}
        </div>

        <TabsContent value="requests" className="mt-6">
          <RequestListView
            requests={requests}
            userId={userId}
            onEdit={handleEdit}
            onWithdraw={handleWithdraw}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarView
            events={calendarEvents}
            lastSync={null}
            userName={userName}
            syncAction={dummySyncAction}
            isReadOnly={true}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        request={selectedRequest}
      />
    </div>
  )
}
