/**
 * API Authentication Helper
 *
 * Validates API keys for external system access (e.g., Shop)
 */

import { NextRequest, NextResponse } from 'next/server'

// API clients and their keys from environment variables
const API_KEYS: Record<string, string | undefined> = {
  shop: process.env.SHOP_API_KEY,  // External shop system
}

export interface ApiAuthResult {
  valid: boolean
  client?: string
  error?: string
}

/**
 * Validate API key from request headers
 * Expects header: x-api-key: {key}
 */
export function validateApiKey(request: NextRequest): ApiAuthResult {
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey) {
    return { valid: false, error: 'Missing API key' }
  }

  // Check against all registered API keys
  for (const [client, key] of Object.entries(API_KEYS)) {
    if (key && apiKey === key) {
      return { valid: true, client }
    }
  }

  return { valid: false, error: 'Invalid API key' }
}

/**
 * Standard 401 Unauthorized response
 */
export function unauthorizedResponse(message?: string) {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: message || 'Invalid or missing API key'
    },
    { status: 401 }
  )
}

/**
 * Standard error response helper
 */
export function errorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      error: message,
      ...(code && { code })
    },
    { status }
  )
}

/**
 * Standard success response helper
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}
