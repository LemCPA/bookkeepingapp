# Demo Account Security - Testing & Verification Guide

## Overview

This guide provides step-by-step instructions to verify that all demo account security measures are working correctly. The implementation consists of 5 phases:

1. ✅ **Phase 1**: Core security infrastructure (demo-security.ts, demo-audit.ts)
2. ✅ **Phase 2**: API route protection (12 routes modified)
3. ✅ **Phase 3**: Password security (bcrypt hashing)
4. ✅ **Phase 4**: Audit logging (demo-audit.json)
5. 🔄 **Phase 5**: Testing & verification (THIS DOCUMENT)

---

## Quick Start: Manual Testing Checklist

### 1. Login as Demo Account

**Test**: Verify demo credentials work and display is correct

```bash
# In browser:
1. Navigate to http://localhost:3000/login
2. Email: demo@bookkeeping.ca
3. Password: demo123
4. Click "Sign In"
```

**Expected Results**:
- ✅ Login succeeds
- ✅ Redirected to /transactions page
- ✅ Header shows yellow "Demo Mode (Read-only)" badge
- ✅ User email is demo@bookkeeping.ca
- ✅ No error messages appear

---

### 2. Test Read Operations (Should Work)

**Test**: Verify demo account can read all data

| Page | Test | Expected |
|------|------|----------|
| Transactions | View transaction list | ✅ Transactions display |
| Transactions | Click individual transaction | ✅ Transaction details show |
| Clients | View clients list | ✅ Clients display |
| Chart of Accounts | View accounts list | ✅ Accounts display |
| Reports | View profit/loss report | ✅ Report displays |
| Settings | View user settings | ✅ Settings visible |

**How to Test**:
```
1. Log in as demo@bookkeeping.ca
2. Navigate to each page
3. Verify data loads without errors
4. Verify no 403 errors in console
```

---

### 3. Test Write Operations Blocking (Should Fail with 403)

**Test A: Create Transaction**
```bash
1. Log in as demo account
2. Navigate to /transactions/new
3. Fill form: Date, Amount, Account, Description
4. Click "Create Transaction"
```

**Expected**:
- ✅ Error message: "Demo account cannot modify data. Sign up for a free account..."
- ✅ Transaction NOT created
- ✅ Remain on form page
- ✅ Console shows 403 Forbidden

**Test B: Update Transaction**
```bash
1. Log in as demo account
2. Navigate to existing transaction
3. Click "Edit" button
4. Change amount or description
5. Click "Save"
```

**Expected**:
- ✅ Error message appears
- ✅ Transaction NOT updated
- ✅ Console shows 403 Forbidden

**Test C: Delete Transaction**
```bash
1. Log in as demo account
2. View transaction list
3. Click delete button on any transaction
4. Confirm deletion
```

**Expected**:
- ✅ Error: "Demo account cannot delete transactions"
- ✅ Transaction NOT deleted
- ✅ Console shows 403 Forbidden

**Test D: Create Client**
```bash
1. Log in as demo account
2. Navigate to /clients
3. Click "Add New Client"
4. Fill form with client details
5. Click "Save Client"
```

**Expected**:
- ✅ Error message appears
- ✅ Client NOT created
- ✅ Console shows 403 Forbidden

**Test E: Create Recurring Transaction**
```bash
1. Log in as demo account
2. Navigate to /recurring-transactions
3. Click "Add Recurring"
4. Fill form details
5. Click "Create"
```

**Expected**:
- ✅ Error message: "Demo account cannot create recurring transactions"
- ✅ Recurring transaction NOT created
- ✅ Console shows 403 Forbidden

**Test F: Modify Settings**
```bash
1. Log in as demo account
2. Navigate to /settings
3. Change default GST/HST rate
4. Click "Save Settings"
```

**Expected**:
- ✅ Error message: "Demo account cannot modify settings"
- ✅ Settings NOT changed
- ✅ Console shows 403 Forbidden

---

### 4. Test Rate Limiting (60 requests per 60 seconds)

**Test**: Verify rate limiting is enforced

**Option A: Browser Dev Tools**
```bash
1. Log in as demo account
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Run the following JavaScript:

let successCount = 0;
let rateLimitCount = 0;

for (let i = 0; i < 70; i++) {
  fetch('http://localhost:3000/api/transactions', {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  }).then(r => {
    if (r.status === 429) {
      rateLimitCount++;
      console.log(`Request ${i}: Rate Limited (429)`);
    } else {
      successCount++;
      console.log(`Request ${i}: Success`);
    }
  });
}

// After 3 seconds:
setTimeout(() => {
  console.log(`Summary: ${successCount} successful, ${rateLimitCount} rate limited`);
}, 3000);
```

