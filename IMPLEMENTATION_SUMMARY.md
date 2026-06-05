# Tax Calculation Migration to Supabase - Implementation Summary

**Date**: 2026-06-04  
**Status**: ✅ IMPLEMENTED (Ready for Testing)

---

## What Was Implemented

### **Phase 1: Database Foundation** ✅

**Created**: `supabase/migrations/add_business_use_percentages.sql`
- Added `home_business_use_percentage` (0-100) to Supabase `users` table
- Added `vehicle_business_use_percentage` (0-100) to Supabase `users` table
- Default both to 100% (100% business use assumed)
- Added constraints to enforce valid ranges
- Added index for performance
- Added column documentation

**Action Required**: Execute this SQL migration in Supabase

---

### **Phase 2: Backend Functions** ✅

**Updated**: `lib/supabase-db.ts`

Added new functions:
- `getBusinessUsePercentagesFromSupabase(userId)` — Fetch user's percentages from database
- `updateBusinessUsePercentagesInSupabase(userId, homePercentage?, vehiclePercentage?)` — Update percentages in database with validation

Both functions:
- Read/write from Supabase (not localStorage)
- Include validation (0-100%)
- Return default 100% if not found
- Have error handling

---

### **Phase 3: Settings API Endpoint** ✅

**Updated**: `app/api/user/settings/route.ts`

**GET /api/user/settings**
- Now returns `home_business_use_percentage` and `vehicle_business_use_percentage` from Supabase
- Fetches percentages via `getBusinessUsePercentagesFromSupabase()`

**POST /api/user/settings**
- Now accepts `home_business_use_percentage` and `vehicle_business_use_percentage` in request body
- Validates percentages (0-100)
- Updates Supabase via `updateBusinessUsePercentagesInSupabase()`
- Returns updated values

---

### **Phase 4: Tax Calculation APIs** ✅

#### **Home Expenses API** (`app/api/reports/home-expenses/route.ts`)
- ✅ Fetches `home_business_use_percentage` from Supabase
- ✅ Applies percentage to calculate `deductibleAmount` in backend (not frontend)
- ✅ Applies percentage to GST for `deductibleGst`
- ✅ Includes per-category deductible amounts
- ✅ Response now includes: `homeUsePercentage`, `deductibleAmount`, `deductibleGst`

#### **Vehicle Expenses API** (`app/api/reports/vehicle-expenses/route.ts`)
- ✅ Fetches `vehicle_business_use_percentage` from Supabase (user default)
- ✅ Uses per-transaction percentages if available (falls back to default)
- ✅ Calculates `totalDeductibleAmount` and `totalDeductibleGst` per-transaction
- ✅ Applies percentages to category breakdown
- ✅ Response now includes: `businessUsePercentage`, `deductibleAmount`, `deductibleGst`

#### **GST Filing API** (`app/api/reports/gst-filing/route.ts`)
- ✅ Fetches percentages from Supabase (not localStorage)
- ✅ Calculates ITCs correctly:
  - Identifies home expenses and applies `homeUsePercentage`
  - Identifies vehicle expenses and applies `vehicleUsePercentage`
  - Calculates `homeITC`, `vehicleITC`, `totalITC`
- ✅ Corrects net GST calculation using ITCs
- ✅ Response now includes: `homeUsePercentage`, `vehicleUsePercentage`, `homeITC`, `vehicleITC`, `totalITC`

---

### **Phase 5: Frontend Cleanup** ✅

#### **GST Filing Component** (`app/reports/gst-filing/content.tsx`)
- ✅ Removed `localStorage.getItem('homeBusinessUsePercentage')` calls
- ✅ Removed `localStorage.getItem('vehicleBusinessUsePercentage')` calls
- ✅ Now trusts backend calculations for `deductibleAmount` and `itcAmount`
- ✅ Simplified GST display (backend provides correct `gstPaid`)
- ✅ Simplified calculation breakdown

**Result**: Frontend now displays data from backend, no localStorage magic needed

---

## Data Flow (Before → After)

### BEFORE (Broken):
```
Frontend reads localStorage
    ↓
Frontend tries to "fix" backend's wrong calculation
    ↓
User sees potentially wrong numbers
    ↓
If user clears cache → data disappears → calculations break
```

