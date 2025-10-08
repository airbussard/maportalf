import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSection } from './components/profile-section'
import { ThemeSection } from './components/theme-section'
import { SignatureSection } from './components/signature-section'
import { PasswordSection } from './components/password-section'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Load profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return <div>Profil nicht gefunden</div>
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie Ihre persönlichen Daten und Einstellungen
        </p>
      </div>

      <div className="space-y-6">
        <ProfileSection profile={profile} />
        <ThemeSection currentTheme={profile.theme_preference || 'system'} />
        <SignatureSection
          emailSignature={profile.email_signature || ''}
          useCustomSignature={profile.use_custom_signature || false}
          profile={profile}
        />
        <PasswordSection />
      </div>
    </div>
  )
}
