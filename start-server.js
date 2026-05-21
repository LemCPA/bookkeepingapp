#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
  console.log('Starting Next.js development server...');
  console.log('Working directory:', process.cwd());

  // Ensure node_modules exists
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('node_modules not found, running npm install first...');
    execSync('npm install', { cwd: process.cwd(), stdio: 'inherit' });
  }

  // Start the dev server
  console.log('\nStarting dev server on port 3000...');
  execSync('npm run dev', {
    cwd: process.cwd(),
    stdio: 'inherit',
    timeout: 300000 // 5 minute timeout
  });
} catch (error) {
  console.error('Error starting dev server:', error.message);
  process.exit(1);
}
