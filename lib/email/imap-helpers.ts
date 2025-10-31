/**
 * IMAP Email Helper Functions
 * Ported from PHP cron/fetch-emails.php
 */

/**
 * Priorität basierend auf Keywords ermitteln
 * Identisch zur PHP-Funktion detectPriority()
 */
export function detectPriority(subject: string, body: string): 'low' | 'medium' | 'high' | 'urgent' {
  const text = (subject + ' ' + body).toLowerCase()

  if (
    text.includes('dringend') ||
    text.includes('urgent') ||
    text.includes('asap') ||
    text.includes('notfall') ||
    text.includes('simulator startet nicht')
  ) {
    return 'urgent'
  }

  if (
    text.includes('wichtig') ||
    text.includes('important') ||
    text.includes('problem')
  ) {
    return 'high'
  }

  if (
    text.includes('anfrage') ||
    text.includes('frage')
  ) {
    return 'low'
  }

  return 'low'
}

/**
 * Clean string for JSON encoding
 * Identisch zur PHP-Funktion cleanForJson()
 */
export function cleanForJson(str: string): string {
  // Remove null bytes
  let cleaned = str.replace(/\0/g, '')

  // Remove control characters except newlines and tabs
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n')
  cleaned = cleaned.replace(/\r/g, '\n')

  // Remove excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}

/**
 * Clean HTML for safe storage and display
 * Identisch zur PHP-Funktion cleanHtmlForStorage()
 */
export function cleanHtmlForStorage(html: string): string {
  let cleaned = html

  // Remove dangerous tags and their content
  cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gis, '')
  cleaned = cleaned.replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
  cleaned = cleaned.replace(/<object[^>]*>.*?<\/object>/gis, '')
  cleaned = cleaned.replace(/<embed[^>]*>/gis, '')
  cleaned = cleaned.replace(/<applet[^>]*>.*?<\/applet>/gis, '')

  // Remove external stylesheets
  cleaned = cleaned.replace(/<link[^>]*>/gis, '')

  // Remove meta tags
  cleaned = cleaned.replace(/<meta[^>]*>/gis, '')

  // Remove form elements
  cleaned = cleaned.replace(/<form[^>]*>.*?<\/form>/gis, '')
  cleaned = cleaned.replace(/<input[^>]*>/gis, '')
  cleaned = cleaned.replace(/<button[^>]*>.*?<\/button>/gis, '')

  // Remove event handlers and javascript: URLs
  cleaned = cleaned.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
  cleaned = cleaned.replace(/\shref\s*=\s*["']javascript:[^"']*["']/gi, '')

  // Allow style tags but sanitize them
  cleaned = cleaned.replace(/<style[^>]*>(.*?)<\/style>/gis, (match, css) => {
    let sanitizedCss = css
    // Remove potentially dangerous CSS
    sanitizedCss = sanitizedCss.replace(/expression\s*\(/gi, '')
    sanitizedCss = sanitizedCss.replace(/javascript\s*:/gi, '')
    sanitizedCss = sanitizedCss.replace(/@import/gi, '')
    sanitizedCss = sanitizedCss.replace(/behavior\s*:/gi, '')
    return '<style>' + sanitizedCss + '</style>'
  })

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')

  // Apply cleanForJson to ensure JSON compatibility
  cleaned = cleanForJson(cleaned)

  return cleaned.trim()
}

/**
 * Convert plain text to HTML
 */
export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  return '<p>' + escaped.replace(/\n/g, '<br>') + '</p>'
}

/**
 * Extract ticket ID from subject line
 * Supports both numeric format [TICKET-000001] and UUID format [TICKET-uuid]
 */
export function extractTicketInfo(subject: string): { ticketId: string | null; ticketNumber: number | null } {
  // Check for numeric ticket format [TICKET-000001]
  const numericMatch = subject.match(/\[TICKET-(\d+)\]/)
  if (numericMatch) {
    return {
      ticketId: null, // Will be looked up from ticket_number
      ticketNumber: parseInt(numericMatch[1], 10)
    }
  }

  // Fallback: Check for UUID format (old tickets)
  const uuidMatch = subject.match(/\[TICKET-([a-f0-9\-]{36})\]/i)
  if (uuidMatch) {
    return {
      ticketId: uuidMatch[1],
      ticketNumber: null
    }
  }

  return { ticketId: null, ticketNumber: null }
}

/**
 * Generate filename-safe string
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path separators
  let safe = filename.replace(/[\/\\]/g, '_')

  // Remove dangerous characters but keep dots for extensions
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Remove multiple consecutive underscores
  safe = safe.replace(/_+/g, '_')

  return safe
}
