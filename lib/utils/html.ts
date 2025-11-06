import DOMPurify from 'isomorphic-dompurify'

/**
 * Checks if a string contains HTML tags
 */
export function isHtmlContent(text: string): boolean {
  if (!text) return false
  const stripped = text.replace(/<[^>]*>/g, '')
  return stripped !== text
}

/**
 * Sanitizes HTML to prevent XSS attacks
 * Allows safe tags like p, div, br, strong, em, a, ul, ol, li, etc.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'div', 'span', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 'strike', 'b', 'i',
      'a', 'img',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'style',
      'target', 'rel'
    ],
    ALLOW_DATA_ATTR: false
  })
}

/**
 * Formats plain text by converting newlines to <br> tags
 */
export function formatPlainText(text: string): string {
  // Escape HTML special characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // Convert newlines to <br>
  return escaped.replace(/\n/g, '<br>')
}

/**
 * Strips all HTML tags from a string
 * Returns only the text content
 */
export function stripHtmlTags(html: string): string {
  if (!html) return ''

  // Remove all HTML tags
  const withoutTags = html.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  const textarea = typeof document !== 'undefined'
    ? document.createElement('textarea')
    : null

  if (textarea) {
    textarea.innerHTML = withoutTags
    return textarea.value
  }

  // Fallback: Basic entity decoding for server-side
  return withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
}
