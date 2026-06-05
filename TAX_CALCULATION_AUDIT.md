# Tax Calculation Audit Report
**Date**: 2026-06-04  
**Status**: CRITICAL ISSUES IDENTIFIED

---

## Executive Summary

The bookkeeping app's tax calculations have fundamental issues that could lead to **incorrect GST/HST filings and deduction claims**. The problems stem from:
- Frontend/backend calculation split (business logic scattered)
- Improper handling of business use percentages
- ITC calculations depending on localStorage (unreliable)
- Inconsistent application of business use percentages across home and vehicle expenses

**Risk Level**: 🔴 **HIGH** — These calculations directly affect tax compliance.

---

## 1. GST/HST Calculation Issues

### 1.1 Backend GST Filing Calculation (OVERSIMPLIFIED)
**File**: `/lib/db.ts` → `getGstFilingData()` (lines 727-785)

**Current Logic**:
```typescript
let gstCollected = 0
let gstPaid = 0

relevantTransactions.forEach(t => {
  if (t.type === 'INVOICE' && (t.gst_hst_amount ?? 0) > 0) {
    gstCollected += t.gst_hst_amount ?? 0
  } else if ((t.type === 'RECEIPT' || t.type === 'ADJUSTMENT') && (t.gst_hst_amount ?? 0) > 0) {
    gstPaid += t.gst_hst_amount ?? 0
  }
})

const netGst = gstCollected - gstPaid
```

**Problems**:
1. ❌ **Doesn't account for business use percentages** — Home/vehicle expenses are mixed in, but their business-use percentage is not applied
2. ❌ **Treats all GST equally** — No distinction between:
   - Directly deductible expenses (full GST claimable)
   - Home office expenses (only business % portion is claimable)
   - Vehicle expenses (only business % portion is claimable)
3. ❌ **Formula doesn't match CRA rules** — Should be:
   ```
   Net GST = GST Collected - (Direct Input Tax Credits) - (Home Business % × Home GST) - (Vehicle Business % × Vehicle GST)
   ```

### 1.2 Frontend Calculation Compensation
**File**: `/app/reports/gst-filing/content.tsx` (lines 273-278)

**Current Logic**:
```typescript
filingData.gstPaid -
(homeExpensesData?.totalGst || 0) -
(vehicleExpensesData?.totalGst || 0) +
(homeExpensesData?.itcAmount || 0) +
(vehicleExpensesData?.itcAmount || 0)
```

**Breaking this down**:
- Starts with `gstPaid` (all GST from RECEIPT/ADJUSTMENT transactions)
- Subtracts **full** home GST
- Subtracts **full** vehicle GST
- Adds back **percentage-adjusted** ITC from home
- Adds back **percentage-adjusted** ITC from vehicle

**Problem**: This logic assumes ALL home and vehicle GST are not deductible, then adds back the percentage. But this is **backwards** — it should only subtract the non-deductible portion.

### 1.3 Issue: ITC Calculated on Frontend with localStorage
**File**: `/app/reports/gst-filing/content.tsx` (lines 125-128, 143-146)

```typescript
const homePercentage = parseInt(localStorage.getItem('homeBusinessUsePercentage') || '100') / 100
setHomeExpensesData({
  deductibleAmount: (homeData.totalHomeExpenses + homeData.totalGst) * homePercentage,
  itcAmount: homeData.totalGst * homePercentage,  // ← ITC depends on localStorage!
  totalGst: homeData.totalGst,
})
```

**Critical Problems**:
- 🔴 **ITC is stored in localStorage, not in database** — If user clears localStorage, data is lost
- 🔴 **No persistence** — Backend doesn't know what percentage was used
- 🔴 **No audit trail** — Can't verify what percentage was applied in past reports
- 🔴 **Inconsistent with database** — The actual percentage stored in transaction records may differ

**Question**: Where is `homeBusinessUsePercentage` set? Is it per-transaction or global?

---

## 2. Home Expense Calculation Issues

