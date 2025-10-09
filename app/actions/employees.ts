'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface Employee {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  role: 'employee' | 'manager' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
}

// Get all employees (Manager/Admin only)
export async function getEmployees(): Promise<ActionResponse<Employee[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is manager or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

    if (!isManagerOrAdmin) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    // Use Admin Client to fetch all employees (bypasses RLS)
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error fetching employees:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Employee[] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get single employee (Manager/Admin only)
export async function getEmployee(id: string): Promise<ActionResponse<Employee>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is manager or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

    if (!isManagerOrAdmin) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    // Use Admin Client to fetch employee (bypasses RLS)
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching employee:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Employee }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Update employee role (Admin only)
export async function updateEmployeeRole(employeeId: string, newRole: 'employee' | 'manager' | 'admin'): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Nur Administratoren können Rollen ändern' }
    }

    // Prevent admin from changing their own role
    if (employeeId === user.id) {
      return { success: false, error: 'Sie können Ihre eigene Rolle nicht ändern' }
    }

    // Use Admin Client to update role (bypasses RLS)
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', employeeId)

    if (error) {
      console.error('Error updating employee role:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/mitarbeiter')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Toggle employee active status (Admin only)
export async function toggleEmployeeStatus(employeeId: string, isActive: boolean): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Nur Administratoren können den Status ändern' }
    }

    // Prevent admin from deactivating themselves
    if (employeeId === user.id && !isActive) {
      return { success: false, error: 'Sie können sich nicht selbst deaktivieren' }
    }

    // Use Admin Client to update status (bypasses RLS)
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', employeeId)

    if (error) {
      console.error('Error updating employee status:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/mitarbeiter')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Update employee profile (Admin only or self)
export async function updateEmployeeProfile(
  employeeId: string,
  data: {
    first_name?: string
    last_name?: string
    email?: string
  }
): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is admin or updating their own profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isOwnProfile = employeeId === user.id

    if (!isAdmin && !isOwnProfile) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    // Use appropriate client
    const dbClient = isAdmin ? createAdminClient() : supabase

    const { error } = await dbClient
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', employeeId)

    if (error) {
      console.error('Error updating employee profile:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/mitarbeiter')
    revalidatePath('/einstellungen')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
