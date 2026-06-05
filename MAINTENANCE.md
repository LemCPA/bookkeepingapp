# System Maintenance Guide

## GST/HST Registration Handling

### Overview
The system supports two user types:
- **GST-Registered**: Users who must file GST/HST returns and can claim Input Tax Credits (ITCs)
- **Non-Registered**: Small businesses/sole proprietors not registered for GST/HST

This distinction affects how amounts are stored, displayed, and calculated throughout the system.

### ⚠️ CRITICAL RULE
**NEVER hardcode GST logic or gst_registered checks directly in components.**

Instead, **ALWAYS use the centralized utilities** in `/lib/gst-utils.ts`

### Using GST Utilities

#### 1. For Displaying Amounts
```javascript
import { formatTransactionAmount } from '@/lib/gst-utils'

// In your component:
const display = formatTransactionAmount(transaction, user.gst_registered)

// Then use:
// display.pretaxAmount  (null if not registered)
// display.taxAmount     (null if not registered)
// display.total
// display.shouldShowTaxBreakdown (boolean)

// Example: Conditional rendering
{display.shouldShowTaxBreakdown ? (
  <>
    <p>Pretax: ${display.pretaxAmount}</p>
    <p>Tax: ${display.taxAmount}</p>
  </>
) : (
  <p>Total: ${display.total}</p>
)}
```

#### 2. For UI Field Visibility
```javascript
import { shouldShowGstFields, getTotalAmountLabel } from '@/lib/gst-utils'

// Show/hide GST fields:
{shouldShowGstFields(user.gst_registered) && (
  <GstToggleOptions />
)}

// Dynamic label:
<label>{getTotalAmountLabel(user.gst_registered)}</label>
```

#### 3. For Validation
```javascript
import { validateTransaction } from '@/lib/gst-utils'

const error = validateTransaction(formData, user.gst_registered)
if (error) {
  // Show error to user
}
```

#### 4. For Calculations
```javascript
import { 
  calculateGstAmount, 
  calculatePretaxAmount 
} from '@/lib/gst-utils'

const taxAmount = calculateGstAmount(amount, rate, isIncluded)
const pretax = calculatePretaxAmount(amount, rate, isIncluded, taxApplicable)
```

### Pages That Must Check GST Registration

#### ✅ Already Updated
- `/app/receipts/page.tsx` - Receipt capture
- `/app/reports/income-statement/page.tsx` - P&L report
- `/app/reports/gst-filing/content.tsx` - GST filing (hidden if not registered)

#### ⚠️ Should Be Updated (Future)
- `/app/transactions/new/page.tsx`
- `/app/transactions/[id]/edit/page.tsx`
- `/app/invoicing/` pages
- `/app/reports/expense-categories/page.tsx`
- `/app/reports/home-expenses/page.tsx`
- `/app/reports/vehicle-expenses/page.tsx`

### Checklist for New Features

When adding any feature that involves amounts, tax, receipts, or invoices:

- [ ] Import utilities from `/lib/gst-utils.ts`
- [ ] Fetch user's `gst_registered` status from `/api/user/settings`
- [ ] Use `formatTransactionAmount()` for all amount displays
- [ ] Use `shouldShowGstFields()` to conditionally show/hide GST inputs
- [ ] Use `validateTransaction()` to check data before saving
- [ ] Test both GST-registered AND non-registered paths
- [ ] Update this MAINTENANCE.md if adding new utilities

### Database Considerations

**Important:** Transactions are stored with this schema:
```javascript
{
  id: number,
  amount: number,              // Pretax amount (if registered) OR Total (if not)
  gst_hst_rate: number,        // Tax rate (null if not registered)
  gst_hst_amount: number,      // Calculated tax (0 if not registered)
  gst_hst_included: boolean,   // How tax was applied
  gst_hst_applicable: boolean, // Whether tax applies
  ...
}
```

**Backend API functions** that read transactions must return data in a format the utility can understand:
```javascript
const transaction = {
  amount: 100,
  gst_hst_rate: 13,
  gst_hst_amount: 13,
  gst_hst_included: true
}

const display = formatTransactionAmount(transaction, gstRegistered)
// ✅ Works for both registered and non-registered users
```

### Testing Strategy

For each component that uses GST logic:

1. **Test with gst_registered = true**
   - GST fields should show
   - Amounts should be decomposed (pretax | tax | total)
   - Tax calculations should work

2. **Test with gst_registered = false**
   - GST fields should be hidden
   - Only total should show
   - No tax breakdown

Example test:
```javascript
describe('ReceiptCapture with GST variants', () => {
  test('shows GST toggle when registered', () => {
    render(<ReceiptCapture user={{ gst_registered: true }} />)
    expect(screen.getByText('Is GST/HST included')).toBeInTheDocument()
  })

  test('hides GST toggle when not registered', () => {
    render(<ReceiptCapture user={{ gst_registered: false }} />)
    expect(screen.queryByText('Is GST/HST included')).not.toBeInTheDocument()
  })
})
```

### Migration Notes

If a user switches from `gst_registered: false` to `true` (or vice versa):
1. Existing transactions remain unchanged in database
2. They display according to the NEW status
3. This may cause confusion - consider showing a banner during transition
4. **Recommendation:** Prevent status changes, require manual data cleanup if needed

### Common Mistakes to Avoid

❌ **Wrong:**
```javascript
{user.gst_registered && (
  <GstFields />
)}
// Problem: Scattered throughout codebase, hard to maintain
```

✅ **Right:**
```javascript
{shouldShowGstFields(user.gst_registered) && (
  <GstFields />
)}
// Reason: Centralized logic, easy to change
```

---

## Questions?
Check `/lib/gst-utils.ts` for function signatures and detailed comments.
