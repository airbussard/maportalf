# Work Requests Actions - Testing Guide

Diese Datei dokumentiert manuelle Tests für die Work Request Actions.

## Setup

```typescript
// In einer Next.js Server Component oder API Route
import {
  getMyWorkRequests,
  createWorkRequest,
  approveWorkRequest,
  // ... andere Actions
} from '@/app/actions/work-requests'
```

## Test Cases

### 1. Employee Tests

#### 1.1 Get My Requests
```typescript
const requests = await getMyWorkRequests()
console.log('My requests:', requests)
// Expected: Array of work_requests for current user
```

#### 1.2 Create Full Day Request
```typescript
const newRequest = await createWorkRequest({
  request_date: '2025-11-15', // Future date
  is_full_day: true,
  reason: 'Test Request'
})
console.log('Created:', newRequest)
// Expected: New work_request with status 'pending'
```

#### 1.3 Create Partial Day Request
```typescript
const partialRequest = await createWorkRequest({
  request_date: '2025-11-16',
  is_full_day: false,
  start_time: '09:00',
  end_time: '17:00',
  reason: 'Teilzeit Test'
})
// Expected: Times converted to HH:MM:SS format
```

#### 1.4 Create Duplicate Request (Should Fail)
```typescript
try {
  await createWorkRequest({
    request_date: '2025-11-15', // Same date as 1.2
    is_full_day: true
  })
} catch (error) {
  console.log('Expected error:', error.message)
  // Expected: "Sie haben bereits einen Request für dieses Datum"
}
```

#### 1.5 Create Request in Past (Should Fail)
```typescript
try {
  await createWorkRequest({
    request_date: '2024-01-01',
    is_full_day: true
  })
} catch (error) {
  console.log('Expected error:', error.message)
  // Expected: "Das Datum darf nicht in der Vergangenheit liegen"
}
```

#### 1.6 Update Request
```typescript
const updated = await updateWorkRequest(requestId, {
  request_date: '2025-11-17',
  is_full_day: false,
  start_time: '10:00',
  end_time: '16:00',
  reason: 'Updated reason'
})
// Expected: Updated work_request
// Note: Only works for pending requests by same employee
```

#### 1.7 Withdraw Request
```typescript
const withdrawn = await withdrawWorkRequest(requestId)
console.log('Status:', withdrawn.status)
// Expected: status = 'withdrawn'
```

### 2. Manager/Admin Tests

#### 2.1 Get All Requests
```typescript
const allRequests = await getAllWorkRequests()
console.log('Total requests:', allRequests.length)
// Expected: Array with employee and approver details
```

#### 2.2 Get Requests with Filters
```typescript
const filtered = await getAllWorkRequests({
  status: 'pending',
  fromDate: '2025-11-01',
  toDate: '2025-11-30'
})
console.log('Filtered:', filtered)
// Expected: Only pending requests in November 2025
```

#### 2.3 Get Statistics
```typescript
const stats = await getWorkRequestStats()
console.log('Stats:', stats)
// Expected: { pending, approvedToday, totalMonth, totalYear }
```

#### 2.4 Approve Request
```typescript
const approved = await approveWorkRequest(pendingRequestId)
console.log('Approved:', approved)
console.log('Calendar Event ID:', approved.calendar_event_id)
// Expected:
// - status = 'approved'
// - approved_by = current_user_id
// - approved_at = timestamp
// - calendar_event created
```

#### 2.5 Reject Request
```typescript
const rejected = await rejectWorkRequest(
  pendingRequestId,
  'Zu viele Mitarbeiter an diesem Tag'
)
console.log('Rejected:', rejected)
// Expected:
// - status = 'rejected'
// - rejection_reason set
```

#### 2.6 Direct Create (Approved)
```typescript
const direct = await createWorkRequestDirect(
  employeeId,
  {
    request_date: '2025-12-01',
    is_full_day: true,
    reason: 'Direkt angelegt durch Admin'
  }
)
console.log('Direct created:', direct)
// Expected:
// - status = 'approved' (not pending!)
// - calendar_event created immediately
```

#### 2.7 Delete Request (Admin only)
```typescript
await deleteWorkRequest(requestId)
// Expected: Request deleted, calendar event also deleted
```

### 3. Conflict Detection

