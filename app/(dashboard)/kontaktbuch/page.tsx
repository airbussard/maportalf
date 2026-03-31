import { getContacts } from '@/app/actions/contacts'
import { ContactsTable } from './components/contacts-table'
import { Breadcrumb } from '@/components/nextadmin'

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
      <Breadcrumb pageName="Kontaktbuch" />

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
