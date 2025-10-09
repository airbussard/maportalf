import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default async function KategorienPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/zeiterfassung')
  }

  // Fetch all categories
  const { data: categories } = await supabase
    .from('time_categories')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kategorien-Verwaltung</h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie Zeiterfassungs-Kategorien
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/zeiterfassung/verwaltung">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Verwaltung
          </Link>
        </Button>
      </div>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Kategorien</CardTitle>
        </CardHeader>
        <CardContent>
          {categories && categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <div className="font-semibold">{category.name}</div>
                      {category.description && (
                        <div className="text-sm text-muted-foreground">
                          {category.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {category.is_active ? (
                      <span className="text-sm text-green-600 dark:text-green-400">Aktiv</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Inaktiv</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Keine Kategorien vorhanden</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