#### 3.1 Check Conflicts
```typescript
const conflicts = await checkWorkRequestConflicts('2025-11-15')
console.log('Conflicts on 2025-11-15:', conflicts)
// Expected: Array of approved requests on that date
```

#### 3.2 Check Conflicts with Exclusion
```typescript
const conflictsExcluding = await checkWorkRequestConflicts(
  '2025-11-15',
  requestId // Exclude this request (useful for editing)
)
// Expected: Conflicts excluding the specified request
```

#### 3.3 Get Conflict Count
```typescript
const count = await getConflictCount('2025-11-15')
console.log('Number of conflicts:', count)
// Expected: Number
```

## Validation Tests

### Time Validation

```typescript
// Valid times
isValidTimeFormat('09:00') // true
isValidTimeFormat('23:59') // true

// Invalid times
isValidTimeFormat('25:00') // false
isValidTimeFormat('9:00')  // true (leading zero optional)
isValidTimeFormat('09:60') // false
```

### Date Validation

```typescript
// Valid dates
isValidDateFormat('2025-11-15') // true

// Invalid dates
isValidDateFormat('15.11.2025') // false
isValidDateFormat('2025-11-32') // false
```

### End Time After Start Time

```typescript
isEndTimeAfterStartTime('09:00', '17:00') // true
isEndTimeAfterStartTime('17:00', '09:00') // false
isEndTimeAfterStartTime('09:00', '09:00') // false
```

## Error Handling Tests

### Authentication Errors
```typescript
// Without logged-in user:
try {
  await getMyWorkRequests()
} catch (error) {
  // Expected: "Nicht authentifiziert"
}
```

### Permission Errors
```typescript
// As employee trying to access admin function:
try {
  await getAllWorkRequests()
} catch (error) {
  // Expected: "Keine Berechtigung zum Zugriff auf alle Requests"
}
```

### Validation Errors
```typescript
// Invalid input:
try {
  await createWorkRequest({
    request_date: '2024-01-01', // Past date
    is_full_day: false,
    start_time: '17:00',
    end_time: '09:00' // End before start
  })
} catch (error) {
  // Expected: Validation error message
}
```

## Database Verification

Nach Tests prüfen:

```sql
-- Check created requests
SELECT * FROM work_requests
WHERE employee_id = 'user-id'
ORDER BY created_at DESC;

-- Check calendar events
SELECT * FROM calendar_events
WHERE id LIKE 'work_request_%'
ORDER BY created_at DESC;

-- Check RLS policies
SELECT * FROM work_requests; -- As employee (should see only own)
SELECT * FROM work_requests; -- As manager (should see all)
```

## Performance Tests

```typescript
// Bulk operations
const startTime = Date.now()
const results = await Promise.all([
  getAllWorkRequests(),
  getWorkRequestStats(),
  checkWorkRequestConflicts('2025-11-15')
])
console.log('Time taken:', Date.now() - startTime, 'ms')
// Expected: < 2000ms for all three queries
```

## Integration Tests

### Full Workflow: Employee Creates -> Manager Approves

```typescript
// 1. Employee creates request
const created = await createWorkRequest({
  request_date: '2025-12-15',
  is_full_day: true,
  reason: 'Integration Test'
})

// 2. Check it appears in manager view
const pending = await getAllWorkRequests({ status: 'pending' })
const found = pending.find(r => r.id === created.id)
console.log('Found in pending:', !!found)

// 3. Manager approves
const approved = await approveWorkRequest(created.id)

// 4. Check calendar event created
console.log('Calendar event:', approved.calendar_event_id)

// 5. Verify in stats
const stats = await getWorkRequestStats()
console.log('Stats after approval:', stats)
```

## Cleanup

```typescript
// Delete all test requests (Admin only)
const testRequests = await getAllWorkRequests({
  fromDate: '2025-11-01',
  toDate: '2025-12-31'
})

for (const request of testRequests) {
  if (request.reason?.includes('Test')) {
    await deleteWorkRequest(request.id)
  }
}
```

## Notes

- Alle Tests sollten mit echten Daten in DEV/STAGING durchgeführt werden
- Service Role Key wird automatisch verwendet wo nötig (Admin-Funktionen)
- RLS Policies werden respektiert bei normalen User-Actions
- Calendar Events werden automatisch bei Approval erstellt (8:00-9:00 fixed)
- Timestamps sind immer in UTC (ISO 8601 format)
- Times sind in HH:MM:SS format in DB, HH:MM im Input
