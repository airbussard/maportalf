'use client'

import { isHtmlContent, sanitizeHtml, formatPlainText } from '@/lib/utils/html'

interface FormattedContentProps {
  content: string
  className?: string
}

/**
 * Component for rendering HTML or plain text content safely
 * - Detects if content contains HTML
 * - Sanitizes HTML to prevent XSS
 * - Formats plain text with line breaks
 */
export function FormattedContent({ content, className = '' }: FormattedContentProps) {
  if (!content) {
    return <em className="text-muted-foreground">Kein Inhalt vorhanden</em>
  }

  const isHtml = isHtmlContent(content)
  const formattedContent = isHtml ? sanitizeHtml(content) : formatPlainText(content)

  return (
    <div
      className={`email-html-content prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: formattedContent }}
    />
  )
}
