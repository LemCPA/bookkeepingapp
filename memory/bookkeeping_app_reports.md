# Bookkeeping App - Financial Reports Enhancement

## Current State (as of 2026-06-04)

**Project**: Canadian bookkeeping application with tax reporting features (GST/HST filing, T2125 reporting, business expense tracking)

**Tech Stack**: Next.js, React, TypeScript, Tailwind CSS, JSON-based database

## Completed Work - This Session

### 1. Report Vertical Space Reductions
Reduced padding and margins across all financial reports for more compact display:
- **Expense Categories by Month**: `space-y-6`→`space-y-3`, `p-6`→`p-4`, table cells `py-2`→`py-1`
- **Income Statement**: `space-y-6`→`space-y-3`, header `p-6`→`p-4`, added `mb-1` to heading, table cells `py-2`→`py-1`
- **Home Expenses Report**: Container `space-y-6`→`space-y-3`, cards `p-4`→`p-3`, table `px-6 py-3`→`px-4 py-2`
- **Vehicle Expenses Report**: Container `space-y-6`→`space-y-3`, cards `p-4`→`p-3`, table `px-6 py-4`→`px-4 py-2`
- **GST Filing Report**: All containers `p-6`→`p-4`, headings `mb-4`→`mb-2`, large card `p-8`→`p-4`

### 2. Report Options Sidebar Compression
Reduced vertical spacing in Home Expenses and Vehicle Expenses report sidebars:
- Container: `p-6`→`p-4`, `space-y-6`→`space-y-3`
- Heading: `mb-4`→`mb-2`
- Section borders: `border-t pt-4`→`border-t pt-2`

### 3. Alternating Row Shading
Added visual hierarchy to Home Expenses and Vehicle Expenses report tables:
- Detail transaction rows: White/gray-100 alternating with `border-b border-gray-200`
- Summary category rows: White/gray-100 alternating with `border-b border-gray-200`
- Matches Income Statement and Expense Categories styling pattern

### 4. GST Filing Calculation Fix
Corrected "GST/HST Paid" calculation to properly account for home and vehicle business use ITCs:
- **Added to Vehicle Expenses API**: `totalGst` field calculation (was missing)
- **Formula**: `GST Paid = Original GST - homeFullGST - vehicleFullGST + homeITC + vehicleITC`
- This removes non-deductible GST and adds back only claimable ITCs based on business use percentages
- Updated both GST/HST Paid card display and Calculation Breakdown section

### 5. Report Button Simplifications
Removed "Generate Detail Report" buttons from Home Expenses and Vehicle Expenses reports:
- Now show only single "Generate Report" button (always generates summary view)
- Cleaner UI, reduced user confusion
- Detail transaction views removed from these reports

### 6. GST Filing Input Tax Credits Section
Simplified the GST Filing report's business use section:
- Removed expense amount lines (Business-Use-of-Home Expenses, Motor Vehicle Expenses)
- Keep only claimable ITC lines:
  - Home Expense Business Tax Credit (ITC)
  - Motor Vehicle Tax Credit (ITC)
- Changed heading from "Business Use Expenses & Input Tax Credits" to just "Input Tax Credits"

## Next Steps (Pending)

### Immediate
- **Stripe Invoice Payment Processing** (Task #33) - Explore and plan implementation
  - User has Stripe sandbox available for testing
  - Needs: webhook handlers, billing history pages, payment flow

### Other Pending Tasks
- OCR improvements (invoice total, vendor name extraction, date handling, mobile camera issues)
- Landing page mobile fixes (hero text overflow, pricing card overflow)
- Remove demo credentials from public login page

## Key Preferences & Patterns

### Report Design Principles
- **Compact vertical layout**: Minimize white space while maintaining readability
- **Alternating row colors**: White/gray-100 pattern for visual clarity
- **Summary-first**: Users prefer summary reports, not detailed transaction views
- **Percentage-based deductions**: Home/vehicle business use percentages are core to tax calculations
- **GST calculations**: Must properly remove full GST amounts then add back claimable ITCs

### Data Structure Insights
- Home expenses: Accounts start with code `9945-*`
- Vehicle expenses: Accounts start with code `9281-*`
- Both have per-category percentage support (individual or master percentage mode)
- GST amounts tracked at transaction level (`gst_hst_amount` field)

### API Patterns
- Home Expenses API returns: `totalHomeExpenses`, `totalGst`, `categoryBreakdown[]`
- Vehicle Expenses API now returns: `totalVehicleExpenses`, `totalGst`, `categoryBreakdown[]`
- Both support calculation of claimable ITCs based on percentage application

## Files Modified This Session
1. `/app/reports/expense-categories/page.tsx` — Spacing reduction, alternating rows
2. `/app/reports/income-statement/page.tsx` — Spacing reduction, alternating rows
3. `/app/reports/home-expenses/page.tsx` — Spacing, rows, button simplification, Report Options compact
4. `/app/reports/vehicle-expenses/page.tsx` — Spacing, rows, button simplification, Report Options compact
5. `/app/reports/gst-filing/content.tsx` — GST calculation fix, ITC section simplification
6. `/app/api/reports/vehicle-expenses/route.ts` — Added `totalGst` calculation to API response

## User Working Style
- Iterative refinement: Provides feedback on what "doesn't look right" rather than detailed specs
- Prefers compact, efficient UIs (dislikes white space)
- Values proper financial calculations over feature completeness
- Works on focused report improvements rather than feature sprawl
- Takes breaks when tired (not pushing through fatigue)