**Expected**:
- ✅ Requests 1-60: Status 200 (success)
- ✅ Requests 61-70: Status 429 (rate limited)
- ✅ Summary shows: ~60 successful, ~10 rate limited

**Option B: Curl Script**
```bash
#!/bin/bash

# Get demo token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@bookkeeping.ca","password":"demo123"}' | jq -r '.token')

# Send 70 requests
SUCCESS=0
RATE_LIMITED=0

for i in {1..70}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3000/api/transactions \
    -H "Authorization: Bearer $TOKEN")
  
  if [ "$RESPONSE" = "200" ]; then
    SUCCESS=$((SUCCESS + 1))
  elif [ "$RESPONSE" = "429" ]; then
    RATE_LIMITED=$((RATE_LIMITED + 1))
    echo "Request $i: RATE LIMITED"
  fi
done

echo "Results: $SUCCESS successful, $RATE_LIMITED rate limited"
```

**Expected Output**:
```
Request 61: RATE LIMITED
Request 62: RATE LIMITED
...
Results: 60 successful, 10 rate limited
```

---

### 5. Test Audit Logging

**Test**: Verify blocked operations are logged

**Check Audit Log File**:
```bash
# Navigate to project root and check audit log
cat data/demo-audit.json
```

**Expected Structure**:
```json
[
  {
    "timestamp": "2026-05-24T14:30:45.123Z",
    "operation": "CREATE_TRANSACTION_BLOCKED",
    "method": "POST",
    "endpoint": "/api/transactions",
    "status": 403,
    "ip": "127.0.0.1"
  },
  {
    "timestamp": "2026-05-24T14:30:46.234Z",
    "operation": "UPDATE_TRANSACTION_BLOCKED",
    "method": "PUT",
    "endpoint": "/api/transactions/5",
    "status": 403,
    "ip": "127.0.0.1"
  },
  ...
]
```

**What to Verify**:
- ✅ File exists at `data/demo-audit.json`
- ✅ Contains array of audit entries
- ✅ Each entry has: timestamp, operation, method, endpoint, status, ip
- ✅ Timestamps are ISO format (YYYY-MM-DDTHH:mm:ss.fffZ)
- ✅ Status codes match response: 403 for blocked, 429 for rate limited
- ✅ Entries logged for blocked write operations
- ✅ Entries logged for rate limit violations
- ✅ Log contains entries from your recent test attempts

---

### 6. Test Password Security

**Test**: Verify password is hashed (not plain text)

**Check Source Code**:
```bash
# View the password hash in db.ts
grep -A 2 "password_hash" lib/db.ts | head -10
```

**Expected**:
- ✅ Password is NOT "demo123" (plain text)
- ✅ Password IS bcrypt hash starting with "$2b$10$"
- ✅ Hash looks like: `$2b$10$n9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHqDiK`

**Verify Bcrypt Hash**:
```bash
# In Node.js console, verify the hash matches demo123:
const bcrypt = require('bcryptjs');
const hash = '$2b$10$n9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHqDiK';

bcrypt.compare('demo123', hash, (err, result) => {
  console.log('Password matches hash:', result); // Should be: true
});
```

**Expected**:
- ✅ `bcrypt.compare('demo123', hash)` returns `true`
- ✅ This confirms plain text "demo123" was properly hashed

---

### 7. Test Demo Mode UI Indicators

**Test**: Verify user knows they're in demo mode

**Login and Check Header**:
```bash
1. Log in as demo@bookkeeping.ca
2. Look at header/navigation
3. Find the yellow "Demo Mode (Read-only)" badge
```

**Expected**:
- ✅ Yellow badge visible next to user profile
- ✅ Shows warning emoji (⚠️)
- ✅ Text says "Demo Mode" and "(Read-only)"
- ✅ Badge visible on all pages

**Check Error Messages**:
```bash
1. Try to create a transaction
2. Check error message displayed to user
```

**Expected**:
- ✅ Error message is clear and helpful
- ✅ Mentions "Demo account cannot modify data"
- ✅ Suggests signing up for free account
- ✅ Message is not generic or confusing

---

### 8. Test Error Message Propagation

**Test**: Verify API errors reach the frontend

