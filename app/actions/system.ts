'use server'

import { createClient } from '@/lib/supabase/server'

export interface SystemStatus {
  database: {
    online: boolean
    responseTime: number | null
    message: string
  }
  system: {
    online: boolean
    version: string
    uptime: string
  }
}

export async function checkSystemStatus(): Promise<SystemStatus> {
  // Check Database Connection
  const dbStartTime = Date.now()
  let dbOnline = false
  let dbResponseTime: number | null = null
  let dbMessage = 'Verbindung fehlgeschlagen'

  try {
    const supabase = await createClient()

    // Simple query to test connection
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    dbResponseTime = Date.now() - dbStartTime

    if (!error) {
      dbOnline = true
      dbMessage = 'Verbindung erfolgreich'
    } else {
      dbMessage = error.message
    }
  } catch (error) {
    dbMessage = 'Verbindungsfehler'
  }

  // System Status (always online in this implementation)
  const systemStatus = {
    online: true,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '2.000',
    uptime: 'Betriebsbereit'
  }

  return {
    database: {
      online: dbOnline,
      responseTime: dbResponseTime,
      message: dbMessage
    },
    system: systemStatus
  }
}
