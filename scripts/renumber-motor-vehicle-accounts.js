#!/usr/bin/env node

/**
 * Properly renumber Motor Vehicle Expenses accounts for user 4 (ted@lemcpa.ca)
 * Corrects codes to match DEFAULT_ACCOUNTS exactly
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../.data/bookkeeping.json');

console.log('Reading database...');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// Get all Motor Vehicle Expenses accounts for user 4
const motorVehicleAccounts = db.chart_of_accounts
  .filter(a => a.user_id === 4 && a.name.includes('Motor Vehicle'))
  .sort((a, b) => a.id - b.id);

console.log('Current Motor Vehicle Expenses accounts (user 4):');
motorVehicleAccounts.forEach(a => {
  console.log(`  ID ${a.id}: ${a.code} - ${a.name}`);
});

// Create mapping based on account names
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

console.log('\nApplying correct codes based on account names:');
let changed = 0;

motorVehicleAccounts.forEach(account => {
  const expectedCode = expectedCodes[account.name];
  if (expectedCode && account.code !== expectedCode) {
    console.log(`  ID ${account.id}: ${account.code} → ${expectedCode} (${account.name})`);
    account.code = expectedCode;
    changed++;
  } else if (expectedCode) {
    console.log(`  ID ${account.id}: ✓ ${account.code} (${account.name})`);
  }
});

console.log(`\n✓ Changed ${changed} account codes`);

console.log('\nFinal Motor Vehicle Expenses structure (user 4):');
db.chart_of_accounts
  .filter(a => a.user_id === 4 && a.name.includes('Motor Vehicle'))
  .sort((a, b) => a.code.localeCompare(b.code))
  .forEach(a => {
    console.log(`  ${a.code} - ${a.name}`);
  });

console.log('\nWriting corrected database...');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log('✅ Motor Vehicle Expenses accounts renumbered!');
