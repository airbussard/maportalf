/**
 * Requests Content Component (Client-side)
 *
 * Handles tab navigation, dialogs, and user interactions
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Download, List, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { RequestListView } from './components/request-list-view'
import { MyCalendarView } from './components/my-calendar-view'
import { CreateRequestDialog } from './components/create-request-dialog'
import { EditRequestDialog } from './components/edit-request-dialog'
import { withdrawWorkRequest } from '@/app/actions/work-requests'
import type { WorkRequest } from '@/lib/types/work-requests'

interface RequestsContentProps {
  requests: WorkRequest[]
  userId: string
  userName: string
}

export function RequestsContent({ requests, userId, userName }: RequestsContentProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('calendar')
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
      toast({
        title: 'Request zurückgezogen',
        description: 'Der Request wurde erfolgreich zurückgezogen.'
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle ICS export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/requests/export')
      if (!response.ok) throw new Error('Export fehlgeschlagen')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `work-requests-${new Date().toISOString().split('T')[0]}.ics`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export erfolgreich',
        description: 'Die Kalender-Datei wurde heruntergeladen.'
      })
    } catch (error) {
      toast({
        title: 'Fehler beim Export',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meine Requests</h1>
          <p className="text-muted-foreground">
            Verwalte deine Arbeitstags-Anfragen
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Request
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'calendar')}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Mein Kalender
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <RequestListView
            requests={requests}
            userId={userId}
            onEdit={handleEdit}
            onWithdraw={handleWithdraw}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <MyCalendarView
            userId={userId}
            userName={userName}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedRequest && (
        <EditRequestDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          request={selectedRequest}
        />
      )}
    </div>
  )
}
