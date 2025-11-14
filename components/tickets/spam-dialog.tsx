'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface SpamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (blockEmail: boolean) => void
  ticketEmail?: string | null
  ticketSubject: string
}

export function SpamDialog({
  open,
  onOpenChange,
  onConfirm,
  ticketEmail,
  ticketSubject,
}: SpamDialogProps) {
  const [blockEmail, setBlockEmail] = useState(false)

  const handleConfirm = () => {
    onConfirm(blockEmail)
    setBlockEmail(false) // Reset for next time
  }

  const handleCancel = () => {
    setBlockEmail(false)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ticket als Spam markieren?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div>
              Möchten Sie dieses Ticket wirklich als Spam markieren?
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">Betreff:</p>
              <p className="text-sm text-muted-foreground">{ticketSubject}</p>
              {ticketEmail && (
                <>
                  <p className="text-sm font-medium text-foreground mt-2 mb-1">Von:</p>
                  <p className="text-sm text-muted-foreground">{ticketEmail}</p>
                </>
              )}
            </div>
            {ticketEmail && (
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="block-email"
                  checked={blockEmail}
                  onCheckedChange={(checked) => setBlockEmail(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="block-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    E-Mail-Adresse blockieren
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Künftige E-Mails von dieser Adresse werden automatisch als Spam markiert
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-2">
              Das Ticket wird geschlossen und kann im Spam-Filter eingesehen werden.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Als Spam markieren
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
