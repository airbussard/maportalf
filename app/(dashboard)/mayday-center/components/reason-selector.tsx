'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Wrench, Stethoscope, HelpCircle } from 'lucide-react'

export type MaydayReason = 'technical_issue' | 'staff_illness' | 'other'

export const MAYDAY_REASONS = {
  technical_issue: {
    label: 'Technische Probleme',
    icon: Wrench,
    emailText: 'Aufgrund eines technischen Problems',
    smsText: 'wegen techn. Probleme'
  },
  staff_illness: {
    label: 'Krankheitsfall',
    icon: Stethoscope,
    emailText: 'Aufgrund eines kurzfristigen Krankheitsfalls',
    smsText: 'wegen Krankheit'
  },
  other: {
    label: 'Sonstiges',
    icon: HelpCircle,
    emailText: 'Aus organisatorischen Gründen',
    smsText: 'aus org. Gründen'
  }
} as const

interface ReasonSelectorProps {
  value: MaydayReason
  onChange: (value: MaydayReason) => void
  note: string
  onNoteChange: (note: string) => void
  showNote?: boolean
}

export function ReasonSelector({
  value,
  onChange,
  note,
  onNoteChange,
  showNote = true
}: ReasonSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Grund</Label>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as MaydayReason)}
          className="grid gap-2"
        >
          {(Object.entries(MAYDAY_REASONS) as [MaydayReason, typeof MAYDAY_REASONS[MaydayReason]][]).map(
            ([key, reason]) => {
              const Icon = reason.icon
              return (
                <div key={key} className="flex items-center space-x-3">
                  <RadioGroupItem value={key} id={`reason-${key}`} />
                  <Label
                    htmlFor={`reason-${key}`}
                    className="flex items-center gap-2 cursor-pointer font-normal"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {reason.label}
                  </Label>
                </div>
              )
            }
          )}
        </RadioGroup>
      </div>

      {showNote && value === 'other' && (
        <div className="space-y-2">
          <Label htmlFor="reason-note">Begründung (optional)</Label>
          <Textarea
            id="reason-note"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Zusätzliche Informationen..."
            rows={2}
          />
        </div>
      )}
    </div>
  )
}
