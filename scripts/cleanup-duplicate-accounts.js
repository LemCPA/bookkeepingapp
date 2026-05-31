#!/usr/bin/env node

/**
 * Cleanup script to fix account code misalignment
 * Realigns all Motor Vehicle Expense accounts to match DEFAULT_ACCOUNTS
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../.data/bookkeeping.json');

console.log('Reading database...');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// Map old accounts to new codes (user_id 4)
const codeMapping = {
  '5220': '5220', // Motor Vehicle Expenses (parent)
  // Need to insert 5221 (Fuel) - but it doesn't exist currently
  '5221': '5222', // Old Interest (Loan) code 5221 → 5222
  '5222': '5223', // Old Insurance code 5222 → 5223
  '5223': '5224', // Old Licence code 5223 → 5224
  '5224': '5225', // Old Maintenance code 5224 → 5225
  '5225': '5226', // Old Parking code 5225 → 5226
  '5226': '5227', // Old Other code 5226 → 5227
};

console.log('Fixing Motor Vehicle Expense accounts for user 4...\n');

let fixed = 0;
db.chart_of_accounts = db.chart_of_accounts.map(acc => {
  // Only fix accounts for user 4 (ted@lemcpa.ca)
  if (acc.user_id === 4 && codeMapping[acc.code]) {
    const oldCode = acc.code;
    acc.code = codeMapping[oldCode];
    console.log(`✓ ID ${acc.id}: ${oldCode} → ${acc.code} (${acc.name})`);
    fixed++;
  }
  return acc;
});

// Add missing 5221 - Motor Vehicle Expenses - Fuel
// Find the highest ID to assign a new one
const maxId = Math.max(...db.chart_of_accounts.map(a => a.id));
const newId = maxId + 1;

const fuelAccount = {
  id: newId,
  code: '5221',
  name: 'Motor Vehicle Expenses - Fuel',
  type: 'EXPENSE',
  user_id: 4
};

db.chart_of_accounts.push(fuelAccount);
console.log(`✓ ID ${newId}: Added 5221 (Motor Vehicle Expenses - Fuel)`);

// Re-sort the accounts by code for user 4
db.chart_of_accounts.sort((a, b) => {
  if (a.user_id === b.user_id) {
    return a.code.localeCompare(b.code);
  }
  return a.user_id - b.user_id;
});

console.log(`\n✓ Fixed ${fixed} accounts`);
console.log(`✓ Added 1 new account`);
console.log(`Total accounts: ${db.chart_of_accounts.length}`);

console.log('\nWriting cleaned database...');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log('✅ Cleanup and alignment complete!');
