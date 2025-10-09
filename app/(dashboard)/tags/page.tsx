import { getTagsWithCounts, getBlacklist } from '@/app/actions/tags'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TagCard } from './components/tag-card'
import { TagFormDialog } from './components/tag-form-dialog'
import { BlacklistSection } from './components/blacklist-section'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function TagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is manager or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const tagsResult = await getTagsWithCounts()
  const blacklistResult = await getBlacklist()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tag-Verwaltung</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Tags für Tickets und E-Mail-Routing
          </p>
        </div>
        <TagFormDialog>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Neues Tag
          </Button>
        </TagFormDialog>
      </div>

      {tagsResult.success && tagsResult.data.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">Noch keine Tags vorhanden</p>
          <TagFormDialog>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Erstes Tag erstellen
            </Button>
          </TagFormDialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {tagsResult.data.map((tag) => (
            <TagCard key={tag.id} tag={tag} />
          ))}
        </div>
      )}

      <BlacklistSection initialBlacklist={blacklistResult.data || []} />
    </div>
  )
}
