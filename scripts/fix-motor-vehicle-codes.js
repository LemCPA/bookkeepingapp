#!/usr/bin/env node

/**
 * Fix Motor Vehicle Expenses account codes - correct the duplicate 5223
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../.data/bookkeeping.json');

console.log('Reading database...');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log('Fixing Motor Vehicle Expenses codes for user 4...\n');

// Find and fix ID 37 (Interest/Loan) - should be 5222 not 5223
const id37 = db.chart_of_accounts.find(a => a.id === 37);
if (id37) {
  console.log(`Before: ID 37 - ${id37.code} ${id37.name}`);
  id37.code = '5222';
  console.log(`After:  ID 37 - ${id37.code} ${id37.name}`);
}

// Verify ID 38 (Insurance) - should be 5223 (which it is)
const id38 = db.chart_of_accounts.find(a => a.id === 38);
if (id38) {
  console.log(`\nVerified: ID 38 - ${id38.code} ${id38.name}`);
}

console.log('\nMotor Vehicle Expenses account structure (user 4):');
db.chart_of_accounts
  .filter(a => a.user_id === 4 && a.code >= '5220' && a.code <= '5227')
  .sort((a, b) => a.code.localeCompare(b.code))
  .forEach(a => {
    console.log(`  ${a.code} - ${a.name}`);
  });

console.log('\nWriting corrected database...');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log('✅ Motor Vehicle Expenses codes fixed!');
