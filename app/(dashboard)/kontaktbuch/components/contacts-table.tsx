'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, User, Eye, ChevronRight, ChevronLeft, Phone } from 'lucide-react'
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

  const getInitials = (contact: Contact) => {
    const first = contact.first_name?.[0]?.toUpperCase() || ''
    const last = contact.last_name?.[0]?.toUpperCase() || ''
    if (first || last) return `${first}${last}`
    return contact.email[0]?.toUpperCase() || '?'
  }

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-7.5 pt-7.5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Kontakte</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount === 0
              ? 'Keine Kontakte gefunden'
              : `${startItem}\u2013${endItem} von ${totalCount} Kontakten`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative">
            <input
              type="search"
              placeholder="Nach Name, Email oder Telefon suchen..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full min-w-[240px] rounded-full border border-border bg-accent/30 py-2.5 pl-12 pr-5 text-sm outline-none transition focus:border-[#fbb928] dark:border-dark-3 dark:bg-dark-2"
            />
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Page size selector */}
          <select
            value={String(pageSize)}
            onChange={(e) => handlePageSizeChange(e.target.value)}
            className="rounded-lg border-[1.5px] border-border bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-[#fbb928] dark:border-dark-3 dark:bg-dark-2"
          >
            <option value="10">10 pro Seite</option>
            <option value="25">25 pro Seite</option>
            <option value="50">50 pro Seite</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-border bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-sm [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
              <th className="pl-7.5 text-left min-w-[250px]">Kontakt</th>
              <th className="text-left min-w-[140px]">Telefon</th>
              <th className="text-left min-w-[120px]">Buchungen</th>
              <th className="text-left min-w-[140px]">Letzte Buchung</th>
              <th className="pr-7.5 text-right min-w-[80px]">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Keine Kontakte gefunden</p>
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.email}
                  onClick={() => handleContactClick(contact.email)}
                  className="border-b border-border transition-colors hover:bg-accent/30 cursor-pointer"
                >
                  {/* Avatar + Name + Email */}
                  <td className="py-4 pl-7.5">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbb928] text-sm font-bold text-zinc-900">
                        {getInitials(contact)}
                      </div>
                      <div>
                        <h5 className="font-medium text-foreground leading-tight">
                          {contact.first_name} {contact.last_name}
                        </h5>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {contact.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-4 text-sm text-muted-foreground">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm text-[#3C50E0] hover:text-[#3C50E0]/80 transition-colors"
                        title={`${contact.phone} anrufen`}
                      >
                        <Phone className="size-3.5" />
                        {contact.phone}
                      </a>
                    ) : '\u2013'}
                  </td>

                  {/* Booking count as pill badge */}
                  <td className="py-4">
                    <span className="inline-flex items-center rounded-full bg-[#3C50E0]/[0.08] px-3 py-1 text-xs font-medium text-[#3C50E0] dark:bg-[#3C50E0]/[0.15] dark:text-[#6B8AFF]">
                      {contact.event_count} Termine
                    </span>
                  </td>

                  {/* Last booking date */}
                  <td className="py-4 text-sm text-muted-foreground">
                    {format(new Date(contact.last_event), 'dd.MM.yyyy', { locale: de })}
                  </td>

                  {/* Actions */}
                  <td className="py-4 pr-7.5">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleContactClick(contact.email)
                        }}
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#fbb928]"
                        title="Details anzeigen"
                      >
                        <Eye className="size-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-7.5 py-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Seite {page} von {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
              Zuruck
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Weiter
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
