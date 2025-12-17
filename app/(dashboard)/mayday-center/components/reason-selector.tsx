'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Wrench, Stethoscope, HelpCircle, LucideIcon } from 'lucide-react'
import { MAYDAY_REASONS, type MaydayReason } from '@/lib/mayday-constants'

// Re-export for backwards compatibility
export { MAYDAY_REASONS, type MaydayReason } from '@/lib/mayday-constants'

// Icons are defined separately since they can't be in the shared constants file
const REASON_ICONS: Record<MaydayReason, LucideIcon> = {
  technical_issue: Wrench,
  staff_illness: Stethoscope,
  other: HelpCircle
}

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
          {(Object.keys(MAYDAY_REASONS) as MaydayReason[]).map((key) => {
              const reason = MAYDAY_REASONS[key]
              const Icon = REASON_ICONS[key]
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