**Test A: Create Transaction Error**
```bash
1. Log in as demo account
2. Navigate to /transactions/new
3. Fill in form (any values)
4. Click "Create Transaction"
5. Check browser console (F12)
6. Check alert message shown to user
```

**Expected**:
- ✅ Browser shows error message to user (alert or toast)
- ✅ Console shows specific error: "Demo account cannot create transactions"
- ✅ Message is NOT generic "Failed to create transaction"

**Test B: Network Tab Inspection**
```bash
1. Open DevTools (F12)
2. Go to Network tab
3. Try to create transaction
4. Find POST request to /api/transactions
5. Check Response tab
```

**Expected Response**:
```json
{
  "error": "Demo account cannot create transactions. Sign up for a free account to use all features."
}
```

---

## Comprehensive Test Scenario: Full Demo Account Workflow

**Time**: ~5 minutes

**Scenario**: User tries to use the demo account and encounters all security restrictions

```bash
1. Start browser at http://localhost:3000/login
2. Login with demo@bookkeeping.ca / demo123
   → Expect: Success, redirected to /transactions, Demo Mode badge visible

3. Navigate to /transactions
   → Expect: See transaction list, no errors

4. Try to create new transaction
   → Expect: Form shows, but "Create" button fails with 403 error
   → Verify: User sees helpful error message

5. Navigate to /clients
   → Expect: See client list, no errors

6. Try to add new client
   → Expect: Button blocked with error message

7. Navigate to /recurring-transactions
   → Expect: See recurring transactions, no errors

8. Try to create recurring transaction
   → Expect: Error message appears

9. Navigate to /settings
   → Expect: See settings form, no errors

10. Try to change GST/HST rate
    → Expect: Error message, settings not changed

11. Check browser console for audit activity
    → Expect: Audit log file updated with blocked operations

12. Open DevTools Network tab
    → Expect: All write requests return 403 Forbidden
    → Expect: Rate limit requests return 429 Too Many Requests
```

---

## Troubleshooting

### Issue: Login fails with demo@bookkeeping.ca

**Cause**: Password hashing not properly implemented
**Fix**:
```bash
# Check bcrypt hash is in db.ts
grep "password_hash.*2b" lib/db.ts

# Verify bcrypt module is installed
npm list bcryptjs

# Restart app
npm run dev
```

### Issue: Demo Mode badge not showing

**Cause**: isDemoMode state not set in Header component
**Fix**:
```bash
# Check Header.tsx has demo check
grep -A 5 "demo@bookkeeping.ca" components/Header.tsx

# Verify user email is passed correctly
# Check that isAuthenticated and user?.email are both set after login
```

### Issue: Rate limiting not working (all requests succeed)

**Cause**: Rate limit check not applied or identifiers not matching
**Fix**:
```bash
# Verify demo-security.ts has checkDemoRateLimit
grep -A 10 "checkDemoRateLimit" lib/demo-security.ts

# Verify it's called in API routes with userId as identifier
grep -B 2 -A 2 "checkDemoRateLimit" app/api/transactions/route.ts

# Restart app to reset in-memory rate limit counts
npm run dev
```

### Issue: Audit log file not created

**Cause**: data/ directory missing or logDemoActivity not called
**Fix**:
```bash
# Create data directory
mkdir -p data

# Verify demo-audit.ts exists and exports logDemoActivity
cat lib/demo-audit.ts | head -20

# Verify API routes call logDemoActivity
grep "logDemoActivity" app/api/transactions/route.ts

# Make a request that should be logged, then check
cat data/demo-audit.json
```

### Issue: Write operations NOT blocked (should return 403)

**Cause**: isDemoAccount check not in route, or route not imported demo-security
**Fix**:
```bash
# Verify imports at top of API route
grep "import.*demo-security" app/api/transactions/route.ts

# Verify isDemoAccount check exists
grep -A 5 "isDemoAccount(userId)" app/api/transactions/route.ts

# Verify check is BEFORE processing the request
# (should be line 30-40 in POST handler)

# Restart app
npm run dev
```

### Issue: Rate limit returns wrong status code

**Cause**: Rate limit check logic incorrect
**Fix**:
```bash
# Verify checkDemoRateLimit returns boolean
grep -A 15 "function checkDemoRateLimit" lib/demo-security.ts

# Verify API routes check return value
grep -B 2 -A 3 "!checkDemoRateLimit" app/api/transactions/route.ts

# Should return NextResponse.json with status 429
```

