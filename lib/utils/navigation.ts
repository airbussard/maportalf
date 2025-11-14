/**
 * Navigation utility functions for preserving state when navigating between pages
 */

/**
 * Build a return URL from current search parameters
 * Used when linking to a detail page to preserve list state
 */
export function buildReturnUrl(searchParams: URLSearchParams, basePath: string = '/tickets'): string {
  const params = searchParams.toString()
  return params ? `${basePath}?${params}` : basePath
}

/**
 * Get the return URL from search parameters with fallback
 * Used on detail pages to navigate back to the correct list state
 */
export function getReturnUrl(searchParams: URLSearchParams, fallback: string = '/tickets'): string {
  const returnTo = searchParams.get('returnTo')

  // Validate returnTo to prevent open redirects
  if (returnTo) {
    // Only allow internal navigation within /tickets route
    if (returnTo.startsWith('/tickets')) {
      return returnTo
    }
  }

  return fallback
}

/**
 * Build a ticket detail URL with return state preserved
 */
export function buildTicketDetailUrl(ticketId: string, currentSearchParams: URLSearchParams): string {
  const returnUrl = buildReturnUrl(currentSearchParams, '/tickets')
  return `/tickets/${ticketId}?returnTo=${encodeURIComponent(returnUrl)}`
}
