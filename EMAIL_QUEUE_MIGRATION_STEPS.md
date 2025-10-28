# E-Mail Queue Migration Steps

## Problem
The email queue system was trying to use columns that didn't exist in the database table.

## Solution
Added missing columns to the existing `email_queue` table while maintaining compatibility with existing fields.

## Migration Steps

### 1. Run Database Migration

**In Supabase SQL Editor**, run the following migration:

```bash
supabase/migrations/20250128000000_add_ticket_columns_to_email_queue.sql
```

This migration adds:
- `ticket_id` - UUID reference to tickets table
- `recipient_email` - Ticket-specific recipient field
- `content` - Ticket-specific content field
- `last_attempt_at` - Timestamp of last send attempt
- Index on `ticket_id` for performance

### 2. Verify Migration

Check that the columns were added:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'email_queue'
ORDER BY ordinal_position;
```

You should see the new columns listed.

### 3. Test Ticket Creation

1. Create a new ticket with email recipient and attachment
2. Check that the email appears in the `email_queue` table:
   ```sql
   SELECT * FROM email_queue WHERE type = 'ticket' ORDER BY created_at DESC LIMIT 5;
   ```

### 4. Test Cron Processor

Manually trigger the cron job:
```bash
curl "https://flighthour.getemergence.com/api/cron/process-email-queue?key=<CRON_SECRET>"
```

Expected response:
```json
{
  "success": true,
  "processed": 1,
  "succeeded": 1,
  "failed": 0,
  "errors": []
}
```

### 5. Monitor Admin UI

Visit: https://flighthour.getemergence.com/admin/email-queue

You should see:
- Statistics (Total, Pending, Sent, Failed)
- Table showing all queued emails
- Status badges for each email
- Filter buttons working correctly

## Changes Made

### Code Changes:
1. **app/actions/tickets.ts**
   - Updated INSERT to include both old (`type`, `recipient`, `body`) and new (`ticket_id`, `recipient_email`, `content`) columns

2. **app/api/cron/process-email-queue/route.ts**
   - Changed `status: 'sending'` to `status: 'processing'` to match existing schema

3. **app/(dashboard)/admin/email-queue/components/email-queue-table.tsx**
   - Updated interface to include all status values: `'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'`
   - Added badge for 'cancelled' status
   - Changed 'sending' to 'processing'

### Database Schema:
- Added columns to `email_queue` table (see migration file)
- No existing data is affected
- Fully backwards compatible

## Status Values

The system now uses these status values (matching existing schema):
- `pending` - Waiting to be sent
- `processing` - Currently being sent
- `sent` - Successfully sent
- `failed` - All retry attempts exhausted
- `cancelled` - Email was cancelled

## Next Steps

After migration:
1. Build and deploy the updated code
2. Set up cron job on cron-job.org (see EMAIL_QUEUE_CRON_SETUP.md)
3. Monitor the queue in admin UI
4. Check CapRover logs for any errors
