/**
 * MAYDAY Center Constants
 * Shared between client components and server actions
 */

export type MaydayReason = 'technical_issue' | 'staff_illness' | 'other'

export const MAYDAY_REASONS: Record<MaydayReason, {
  label: string
  emailText: string
  smsText: string
}> = {
  technical_issue: {
    label: 'Technische Probleme',
    emailText: 'Aufgrund eines technischen Problems',
    smsText: 'wegen techn. Probleme'
  },
  staff_illness: {
    label: 'Krankheitsfall',
    emailText: 'Aufgrund eines kurzfristigen Krankheitsfalls',
    smsText: 'wegen Krankheit'
  },
  other: {
    label: 'Sonstiges',
    emailText: 'Aus organisatorischen Gründen',
    smsText: 'aus org. Gründen'
  }
}

// SMS-specific reason texts (shorter versions)
export const MAYDAY_SMS_REASONS: Record<MaydayReason, string> = {
  technical_issue: 'wegen techn. Probleme',
  staff_illness: 'wegen Krankheit',
  other: 'aus org. Gründen'
}
