import { BookUser } from 'lucide-react'
import { getContacts } from '@/app/actions/contacts'
import { ContactsTable } from './components/contacts-table'

export const metadata = {
  title: 'Kontaktbuch | Flighthour',
  description: 'Kundenkontakte verwalten'
}

export default async function KontaktbuchPage() {
  const contacts = await getContacts()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookUser className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kontaktbuch</h1>
          <p className="text-muted-foreground">
            Alle Kundenkontakte auf einen Blick
          </p>
        </div>
      </div>

      <ContactsTable contacts={contacts} />
    </div>
  )
}
