'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, Mail, Phone, Calendar, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Contact } from '@/app/actions/contacts'

interface ContactsTableProps {
  contacts: Contact[]
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filteredContacts = contacts.filter(contact => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      contact.email.toLowerCase().includes(searchLower) ||
      contact.first_name.toLowerCase().includes(searchLower) ||
      contact.last_name.toLowerCase().includes(searchLower) ||
      (contact.phone && contact.phone.includes(search))
    )
  })

  const handleContactClick = (email: string) => {
    router.push(`/kontaktbuch/${encodeURIComponent(email)}`)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Nach Name, Email oder Telefon suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredContacts.length} von {contacts.length} Kontakten
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Keine Kontakte gefunden</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact) => (
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
    </div>
  )
}
