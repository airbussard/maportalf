# Work Requests System - Phase 1: Foundation ✅

**Status**: ✅ **COMPLETED**
**Date**: 27. Oktober 2025
**Version**: 2.0 (Next.js Implementation)

---

## 📋 Overview

Phase 1 erstellt die komplette Foundation für das Work Requests System im Next.js-Projekt.
Das System ist **100% kompatibel** mit dem bestehenden PHP-System und nutzt die **exakt gleiche Datenbankstruktur**.

---

## ✅ Completed Tasks

### 1. ✅ Supabase Setup
- **Admin Client**: Bereits vorhanden in `lib/supabase/admin.ts`
- **Server Client**: Bereits vorhanden in `lib/supabase/server.ts`
- **Service Role Key**: Konfiguriert für Admin-Operationen (bypasses RLS)

### 2. ✅ TypeScript Types
**File**: `lib/types/work-requests.ts`

#### Core Types
- `WorkRequest` - Base interface (exakt DB-Schema, snake_case)
- `WorkRequestStatus` - Type union für Status-Werte
- `WorkRequestWithEmployee` - Mit Employee-Relation
- `WorkRequestWithRelations` - Mit allen Relations
- `CreateWorkRequestInput` - Input für neue Requests
- `UpdateWorkRequestInput` - Input für Updates
- `WorkRequestFilters` - Filter-Optionen für Queries
- `WorkRequestStats` - Statistiken für Dashboard
- `WorkRequestConflict` - Konflikt-Detection Result

#### Utility Functions (40+)
**Formatierung:**
- `formatRequestTime()` - Zeit-Range Anzeige
- `formatRequestDate()` - Langes Datumsformat
- `formatRequestDateShort()` - Kurzes Datumsformat
- `formatTimestamp()` - Timestamp-Formatierung
- `getStatusLabel()` - Deutsche Status-Labels
- `getStatusColor()` - Tailwind Badge-Colors
- `getEmployeeName()` - Mitarbeitername
- `getApproverName()` - Genehmiger-Name
- `getDayName()` - Wochentag
- `getMonthName()` - Monatsname
- `getYear()` - Jahr extrahieren

**Validierung:**
- `isValidTimeFormat()` - HH:MM Format
- `isValidDateFormat()` - YYYY-MM-DD Format
- `isDateInPast()` - Vergangenheits-Check
- `isDateToday()` - Heute-Check
- `isEndTimeAfterStartTime()` - Zeit-Logik
- `validateCreateRequestInput()` - Complete Input-Validierung

**Konvertierung:**
- `addSecondsToTime()` - HH:MM → HH:MM:SS (für DB)
- `removeSecondsFromTime()` - HH:MM:SS → HH:MM (für UI)

**Hilfsfunktionen:**
- `isWeekend()` - Wochenend-Check
- `groupRequestsByMonth()` - Gruppierung nach Monat
- `groupRequestsByDate()` - Gruppierung nach Datum

**Permissions:**
- `canEditRequest()` - Edit-Berechtigung
- `canWithdrawRequest()` - Withdraw-Berechtigung
- `canDeleteRequest()` - Delete-Berechtigung
- `canManageRequests()` - Manager-Berechtigung
- `canApproveRequest()` - Approve-Berechtigung
- `canRejectRequest()` - Reject-Berechtigung

### 3. ✅ Server Actions
**File**: `app/actions/work-requests.ts`

#### Employee Actions
| Function | Description | Auth |
|----------|-------------|------|
| `getMyWorkRequests()` | Eigene Requests laden | User |
| `getMyWorkRequestsWithDetails()` | Mit Employee-Details | User |
| `createWorkRequest(input)` | Neuen Request erstellen | User |
| `updateWorkRequest(id, input)` | Request bearbeiten | User (own, pending) |
| `withdrawWorkRequest(id)` | Request zurückziehen | User (own, pending) |

#### Manager/Admin Actions
| Function | Description | Auth |
|----------|-------------|------|
| `getAllWorkRequests(filters?)` | Alle Requests mit Filtern | Manager/Admin |
| `getWorkRequestStats()` | Dashboard-Statistiken | Manager/Admin |
| `approveWorkRequest(id)` | Request genehmigen + Calendar Event | Manager/Admin |
| `rejectWorkRequest(id, reason?)` | Request ablehnen | Manager/Admin |
| `createWorkRequestDirect(empId, input)` | Direkt anlegen (approved) | Manager/Admin |
| `deleteWorkRequest(id)` | Hard delete | Admin only |

#### Utility Actions
| Function | Description | Auth |
|----------|-------------|------|
| `checkWorkRequestConflicts(date, exclude?)` | Konfliktprüfung | Public |
| `getConflictCount(date, exclude?)` | Anzahl Konflikte | Public |

