import { BookUser } from 'lucide-react'
import { getContacts } from '@/app/actions/contacts'
import { ContactsTable } from './components/contacts-table'

export const metadata = {
  title: 'Kontaktbuch | Flighthour',
  description: 'Kundenkontakte verwalten'
}

interface KontaktbuchPageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    search?: string
  }>
}

export default async function KontaktbuchPage({ searchParams }: KontaktbuchPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const pageSize = parseInt(params.pageSize || '25', 10) as 10 | 25 | 50
  const search = params.search || ''

  const result = await getContacts({ search, page, pageSize })

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

      <ContactsTable
        contacts={result.contacts}
        totalCount={result.totalCount}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        currentSearch={search}
      />
    </div>
  )
}
