/**
 * GST/HST Utilities - Centralized handling for GST-registered vs non-registered users
 *
 * USE THIS FOR ALL GST-RELATED LOGIC
 * Never hardcode gst_registered checks elsewhere - always use these functions
 */

export interface TransactionDisplay {
  pretaxAmount: number | null
  taxAmount: number | null
  total: number
  taxRate: number | null
  shouldShowTaxBreakdown: boolean
}

export interface AmountInput {
  amount: number
  gst_hst_rate?: number
  gst_hst_amount?: number
  gst_hst_included?: boolean
  gst_hst_applicable?: boolean
}

/**
 * Format transaction amounts for display based on GST registration status
 * @param transaction The transaction with amount + GST fields
 * @param gstRegistered Whether user is registered for GST/HST
 * @returns Formatted display object with proper fields for this user type
 */
export function formatTransactionAmount(
  transaction: AmountInput,
  gstRegistered: boolean
): TransactionDisplay {
  if (gstRegistered) {
    // GST REGISTERED: Show pretax, tax, and total separately
    const taxAmount = transaction.gst_hst_amount || 0
    const pretaxAmount = transaction.amount || 0
    const total = pretaxAmount + taxAmount

    return {
      pretaxAmount,
      taxAmount,
      total,
      taxRate: transaction.gst_hst_rate || null,
      shouldShowTaxBreakdown: true,
    }
  } else {
    // NOT REGISTERED: Total amount includes tax, no breakdown
    return {
      pretaxAmount: null,
      taxAmount: null,
      total: transaction.amount || 0,
      taxRate: null,
      shouldShowTaxBreakdown: false,
    }
  }
}

/**
 * Determine if GST fields should be shown in UI
 */
export function shouldShowGstFields(gstRegistered: boolean): boolean {
  return gstRegistered
}

/**
 * Determine if GST filing page should be available
 */
export function shouldShowGstFiling(gstRegistered: boolean): boolean {
  return gstRegistered
}

/**
 * Get the explanation text for tax status based on GST registration
 */
export function getTaxExplanationText(gstRegistered: boolean): string {
  if (gstRegistered) {
    return "Breakdown of pretax amount, tax, and total"
  } else {
    return "Total amount (tax included)"
  }
}

/**
 * Get label for total amount field
 */
export function getTotalAmountLabel(gstRegistered: boolean): string {
  if (gstRegistered) {
    return "Amount"
  } else {
    return "Total Amount (GST Included)"
  }
}

/**
 * Validate transaction based on GST status
 * Returns error message if invalid, null if valid
 */
export function validateTransaction(
  transaction: AmountInput,
  gstRegistered: boolean
): string | null {
  if (!transaction.amount || transaction.amount <= 0) {
    return "Amount must be greater than 0"
  }

  if (gstRegistered) {
    // For registered users, GST status must be specified
    if (transaction.gst_hst_applicable === undefined) {
      return "GST/HST status is required"
    }
  }

  return null
}

/**
 * Calculate GST/HST amounts based on status and rate
 * Returns the GST amount that should be stored
 */
export function calculateGstAmount(
  amount: number,
  rate: number,
  isIncluded: boolean
): number {
  if (!amount || !rate || rate <= 0) {
    return 0
  }

  if (isIncluded) {
    // Tax is included in amount: back-calculate
    return (amount / (1 + rate / 100)) * (rate / 100)
  } else {
    // Tax is separate: calculate on top
    return amount * (rate / 100)
  }
}

/**
 * Get the pretax amount based on how tax is applied
 */
export function calculatePretaxAmount(
  amount: number,
  rate: number,
  isIncluded: boolean,
  taxApplicable: boolean
): number {
  if (!amount) return 0

  if (!taxApplicable) {
    // No tax applies: amount is already pretax
    return amount
  }

  if (isIncluded) {
    // Tax is included: back-calculate pretax
    return amount / (1 + rate / 100)
  } else {
    // Tax is separate: amount is already pretax
    return amount
  }
}
