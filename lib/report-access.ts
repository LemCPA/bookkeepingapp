/**
 * Report access control
 * Determines which reports are available based on subscription plan
 */

export const REPORT_ACCESS = {
  'income-statement': {
    name: 'Income Statement',
    requiresPaid: false, // Available on free plan
  },
  'expense-categories': {
    name: 'Expense Categories',
    requiresPaid: true, // Paid only
  },
  'home-expenses': {
    name: 'Home Expenses',
    requiresPaid: true, // Paid only
  },
  'vehicle-expenses': {
    name: 'Vehicle Expenses',
    requiresPaid: true, // Paid only
  },
  'gst-filing': {
    name: 'GST Filing',
    requiresPaid: true, // Paid only
  },
}

/**
 * Check if user has access to a report
 */
export function canAccessReport(reportKey: keyof typeof REPORT_ACCESS, plan: string): boolean {
  const report = REPORT_ACCESS[reportKey]
  if (!report.requiresPaid) {
    return true // Free report
  }
  // Paid reports: user must be on starter or growth plan
  return plan === 'starter' || plan === 'growth'
}

/**
 * Get report name
 */
export function getReportName(reportKey: keyof typeof REPORT_ACCESS): string {
  return REPORT_ACCESS[reportKey]?.name || 'Report'
}