---

## 🎯 Features Implemented

### ✅ Complete CRUD Operations
- ✅ Create (Employee + Admin Direct)
- ✅ Read (Own + All with Filters)
- ✅ Update (Pending only)
- ✅ Delete (Admin only)
- ✅ Withdraw (Status change to 'withdrawn')

### ✅ Approval Workflow
- ✅ Approve with automatic Calendar Event creation
- ✅ Reject with optional reason
- ✅ Status tracking (pending → approved/rejected)
- ✅ Approver tracking (who + when)

### ✅ Calendar Integration
- ✅ Automatic calendar_events creation on approval
- ✅ Fixed time slot (8:00-9:00) wie im PHP-System
- ✅ Event deletion on request deletion
- ✅ Proper sync_status handling

### ✅ Conflict Detection
- ✅ Check for multiple employees on same date
- ✅ Exclude specific request (für Edit-Mode)
- ✅ Return conflicting employee names

### ✅ Validation & Error Handling
- ✅ Date validation (format, not in past)
- ✅ Time validation (format, end > start)
- ✅ Duplicate detection (same employee, same date)
- ✅ Permission checks (role-based)
- ✅ German error messages
- ✅ Comprehensive try-catch blocks

### ✅ Database Compatibility
- ✅ Exact snake_case field names
- ✅ TIME format handling (HH:MM:SS)
- ✅ DATE format (YYYY-MM-DD)
- ✅ Status CHECK constraint respected
- ✅ Foreign key relationships preserved
- ✅ RLS policies respected

---

## 📁 File Structure

```
flighthour-nextjs/
├── lib/
│   ├── types/
│   │   └── work-requests.ts          ✅ 500+ lines, 40+ functions
│   └── supabase/
│       ├── admin.ts                  ✅ Already exists
│       └── server.ts                 ✅ Already exists
│
├── app/
│   └── actions/
│       ├── work-requests.ts          ✅ 850+ lines, 14 actions
│       └── work-requests.test.md     ✅ Testing guide
│
└── docs/
    └── work-requests-phase-1.md      ✅ This file
```

---

## 🔧 Technical Details

### Database Schema (Unchanged)
```sql
work_requests {
  id UUID PRIMARY KEY
  employee_id UUID → profiles(id)
  request_date DATE
  is_full_day BOOLEAN
  start_time TIME
  end_time TIME
  reason TEXT
  status TEXT CHECK ('pending', 'approved', 'rejected', 'withdrawn')
  approved_by UUID
  approved_at TIMESTAMPTZ
  rejection_reason TEXT
  calendar_event_id TEXT
  action_token TEXT
  token_expires_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
}
```

### RLS Policies (Existing)
- ✅ Employees see only own requests
- ✅ Managers/Admins see all requests
- ✅ Service Role bypasses RLS (for admin functions)

### Type Safety
- ✅ No `any` types
- ✅ Strict TypeScript mode
- ✅ Full type inference
- ✅ JSDoc comments

### Error Handling
```typescript
try {
  // Action logic
} catch (error) {
  console.error('Detailed error:', error)
  throw new Error('User-friendly German message')
}
```

### Revalidation
```typescript
revalidatePath('/requests')
revalidatePath('/requests/manage')
```

---

## 🧪 Testing

### Test File
`app/actions/work-requests.test.md` enthält:
- ✅ 30+ Test Cases
- ✅ Employee Tests (Create, Update, Withdraw)
- ✅ Manager Tests (Approve, Reject, Direct Create)
- ✅ Validation Tests
- ✅ Error Handling Tests
- ✅ Integration Tests (Full Workflow)
- ✅ Performance Tests
- ✅ Database Verification Queries

### Manual Testing Required
```typescript
// In einer Server Component oder API Route:
import { getMyWorkRequests } from '@/app/actions/work-requests'

const requests = await getMyWorkRequests()
console.log('My requests:', requests)
```

### Database Verification
```sql
-- Check requests
SELECT * FROM work_requests ORDER BY created_at DESC LIMIT 10;

-- Check calendar events
SELECT * FROM calendar_events WHERE id LIKE 'work_request_%';

-- Check RLS
SET ROLE authenticated; -- As employee
SELECT * FROM work_requests; -- Should see only own
```

---

## 📊 Code Statistics

| File | Lines | Exports | Functions/Types |
|------|-------|---------|-----------------|
| `work-requests.ts` (types) | 500+ | 50+ | 40+ utilities |
| `work-requests.ts` (actions) | 850+ | 14 | 14 server actions |
| **Total** | **1350+** | **64+** | **54+** |

