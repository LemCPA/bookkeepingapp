export function parseFlexibleDate(dateString: string | null): string | null {
  if (!dateString) return null

  const trimmed = dateString.trim()
  if (!trimmed) return null

  // Try to parse as-is if already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      return trimmed
    }
  }

  // Try common formats
  const formats = [
    // MM/DD/YYYY or M/D/YYYY
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, handler: (m: string[]) => `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` },
    // DD/MM/YYYY or D/M/YYYY (try this second, prefer MM/DD in North America)
    { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, handler: (m: string[]) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
    // YYYY/MM/DD
    { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, handler: (m: string[]) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
    // Month DD, YYYY or Month DD YYYY
    { regex: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})[,\s]+(\d{4})$/i, handler: (m: string[]) => formatMonthDate(m[1], m[2], m[3]) },
    // DD Month YYYY
    { regex: /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i, handler: (m: string[]) => formatMonthDate(m[2], m[1], m[3]) },
  ]

  for (const fmt of formats) {
    const match = trimmed.match(fmt.regex)
    if (match) {
      try {
        const result = fmt.handler(match)
        const parsed = new Date(result)
        if (!isNaN(parsed.getTime())) {
          return result
        }
      } catch (e) {
        continue
      }
    }
  }

  // Try parsing as a natural date string (fallback)
  try {
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      // Convert to YYYY-MM-DD
      return parsed.toISOString().split('T')[0]
    }
  } catch (e) {
    // Continue
  }

  // If all parsing fails, return null
  return null
}

function formatMonthDate(monthStr: string, dayStr: string, yearStr: string): string {
  const monthMap: Record<string, string> = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12',
  }

  const month = monthMap[monthStr.toLowerCase()] || '01'
  const day = dayStr.padStart(2, '0')
  return `${yearStr}-${month}-${day}`
}

export function validateDate(dateString: string | null): boolean {
  if (!dateString) return false
  const parsed = new Date(dateString)
  // Check if date is reasonable (within 100 years of today)
  const now = new Date()
  const yearDiff = Math.abs(now.getFullYear() - parsed.getFullYear())
  return !isNaN(parsed.getTime()) && yearDiff < 100
}
