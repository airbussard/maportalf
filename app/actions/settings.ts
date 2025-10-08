'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  first_name: string
  last_name: string
  phone?: string
  department?: string
  address?: string
  theme_preference?: string
}) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Filter out empty strings (except for theme_preference)
    const updateData: Record<string, any> = {}
    Object.keys(data).forEach(key => {
      const value = data[key as keyof typeof data]
      if (key === 'theme_preference' || (value && value.length > 0)) {
        updateData[key] = value
      }
    })

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (error) {
      console.error('Profile update error:', error)
      return { success: false, error: 'Fehler beim Speichern der Änderungen' }
    }

    revalidatePath('/einstellungen')
    return { success: true }
  } catch (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function updateSignature(data: {
  email_signature: string
  use_custom_signature: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)

    if (error) {
      console.error('Signature update error:', error)
      return { success: false, error: 'Fehler beim Speichern der Signatur' }
    }

    revalidatePath('/einstellungen')
    return { success: true }
  } catch (error) {
    console.error('Update signature error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function updatePassword(newPassword: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Password update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Update password error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}
