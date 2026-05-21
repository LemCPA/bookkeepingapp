# Setup Guide

## Requirements

Before running this app, ensure you have:
- **Node.js** version 18 or higher (Download from https://nodejs.org/)
- **npm** (comes with Node.js)

## Step-by-Step Setup

### 1. Install Node.js
- Go to https://nodejs.org/
- Download and install Node.js (LTS version recommended)
- Verify installation by opening command prompt/terminal and running:
  ```
  node --version
  npm --version
  ```

### 2. Navigate to Project Directory
Open command prompt/PowerShell and navigate to the bookkeeping-app folder:
```
cd path\to\bookkeeping-app
```

### 3. Install Dependencies
Install all required packages:
```
npm install
```

This will install:
- Next.js 14
- React 18
- Tailwind CSS
- better-sqlite3 (SQLite database)
- TypeScript

The installation may take a few minutes.

### 4. Start Development Server
Run the development server:
```
npm run dev
```

You should see output like:
```
▲ Next.js 14.2.0
- Local: http://localhost:3000
```

### 5. Open in Browser
Open your browser and go to: **http://localhost:3000**

You should see the Bookkeeping App home page with navigation menu.

## First Time Use

### Create Your First Client
1. Click "Clients" in the navigation menu
2. Click "Add Client" button
3. Enter a client name (e.g., "ABC Company")
4. Enter email and address (optional)
5. Click "Create Client"

### Create Your First Transaction
1. Click "New Transaction" in navigation or home page
2. Select the client you just created
3. Choose transaction type (e.g., "Receipt")
4. Enter date (today's date)
5. Enter amount (e.g., 100.00)
6. Select an account (e.g., "1000 - Cash")
7. Enter a description (e.g., "Payment received")
8. Optionally upload a document
9. Click "Create Transaction"

### View Your Reports
1. Click "Balance Sheet" to see financial position
2. Click "Income Statement" to see income vs expenses
3. Use the month selector to view different periods

## Stopping the Server

In your command prompt/terminal, press **Ctrl+C** to stop the server.

## Building for Production

When ready to deploy:
```
npm run build
npm start
```

## Troubleshooting

### "npm: command not found"
- Node.js is not installed or not in your PATH
- Restart your computer after installing Node.js
- Or use the full path to npm

### "Port 3000 is already in use"
- Another app is using port 3000
- Stop the other app, or modify Next.js to use a different port:
  ```
  npm run dev -- -p 3001
  ```

### Database file not found
- The database is automatically created on first run
- If it doesn't work, check folder permissions

### Uploaded documents not saving
- Ensure the `public/uploads/` folder exists and is writable
- The app will create it automatically

## Next Steps

1. Test with sample data (create 2-3 clients and 5-10 transactions)
2. Generate reports and verify accuracy
3. Try uploading sample documents
4. Once comfortable, expand the features or customize as needed

Enjoy your bookkeeping app!
