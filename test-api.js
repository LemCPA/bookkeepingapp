const fs = require('fs');
const path = require('path');

// Check if .env.local exists and read it
const envPath = path.join('D:\Claude\bookkeeping-app', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
console.log('Environment file content:');
console.log(envContent);
console.log('');

// Parse the API key
const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
if (match) {
  const apiKey = match[1].trim();
  console.log(`API Key length: ${apiKey.length}`);
  console.log(`API Key starts with: ${apiKey.substring(0, 20)}...`);
  console.log(`API Key ends with: ...${apiKey.substring(apiKey.length - 20)}`);
  console.log('');
  
  if (apiKey.startsWith('sk-ant-')) {
    console.log('✓ API key format looks correct');
  } else {
    console.log('✗ API key format may be incorrect');
  }
} else {
  console.log('✗ Could not find ANTHROPIC_API_KEY in .env.local');
}
