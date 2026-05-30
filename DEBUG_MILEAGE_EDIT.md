# Debugging Mileage Trip Edit 404 Error

## Summary
The edit mileage trip feature is returning a 404 error. I've added detailed logging to trace the issue through:
1. **Browser (Client)** - Edit page checking for token in localStorage
2. **API Route** - Detailed logging of userId extraction and ownership check
3. **Auth Server** - JWT token verification details

## How to Test

### Step 1: Restart Dev Server
```bash
# Kill existing server
pkill -f "npm run dev" 2>/dev/null || true

# Wait 2 seconds
sleep 2

# Start fresh
npm run dev
```

The server will pick up the new logging code.

### Step 2: Test the Edit Flow
1. Open browser DevTools (F12 → Console tab)
2. Log in with: `demo@bookkeeping.ca` / `demo123`
3. Navigate to Mileage page
4. Click "Edit" on any trip
5. Watch for error message

### Step 3: Check the Logs

**Browser Console (F12)**:
Look for logs starting with `[EDIT PAGE]`:
```
[EDIT PAGE] Fetching trip: 1
[EDIT PAGE] Access token present: true/false  ← CRITICAL
[EDIT PAGE] Access token length: 123
[EDIT PAGE] Response status: 404
[EDIT PAGE] Error response: {error: "Mileage trip not found"}
```

**Server Console** (where `npm run dev` is running):
Look for logs starting with `[AUTH-SERVER]` and `GET /api/mileage/trips/[id]`:
```
[AUTH-SERVER] Auth header present: true/false  ← CRITICAL
[AUTH-SERVER] Full auth header: eyJhbGc...
[AUTH-SERVER] Token extracted, length: 456
[AUTH-SERVER] JWT verification succeeded: true/false  ← CRITICAL
[AUTH-SERVER] Extracted userId: 1, type: number
[AUTH-SERVER] Final userId to return: 1, type: number

GET /api/mileage/trips/[id] - Starting
  params.id (string): 1
  tripId (parsed): 1, type: number
  extractedUserId from JWT: 1, type: number
  userId (with fallback): 1, type: number
  getMileageTrip returned: FOUND
  trip.id: 1, type: number
  trip.user_id: 1, type: number
  Comparison: trip.user_id !== userId: false
  trip.user_id === userId: true
```

## What To Look For

### Issue 1: No Access Token
If you see `[EDIT PAGE] Access token present: false`:
- **Problem**: Token not stored in localStorage after login
- **Fix needed**: Check login flow - token might not be getting saved

### Issue 2: Token Not Sent to Server
If you see `[AUTH-SERVER] Auth header present: false`:
- **Problem**: createAuthenticatedFetch() not including Authorization header
- **Fix needed**: Token exists but isn't being passed correctly

### Issue 3: JWT Verification Failed
If you see `[AUTH-SERVER] JWT verification succeeded: false`:
- **Problem**: Token is invalid or expired
- **Cause**: Token might be from old session, or JWT_SECRET mismatch
- **Fix needed**: Clear localStorage, log in again

### Issue 4: Type Mismatch
If comparison shows:
- `trip.user_id: "1"` (string) vs `userId: 1` (number)
- **Fix needed**: Force type conversion in comparison

### Issue 5: Wrong userId
If you see `extractedUserId: null` falling back to `userId: 1`:
- This is OK if trip.user_id is also 1
- But check if you logged in as a different user

## Expected Successful Flow

All these logs should appear in order:
1. Browser logs show token is present and has reasonable length
2. Server logs show Authorization header is present
3. JWT verification succeeds and extracts userId
4. getMileageTrip finds the trip
5. Comparison shows trip.user_id === userId (true)
6. Trip data is returned (should see 200 OK status)

## After Testing

Once you identify the issue from the logs, reply with:
- What the logs show
- Which "Issue" section above matches
- Any relevant error messages

I'll fix the root cause based on the logs.
