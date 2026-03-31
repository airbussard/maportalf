'use client'

import { User, Mail, Phone, Building2, Shield } from 'lucide-react'

interface Profile {
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  department?: string
  role: string
  avatar_url?: string
}

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  employee: 'Mitarbeiter',
}

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  employee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export function ProfileCard({ profile }: { profile: Profile }) {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Kein Name'
  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map(n => n!.charAt(0).toUpperCase())
    .join('') || '?'

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      <h2 className="border-b border-border px-4 py-4 text-base font-medium text-foreground sm:px-6 xl:px-7.5">
        Ihr Profil
      </h2>
      <div className="p-4 sm:p-6 xl:p-7.5">
        {/* Avatar and name */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#fbb928]/15 text-[#fbb928] text-3xl font-bold">
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-card bg-[#fbb928] text-zinc-900">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{fullName}</h3>
          <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${roleBadgeColors[profile.role] || roleBadgeColors.employee}`}>
            <Shield className="w-3 h-3" />
            {roleLabels[profile.role] || profile.role}
          </span>
        </div>

        {/* Info list */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate">{profile.email}</span>
          </div>

          {profile.phone && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{profile.phone}</span>
            </div>
          )}

          {profile.department && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{profile.department}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
