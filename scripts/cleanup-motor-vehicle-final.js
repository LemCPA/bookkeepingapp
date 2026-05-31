#!/usr/bin/env node

/**
 * Final cleanup - Remove duplicate/wrong Motor Vehicle accounts
 * Keep only accounts that match DEFAULT_ACCOUNTS
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../.data/bookkeeping.json');

console.log('Reading database...');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// Accounts to DELETE (duplicates/wrong names not in DEFAULT_ACCOUNTS)
const accountsToDelete = [
  { userId: 1, name: 'Motor Vehicle Expenses - Fuel and Oil' },           // Wrong name - replaced by 5221
  { userId: 1, name: 'Motor Vehicle Expenses - Leasing' },               // Not in DEFAULT_ACCOUNTS
  { userId: 1, name: 'Motor Vehicle Expenses - Electricity (Zero-Emission Vehicles)' }, // Not in DEFAULT_ACCOUNTS
  { userId: 1, name: 'Motor Vehicle Expenses - Other Expenses' },        // Wrong name - should be "Motor Vehicle Expenses - Other"
  { userId: 1, name: 'Motor Vehicle Expenses - Business Parking Fees' }, // Wrong name - should be "Motor Vehicle Expenses - Parking and Tolls"
  { userId: 2, name: 'Motor Vehicle Expenses - Fuel and Oil' },          // Wrong name
  { userId: 2, name: 'Motor Vehicle Expenses - Other Expenses' },        // Wrong name
];

console.log('Removing duplicate/incorrect Motor Vehicle Expenses accounts...\n');

let deletedCount = 0;

accountsToDelete.forEach(({ userId, name }) => {
  const accountToDelete = db.chart_of_accounts.find(
    a => a.user_id === userId && a.name === name
  );

  if (accountToDelete) {
    console.log(`Deleting: User ${userId}, ID ${accountToDelete.id} - "${name}"`);
    db.chart_of_accounts = db.chart_of_accounts.filter(a => a.id !== accountToDelete.id);
    deletedCount++;
  }
});

console.log(`\n✓ Deleted ${deletedCount} incorrect accounts`);

console.log('\nFinal Motor Vehicle Expenses structure by user:');
const users = [...new Set(db.chart_of_accounts.map(a => a.user_id))];

users.forEach(userId => {
  const userMotorVehicle = db.chart_of_accounts
    .filter(a => a.user_id === userId && a.name.includes('Motor Vehicle'))
    .sort((a, b) => a.code.localeCompare(b.code));

  if (userMotorVehicle.length > 0) {
    console.log(`\n  User ${userId}:`);
    userMotorVehicle.forEach(a => {
      console.log(`    ${a.code} - ${a.name}`);
    });
  }
});

console.log('\nWriting corrected database...');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log('✅ Cleanup complete!');
