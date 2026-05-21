# Bookkeeping App - Mini Version

A simple bookkeeping application to manage client financial records. Built with Next.js, React, and SQLite.

## Features

- **Client Management** - Add and manage client information
- **Transaction Entry** - Record invoices, receipts, and adjustments
- **Document Upload** - Upload scanned PDFs and images for transactions
- **Chart of Accounts** - Pre-configured accounts (Assets, Liabilities, Equity, Income, Expenses)
- **Balance Sheet** - Monthly financial position report
- **Income Statement** - Monthly profit/loss report

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Create a Client
- Go to **Clients** page
- Click "Add Client"
- Enter client name (required), email, and address
- Click "Create Client"

### 2. Add Transactions
- Go to **New Transaction** (or click the link from home)
- Select client
- Choose transaction type (Invoice, Receipt, Adjustment)
- Enter date, amount, account, and description
- Optionally upload a scanned document (PDF, JPG, PNG)
- Click "Create Transaction"

### 3. View Transactions
- Go to **Transactions** page
- Filter by month using the month selector
- View all recorded transactions with details

### 4. Generate Reports
- **Balance Sheet**: Shows Assets, Liabilities, and Equity for any month
- **Income Statement**: Shows Income and Expenses for any month
- Both reports show totals and verify the accounting equation

## Default Chart of Accounts

### Assets
- Cash (1000)
- Checking Account (1010)
- Savings Account (1020)
- Accounts Receivable (1030)

### Liabilities
- Accounts Payable (2000)
- Credit Card (2010)

### Equity
- Retained Earnings (3000)

### Income
- Service Revenue (4000)
- Product Revenue (4010)

### Expenses
- Utilities (5000)
- Rent (5010)
- Supplies (5020)
- Salaries (5030)
- Equipment Depreciation (5040)

## Database

The app uses SQLite with these tables:
- **clients** - Client information
- **chart_of_accounts** - Account setup
- **transactions** - Transaction records
- **documents** - Uploaded file references

Database file is created automatically at `bookkeeping.db` when the app first runs.

## Files Uploaded

Uploaded documents are stored in the `public/uploads/` directory, organized by transaction ID.

## Development Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run linter
```

## Next Steps

After testing this mini version, you could enhance it with:
- User authentication
- Multi-user support
- Bank reconciliation
- Tax category mapping
- Advanced filtering and search
- Recurring transactions
- Budget tracking
- Detailed financial analysis

## License

MIT
