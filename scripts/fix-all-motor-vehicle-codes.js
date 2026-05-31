#!/usr/bin/env node

/**
 * Fix Motor Vehicle Expenses account codes for ALL users
 * Aligns all Motor Vehicle accounts to match DEFAULT_ACCOUNTS exactly
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../.data/bookkeeping.json');

console.log('Reading database...');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// Expected codes based on DEFAULT_ACCOUNTS
const expectedCodes = {
  'Motor Vehicle Expenses': '5220',
  'Motor Vehicle Expenses - Fuel': '5221',
  'Motor Vehicle Expenses - Interest (Loan)': '5222',
  'Motor Vehicle Expenses - Insurance': '5223',
  'Motor Vehicle Expenses - Licence and Registration': '5224',
  'Motor Vehicle Expenses - Maintenance and Repairs': '5225',
  'Motor Vehicle Expenses - Parking and Tolls': '5226',
  'Motor Vehicle Expenses - Other': '5227',
};

// Get all users
const users = db.users.map(u => u.id);

console.log(`Found ${users.length} users. Fixing Motor Vehicle Expenses codes...\n`);

let totalChanged = 0;

users.forEach(userId => {
  // Get all Motor Vehicle accounts for this user
  const motorVehicleAccounts = db.chart_of_accounts
    .filter(a => a.user_id === userId && a.name.includes('Motor Vehicle'))
    .sort((a, b) => a.id - b.id);

  if (motorVehicleAccounts.length === 0) {
    console.log(`User ${userId}: No Motor Vehicle accounts found`);
    return;
  }

  console.log(`User ${userId}:`);
  let userChanged = 0;

  motorVehicleAccounts.forEach(account => {
    const expectedCode = expectedCodes[account.name];
    if (expectedCode && account.code !== expectedCode) {
      console.log(`  ID ${account.id}: ${account.code} → ${expectedCode} (${account.name})`);
      account.code = expectedCode;
      userChanged++;
      totalChanged++;
    } else if (expectedCode) {
      console.log(`  ID ${account.id}: ✓ ${account.code} (${account.name})`);
    } else {
      console.log(`  ID ${account.id}: ⚠ ${account.code} (${account.name}) - not in DEFAULT_ACCOUNTS, keeping as-is`);
    }
  });

  console.log(`  → Changed ${userChanged} codes\n`);
});

console.log(`Total accounts fixed: ${totalChanged}`);

console.log('\nWriting corrected database...');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log('✅ All Motor Vehicle Expenses accounts fixed!');