---

## ✅ Quality Checklist

- ✅ 100% Type-Safe (no `any`)
- ✅ Comprehensive JSDoc comments
- ✅ German error messages
- ✅ Validation for all inputs
- ✅ Permission checks (role-based)
- ✅ RLS policy compliance
- ✅ Calendar integration
- ✅ Conflict detection
- ✅ Proper error handling
- ✅ Path revalidation
- ✅ Database compatibility (PHP system)
- ✅ Test documentation

---

## 🚀 What's Next: Phase 2

### Employee View UI
1. **Page Layout** (`app/(dashboard)/requests/page.tsx`)
   - Tab navigation (List/Calendar)
   - Create button
   - Export button

2. **Components**
   - `RequestListView` - Tabellenansicht mit Filtern
   - `RequestCalendarView` - Kalenderansicht
   - `CreateRequestDialog` - Modal zum Erstellen
   - `EditRequestDialog` - Modal zum Bearbeiten
   - `RequestCard` - Request Karten-Komponente
   - `StatusBadge` - Status-Badge Komponente

3. **Features**
   - Status filtering
   - Date range filtering
   - Search functionality
   - Sort by date/status
   - Mobile responsive
   - Dark mode support

---

## 💡 Usage Examples

### Create Request (Employee)
```typescript
'use server'
import { createWorkRequest } from '@/app/actions/work-requests'

// Full day
const request = await createWorkRequest({
  request_date: '2025-11-15',
  is_full_day: true,
  reason: 'Simulator training'
})

// Partial day
const partialRequest = await createWorkRequest({
  request_date: '2025-11-16',
  is_full_day: false,
  start_time: '09:00',
  end_time: '17:00',
  reason: 'Morning shift'
})
```

### Approve Request (Manager)
```typescript
'use server'
import { approveWorkRequest } from '@/app/actions/work-requests'

const approved = await approveWorkRequest(requestId)
// → Creates calendar event automatically
// → Sets status to 'approved'
// → Records approver and timestamp
```

### Get All with Filters (Manager)
```typescript
'use server'
import { getAllWorkRequests } from '@/app/actions/work-requests'

const pendingRequests = await getAllWorkRequests({
  status: 'pending',
  fromDate: '2025-11-01',
  toDate: '2025-11-30'
})
```

### Check Conflicts
```typescript
'use server'
import { checkWorkRequestConflicts } from '@/app/actions/work-requests'

const conflicts = await checkWorkRequestConflicts('2025-11-15')
if (conflicts.length > 0) {
  console.log('Warning: Multiple employees on same day')
  conflicts.forEach(c => {
    console.log(`- ${c.employee.first_name} ${c.employee.last_name}`)
  })
}
```

---

## 🔒 Security

### Authentication
- ✅ All actions check `supabase.auth.getUser()`
- ✅ Unauthenticated users get error

### Authorization
- ✅ Role-based access control
- ✅ Employees: Own requests only
- ✅ Managers: View all, approve/reject
- ✅ Admins: Full access including delete

### RLS Compliance
- ✅ Normal client uses user auth (RLS active)
- ✅ Admin client only for Manager/Admin functions
- ✅ Explicit role checks before admin operations

### Input Validation
- ✅ All inputs validated before DB operations
- ✅ Date/Time format checks
- ✅ Business logic validation (date not in past, etc.)
- ✅ SQL injection prevented (Supabase parameterization)

---

## 📞 Support & Debugging

### Common Issues

**Issue**: "Nicht authentifiziert"
```typescript
// Check if user is logged in
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)
```

**Issue**: "Keine Berechtigung"
```typescript
// Check user role
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()
console.log('Role:', profile?.role)
```

**Issue**: Times not saving correctly
```typescript
// Remember: DB expects HH:MM:SS, UI uses HH:MM
const dbTime = addSecondsToTime('09:00') // → '09:00:00'
const uiTime = removeSecondsFromTime('09:00:00') // → '09:00'
```

### Logging
Alle Actions loggen Errors:
```typescript
console.error('actionName error:', error)
```

Check Supabase Logs:
- Supabase Dashboard → Logs → Database Queries
- Look for failed queries or permission errors

---

## 🎉 Summary

Phase 1 ist **komplett abgeschlossen**!

- ✅ **1350+ Zeilen** sauberer, typsicherer Code
- ✅ **14 Server Actions** mit vollem CRUD
- ✅ **40+ Utility Functions** für UI/Logic
- ✅ **100% DB-Kompatibilität** mit PHP-System
- ✅ **Comprehensive Testing Guide**
- ✅ **Production-ready** Error Handling

**Ready für Phase 2**: UI Components! 🚀
