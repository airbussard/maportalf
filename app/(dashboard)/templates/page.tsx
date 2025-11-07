import { getTemplatesByCategory } from '@/app/actions/templates'
import { createClient } from '@/lib/supabase/server'
import { TemplateFormDialog } from './components/template-form-dialog'
import { TemplateCard } from './components/template-card'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Check if user is manager or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

  if (!isManagerOrAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Keine Berechtigung</h1>
          <p className="text-muted-foreground">
            Nur Manager und Administratoren können Vorlagen verwalten.
          </p>
        </div>
      </div>
    )
  }

  const result = await getTemplatesByCategory()

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Antwort-Vorlagen</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie wiederverwendbare Textvorlagen mit Anhängen
          </p>
        </div>
        <TemplateFormDialog mode="create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Neue Vorlage
          </Button>
        </TemplateFormDialog>
      </div>

      {/* Templates by Category */}
      {result.success && result.data.length > 0 ? (
        <div className="space-y-8">
          {result.data.map((group) => (
            <div key={group.category}>
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                {group.categoryLabel}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.templates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Noch keine Vorlagen vorhanden
          </p>
          <TemplateFormDialog mode="create">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Erste Vorlage erstellen
            </Button>
          </TemplateFormDialog>
        </div>
      )}
    </div>
  )
}