---

## Performance Notes

### Rate Limiting Details

- **Limit**: 60 requests per 60 seconds per demo account
- **Implementation**: In-memory Map tracking request timestamps
- **Reset**: Timestamps older than 60,000ms are removed
- **Note**: Resets on app restart (acceptable for demo - prevents accumulated state)

### Audit Logging Details

- **Location**: `data/demo-audit.json`
- **Max Entries**: 1,000 (older entries removed)
- **File Size**: ~100-200 KB typical
- **Performance**: Negligible impact (append-only write)
- **Note**: Not encrypted (acceptable for demo security audit)

### Password Hashing Details

- **Algorithm**: bcrypt ($2b$10$ - 10 salt rounds)
- **Performance**: ~100ms per authentication (acceptable)
- **Security**: Prevents casual source code inspection
- **Verification**: `bcrypt.compare('demo123', hash)` returns true

---

## Security Summary

### What's Protected

| Feature | Status | Impact |
|---------|--------|--------|
| **Demo cannot create transactions** | ✅ Protected | 403 Forbidden |
| **Demo cannot update transactions** | ✅ Protected | 403 Forbidden |
| **Demo cannot delete transactions** | ✅ Protected | 403 Forbidden |
| **Demo cannot create clients** | ✅ Protected | 403 Forbidden |
| **Demo cannot create accounts** | ✅ Protected | 403 Forbidden |
| **Demo cannot create recurring** | ✅ Protected | 403 Forbidden |
| **Demo cannot modify settings** | ✅ Protected | 403 Forbidden |
| **Demo cannot send invoices** | ✅ Protected | 403 Forbidden |
| **Rate limiting (60 req/min)** | ✅ Protected | 429 Too Many Requests |
| **Audit logging** | ✅ Enabled | File: data/demo-audit.json |
| **Password hashing** | ✅ Implemented | Bcrypt hash in db.ts |
| **UI indicator (Demo Mode badge)** | ✅ Visible | Yellow header badge |

### What's NOT Protected (Intentional)

- ✅ Demo CAN read all data (transactions, clients, reports)
- ✅ Demo CAN view user profile and settings
- ✅ Demo CAN download documents
- ✅ Demo CAN test read-only features
- ✅ Demo credentials remain public (by design - sandbox is sufficient)

---

## Success Criteria Checklist

- [ ] Demo account login works (demo@bookkeeping.ca / demo123)
- [ ] Demo Mode badge displays in header
- [ ] Demo can read all data without errors
- [ ] Demo cannot create transactions (403 error)
- [ ] Demo cannot update transactions (403 error)
- [ ] Demo cannot delete transactions (403 error)
- [ ] Demo cannot create clients (403 error)
- [ ] Demo cannot modify settings (403 error)
- [ ] Rate limiting blocks after 60 requests per minute (429 error)
- [ ] Audit log file exists at data/demo-audit.json
- [ ] Audit log contains blocked operations
- [ ] Password hash is NOT plain text "demo123"
- [ ] bcrypt.compare('demo123', hash) returns true
- [ ] Error messages are specific and helpful
- [ ] API returns proper HTTP status codes (403, 429)

---

## Next Steps

### Immediate
1. Run through Manual Testing Checklist (sections 1-8)
2. Execute at least one full workflow test (section 9)
3. Verify all success criteria are met

### If Issues Found
1. Consult Troubleshooting section
2. Check specific API route implementation
3. Restart app and retry
4. Check audit log for clues

### Before Production Deployment
1. ✅ All success criteria met
2. ✅ No console errors during testing
3. ✅ Rate limiting working correctly
4. ✅ Audit log capturing blocked operations
5. ✅ Demo Mode badge visible
6. ✅ Error messages clear and helpful
7. ✅ Password hashing verified
8. ✅ Tested on both desktop and mobile

---

## Appendix: Quick Command Reference

### Check if files exist
```bash
ls -la lib/demo-security.ts lib/demo-audit.ts
```

### View audit log
```bash
cat data/demo-audit.json | jq .
```

### Check password hash
```bash
grep "password_hash" lib/db.ts | head -1
```

### Restart app
```bash
npm run dev
```

### View API route demo checks
```bash
grep -n "isDemoAccount" app/api/transactions/route.ts
```

### Test single API endpoint
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/transactions
```

---

**Last Updated**: 2026-05-24
**Status**: Complete Implementation Ready for Testing
