const http = require('http');

async function testServer() {
  console.log('Testing server on port 3001...');

  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001', { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString().slice(0, 200);
      });
      res.on('end', () => {
        console.log(`✓ Server is responding on port 3001`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Content preview: ${data.slice(0, 100)}`);
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log(`✗ Connection failed: ${err.message}`);
      resolve(false);
    });
  });
}

testServer().then(success => {
  process.exit(success ? 0 : 1);
});