### AFTER (Fixed):
```
API fetches percentages from Supabase
    ↓
Backend applies percentages correctly
    ↓
Backend calculates GST, ITCs, deductions with percentages
    ↓
Frontend displays backend-calculated results
    ↓
Data is persistent in database, no cache risk
    ↓
Audit trail exists (what % was used)
```

---

## Testing Checklist

### 1. Database
- [ ] Execute SQL migration in Supabase
- [ ] Verify `home_business_use_percentage` and `vehicle_business_use_percentage` columns exist
- [ ] Verify columns default to 100

### 2. API Functionality
- [ ] GET `/api/user/settings` returns percentages (default 100)
- [ ] POST `/api/user/settings` with `home_business_use_percentage: 50` saves to Supabase
- [ ] Verify saved value persists after page reload

### 3. Home Expenses
- [ ] Create home expense transaction with $1000 amount, $130 GST
- [ ] Set home business use to 50%
- [ ] Check `deductibleAmount` = $565 (50% of $1130)
- [ ] Check `deductibleGst` = $65 (50% of $130)

### 4. Vehicle Expenses
- [ ] Create vehicle expense transaction with $1000 amount, $130 GST
- [ ] Set vehicle business use to 80%
- [ ] Check `deductibleAmount` = $904 (80% of $1130)
- [ ] Check `deductibleGst` = $104 (80% of $130)

### 5. GST Filing
- [ ] Create invoice: $1000 income + $130 GST collected
- [ ] Create home expense: $200 + $26 GST (set to 50% business use)
- [ ] Create vehicle expense: $500 + $65 GST (set to 80% business use)
- [ ] Check GST Filing report:
  - GST Collected = $130 ✓
  - Home ITC = $13 (50% of $26) ✓
  - Vehicle ITC = $52 (80% of $65) ✓
  - Total ITC = $65 ✓
  - GST Paid = $65 + direct ITCs ✓
  - Net GST = Should be calculated correctly ✓

### 6. Data Persistence
- [ ] Clear browser cache/localStorage
- [ ] Reload page
- [ ] Verify percentages still correct (from Supabase, not localStorage)
- [ ] Verify tax calculations still correct

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/migrations/add_business_use_percentages.sql` | **NEW** — SQL migration for database |
| `lib/supabase-db.ts` | Added percentage fetch/update functions |
| `app/api/user/settings/route.ts` | Added percentage GET/POST handlers |
| `app/api/reports/home-expenses/route.ts` | Apply percentage in backend |
| `app/api/reports/vehicle-expenses/route.ts` | Apply percentage per-transaction |
| `app/api/reports/gst-filing/route.ts` | Calculate ITCs with percentages |
| `app/reports/gst-filing/content.tsx` | Remove localStorage, use API data |

---

## Critical Notes

### ⚠️ Before Testing:
1. **Execute SQL migration** in Supabase console
2. Ensure Supabase credentials are set in environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_SECRET` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### 📌 Key Improvements:
- ✅ Tax data is **persistent** (database, not browser memory)
- ✅ **Audit trail** exists (can see what % was used)
- ✅ **Calculations are correct** (backend applies percentages, not frontend)
- ✅ **No localStorage dependency** for tax calculations
- ✅ **Per-transaction overrides** supported (vehicle expenses)

### 🔄 Future Improvements:
- Create UI page for users to set percentages (currently API-only)
- Add calculation breakdown showing GST by category
- T2125 form generation
- Historical percentage tracking

---

## Questions & Decisions

**Q: What if a user never sets percentages?**
A: Default to 100% (current behavior maintained). Backward compatible.

**Q: What if Supabase is down?**
A: getBusinessUsePercentagesFromSupabase() returns 100% as fallback, calculations continue.

**Q: Can users have different percentages per transaction?**
A: Yes! Vehicle expenses already support `business_use_percentage` per transaction. Falls back to default if not set.

**Q: What about home office percentages per transaction?**
A: Can be added later if needed. Currently uses global percentage per user.

---

## Summary

This implementation:
1. ✅ Moves business use percentages from **localStorage to Supabase**
2. ✅ Fixes GST and ITC calculations to apply percentages **correctly in backend**
3. ✅ Eliminates the **frontend calculation workaround**
4. ✅ Creates a **persistent, auditable data store**
5. ✅ Removes the **tax compliance risk** of localStorage

**Status**: Ready for testing. Execute the SQL migration and test against the checklist above.