### 2.1 Backend API Response (MISSING PERCENTAGE APPLICATION)
**File**: `/app/api/reports/home-expenses/route.ts` (lines 67-73)

```typescript
return NextResponse.json({
  totalHomeExpenses,
  totalGst,
  totalWithGst,
  homeUsePercentage: 100,
  deductibleAmount: totalWithGst * 1,  // ← Always 1, should use actual %
  categoryBreakdown,
  transactions: [...]
})
```

**Problems**:
1. ❌ `homeUsePercentage` is hardcoded to `100`
2. ❌ `deductibleAmount` is not calculated correctly — it's just `totalWithGst * 1`
3. ❌ Backend doesn't apply the percentage; frontend must calculate it
4. ❌ No per-transaction percentage tracking for home expenses

**Expected Logic**:
```typescript
// Should the API calculate deductible amount or frontend?
// If backend: need to know the business use percentage
// If frontend: need to store percentage reliably (not localStorage)
const homeUsePercentage = getHomeBusinessUsePercentage(userId)  // ← Where does this come from?
const deductibleAmount = totalWithGst * (homeUsePercentage / 100)
```

### 2.2 Missing: How is Home Business Use Percentage Stored?
- Is it in the `users` table? (Not visible in the schema)
- Is it per-transaction? (Transactions don't have a `home_business_use_percentage` field)
- Is it in localStorage? (Current implementation)

**Risk**: Without a clear source of truth, calculations will be inconsistent.

---

## 3. Vehicle Expense Calculation Issues

### 3.1 Business Use Percentage Application (WRONG)
**File**: `/app/api/reports/vehicle-expenses/route.ts` (lines 49-70)

```typescript
const businessUsePercentage = vehicleTransactions.length > 0
  ? vehicleTransactions[0].business_use_percentage || 100  // ← Takes FIRST transaction's %
  : 100

// ...

deductibleAmount: totalVehicleExpenses * (businessUsePercentage / 100),
```

**Critical Problems**:
1. ❌ **Uses only the FIRST transaction's percentage** — What if other transactions have different percentages?
2. ❌ **Doesn't apply percentage to GST** — `totalGst` is returned but not reduced
3. ❌ **Inconsistent with home expenses** — This applies percentage but home expenses don't
4. ❌ **Mixed transaction handling** — Some vehicles might be 50% business, others 100%

**Expected Logic**:
```typescript
// Calculate deductible amount by applying each transaction's own percentage
let totalDeductibleAmount = 0
let totalDeductibleGst = 0

vehicleTransactions.forEach(t => {
  const businessPct = t.business_use_percentage || 100
  totalDeductibleAmount += t.amount * (businessPct / 100)
  totalDeductibleGst += (t.gst_hst_amount || 0) * (businessPct / 100)
})
```

### 3.2 Issue: GST Field Missing from Vehicle API Response
**Line 48**: `const totalGst = vehicleTransactions.reduce(...)`

The API calculates `totalGst` but according to the memory file, this was recently added. **Verify the calculation is correct**:

```typescript
// Does it return FULL GST or DEDUCTIBLE GST?
totalGst = vehicleTransactions.reduce((sum, t) => sum + (t.gst_hst_amount || 0), 0)  // ← Full amount
```

**Question**: Should this be full GST or the business-use-adjusted GST?

---

## 4. Income Statement Vehicle Expense Handling (WORKS CORRECTLY)
**File**: `/lib/db.ts` → `getIncomeStatementDataByMonths()` (lines 858-867)

```typescript
db.transactions
  .filter(t => t.user_id === userId && t.is_vehicle_expense)
  .forEach(t => {
    const tMonth = t.transaction_date.substring(0, 7)
    if (months.includes(tMonth)) {
      const businessUsePercentage = t.business_use_percentage || 100
      const deductibleAmount = t.amount * (businessUsePercentage / 100)  // ✅ CORRECT
      vehicleExpensesByMonth[tMonth] = (vehicleExpensesByMonth[tMonth] || 0) + deductibleAmount
    }
  })
```

✅ **This is correct** — it applies each transaction's individual percentage.

---

## 5. Missing T2125 Calculation (Self-Employment Income)

**Status**: NOT FOUND in codebase

T2125 (Statement of Business Activities) requires:
- Net income/loss calculation
- Deductible expenses (at correct percentages)
- Home office deduction
- Vehicle deduction
- Proper handling of personal vs. business portions

**Question**: Is T2125 reporting implemented? If not, this is a critical gap.

---

## 6. Data Model Issues

### 6.1 Transactions Table - Missing Fields
From `/lib/db.ts` (line 9):

```typescript
transactions: {
  // ... existing fields ...
  is_vehicle_expense?: boolean
  business_use_percentage?: number
  category?: string
}
```

**Issues**:
- ❌ No `home_business_use_percentage` field (only vehicle has it)
- ❌ `category` field exists but purpose unclear
- ❌ No `gst_hst_included` handling — is the amount pre-tax or post-tax?

### 6.2 Users Table - Missing GST Settings
From `/lib/db.ts` (line 6):

```typescript
users: {
  // ... existing fields ...
  gst_registered?: boolean
  gst_number?: string
  default_gst_hst_rate?: number
  // ❌ Missing: home_business_use_percentage
  // ❌ Missing: vehicle_business_use_percentage
}
```

**Issue**: No central location to store business use percentages.

---

## 7. Summary of Critical Issues

| Issue | Severity | Impact | Location |
|-------|----------|--------|----------|
| GST formula doesn't account for business %; treated on frontend instead | 🔴 CRITICAL | Incorrect GST filings | `getGstFilingData()` + `content.tsx` |
| Vehicle % applies to amount but not GST | 🔴 CRITICAL | Incorrect ITC claims | `vehicle-expenses/route.ts` |
| Home % only calculated on frontend, not stored | 🔴 CRITICAL | No audit trail; data loss risk | `content.tsx` + localStorage |
| Vehicle % taken from first transaction only | 🟠 HIGH | Wrong calculation if mixed % | `vehicle-expenses/route.ts` |
| No T2125 reporting | 🟠 HIGH | Missing tax form support | N/A |
| No central % storage in database | 🟠 HIGH | Scattered business logic | `db.ts` schema |

---

## 8. Required Fixes (Priority Order)

### Phase 1: Foundation (BLOCKING)
1. **Add percentage fields to Users table**
   - `home_business_use_percentage` (default: 100)
   - `vehicle_business_use_percentage` (default: 100)
   - Can be overridden per-transaction if needed

2. **Fix Vehicle Expense API**
   - Calculate deductible amount per-transaction using individual percentages
   - Apply percentage to GST as well
   - Return average or per-transaction breakdown

3. **Move GST Calculation to Backend**
   - `getGstFilingData()` should apply business use percentages
   - Remove frontend localStorage dependency
   - Calculate correct ITCs in backend

### Phase 2: Audit Trail
4. **Store percentage selections in database**
   - Home business use % → users table + transaction-level override
   - Vehicle business use % → users table + transaction-level override
   - Create audit log of percentage changes

### Phase 3: Features
5. **T2125 Calculation**
   - Net business income
   - Deductible expenses with correct percentages
   - CRA-compliant format

6. **Testing & Validation**
   - Unit tests for tax calculations
   - Edge cases: mixed percentages, no transactions, partial business use
   - Validation against CRA examples

---

## Questions for User

1. **Home business use percentage** — Should this be:
   - Global for all home expenses?
   - Per-expense-category?
   - Per-transaction?

2. **Vehicle business use percentage** — Should this be:
   - Global for all vehicle expenses?
   - Per-transaction (already has field)?

3. **T2125 reporting** — Is this in scope?

4. **GST Included vs. Not Included** — Are expense amounts entered:
   - Pre-tax (GST added separately)?
   - Post-tax (GST already included)?
   - Both?

5. **Audit requirements** — Do you need to show:
   - Historical percentage changes?
   - Per-transaction percentage overrides?
   - Calculation breakdown by transaction?

