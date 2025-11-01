'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'

interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface Document {
  id: string
  title: string
  filename: string
  original_filename: string
  mime_type: string
  file_size: number
  description: string | null
  category: string
  storage_path: string
  assigned_to: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
}

// Get all documents visible to the current user
export async function getAllDocuments(): Promise<ActionResponse<Document[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    // If not admin, only show general documents and documents assigned to user
    if (profile?.role !== 'admin') {
      query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Document[] }
  } catch (error: any) {
    console.error('Error in getAllDocuments:', error)
    return { success: false, error: error.message }
  }
}

// Upload a new document - Admin only
export async function uploadDocument(formData: FormData): Promise<ActionResponse<Document>> {
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
      return { success: false, error: 'Keine Berechtigung. Nur Administratoren können Dokumente hochladen.' }
    }

    // Extract form data
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const assignedTo = formData.get('assigned_to') as string | null
    const category = assignedTo ? 'Persönlich' : 'Allgemein'

    // Validate file
    if (!file || file.size === 0) {
      return { success: false, error: 'Keine Datei ausgewählt' }
    }

    // Validate file size (10MB)
    if (file.size > 10485760) {
      return { success: false, error: 'Datei ist zu groß. Maximum: 10MB' }
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ]

    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Dateityp nicht erlaubt. Erlaubt: PDF, Word, Excel, PNG, JPG' }
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const uniqueFilename = `${uuidv4()}.${fileExtension}`

    // Generate storage path based on assigned_to
    const storagePath = assignedTo
      ? `personal/${assignedTo}/${uniqueFilename}`
      : `general/${uniqueFilename}`

    // Use Admin Client to upload to storage
    const adminSupabase = createAdminClient()

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminSupabase
      .storage
      .from('documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { success: false, error: `Upload fehlgeschlagen: ${uploadError.message}` }
    }

    // Insert document record into database
    const { data: documentData, error: dbError } = await adminSupabase
      .from('documents')
      .insert({
        title,
        filename: uniqueFilename,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        description: description || null,
        category,
        storage_path: storagePath,
        assigned_to: assignedTo || null,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)

      // Rollback: Delete uploaded file
      await adminSupabase.storage.from('documents').remove([storagePath])

      return { success: false, error: `Datenbankfehler: ${dbError.message}` }
    }

    return { success: true, data: documentData as Document }
  } catch (error: any) {
    console.error('Error in uploadDocument:', error)
    return { success: false, error: error.message }
  }
}

// Delete a document - Admin only
export async function deleteDocument(documentId: string): Promise<ActionResponse> {
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
      return { success: false, error: 'Keine Berechtigung. Nur Administratoren können Dokumente löschen.' }
    }

    // Use Admin Client for deletion
    const adminSupabase = createAdminClient()

    // Get document to retrieve storage_path
    const { data: document, error: fetchError } = await adminSupabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return { success: false, error: 'Dokument nicht gefunden' }
    }

    // Delete from database (trigger will automatically delete from storage)
    const { error: deleteError } = await adminSupabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Error deleting document:', deleteError)
      return { success: false, error: deleteError.message }
    }

    // Note: The database trigger 'trigger_delete_document_storage' automatically
    // deletes the file from storage, so we don't need to do it manually here

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteDocument:', error)
    return { success: false, error: error.message }
  }
}

// Get a signed URL for downloading a document
export async function getDocumentDownloadUrl(documentId: string): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Get document details
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return { success: false, error: 'Dokument nicht gefunden' }
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isAssignedToUser = document.assigned_to === user.id
    const isGeneralDocument = document.assigned_to === null

    if (!isAdmin && !isAssignedToUser && !isGeneralDocument) {
      return { success: false, error: 'Keine Berechtigung für dieses Dokument' }
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(document.storage_path, 3600, {
        download: document.original_filename
      })

    if (urlError || !signedUrlData) {
      console.error('Error creating signed URL:', urlError)
      return { success: false, error: 'Download-URL konnte nicht erstellt werden' }
    }

    return { success: true, data: signedUrlData.signedUrl }
  } catch (error: any) {
    console.error('Error in getDocumentDownloadUrl:', error)
    return { success: false, error: error.message }
  }
}

// Get document by ID
export async function getDocument(documentId: string): Promise<ActionResponse<Document>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      console.error('Error fetching document:', error)
      return { success: false, error: error.message }
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isAssignedToUser = data.assigned_to === user.id
    const isGeneralDocument = data.assigned_to === null

    if (!isAdmin && !isAssignedToUser && !isGeneralDocument) {
      return { success: false, error: 'Keine Berechtigung für dieses Dokument' }
    }

    return { success: true, data: data as Document }
  } catch (error: any) {
    console.error('Error in getDocument:', error)
    return { success: false, error: error.message }
  }
}
