'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, User, Mail, Phone, Calendar, ChevronRight, ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Contact } from '@/app/actions/contacts'

interface ContactsTableProps {
  contacts: Contact[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  currentSearch: string
}

export function ContactsTable({
  contacts,
  totalCount,
  page,
  pageSize,
  totalPages,
  currentSearch
}: ContactsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(currentSearch)

  // Update URL with new parameters
  const updateUrl = useCallback((newParams: { search?: string; page?: number; pageSize?: number }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (newParams.search !== undefined) {
      if (newParams.search) {
        params.set('search', newParams.search)
      } else {
        params.delete('search')
      }
      // Reset to page 1 on new search
      params.set('page', '1')
    }

    if (newParams.page !== undefined) {
      params.set('page', String(newParams.page))
    }

    if (newParams.pageSize !== undefined) {
      params.set('pageSize', String(newParams.pageSize))
      // Reset to page 1 on page size change
      params.set('page', '1')
    }

    router.push(`/kontaktbuch?${params.toString()}`)
  }, [router, searchParams])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrl({ search: searchInput })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput, currentSearch, updateUrl])

  const handleContactClick = (email: string) => {
    router.push(`/kontaktbuch/${encodeURIComponent(email)}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrl({ page: newPage })
    }
  }

  const handlePageSizeChange = (newSize: string) => {
    updateUrl({ pageSize: parseInt(newSize, 10) })
  }

  // Calculate display range
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalCount)

  return (
    <div className="space-y-4">
      {/* Search and Page Size Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Nach Name, Email oder Telefon suchen..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Zeige:</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">pro Seite</span>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {totalCount === 0 ? (
          'Keine Kontakte gefunden'
        ) : (
          `${startItem}–${endItem} von ${totalCount} Kontakten`
        )}
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Keine Kontakte gefunden</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card
              key={contact.email}
              className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
              onClick={() => handleContactClick(contact.email)}
            >
              {/* Mobile Layout */}
              <div className="sm:hidden space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{contact.event_count} Termine</span>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    {contact.event_count} Termine
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Letzter: {format(new Date(contact.last_event), 'dd.MM.yyyy', { locale: de })}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </Button>
          <span className="text-sm text-muted-foreground">
            Seite {page} von {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="gap-1"
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
