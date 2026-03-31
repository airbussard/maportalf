import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumb } from '@/components/nextadmin'
import { ProfileSection } from './components/profile-section'
import { ThemeSection } from './components/theme-section'
import { SignatureSection } from './components/signature-section'
import { PasswordSection } from './components/password-section'
import { NotificationSection } from './components/notification-section'
import { NotificationPreferencesSection } from './components/notification-preferences-section'
import { ProfileCard } from './components/profile-card'

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
    <div className="mx-auto w-full max-w-[1080px]">
      <Breadcrumb pageName="Einstellungen" />

      <div className="grid grid-cols-5 gap-8">
        {/* Left column - 3/5 */}
        <div className="col-span-5 xl:col-span-3 space-y-8">
          <ProfileSection profile={profile} />
          <PasswordSection />
          <NotificationSection
            role={profile.role}
            receiveRequestEmails={profile.receive_request_emails || false}
          />
          <NotificationPreferencesSection
            role={profile.role}
            notificationSettings={profile.notification_settings || {
              new_ticket: true,
              work_request: true,
              ticket_assignment: true
            }}
          />
        </div>

        {/* Right column - 2/5 */}
        <div className="col-span-5 xl:col-span-2 space-y-8">
          <ProfileCard profile={profile} />
          <ThemeSection currentTheme={profile.theme_preference || 'system'} />
          <SignatureSection
            emailSignature={profile.email_signature || ''}
            useCustomSignature={profile.use_custom_signature || false}
            profile={profile}
          />
        </div>
      </div>
    </div>
  )
}
