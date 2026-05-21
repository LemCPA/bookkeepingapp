const http = require('http');

async function testServer() {
  console.log('Testing server on port 3000...');

  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString().slice(0, 300);
      });
      res.on('end', () => {
        console.log(`✓ Server is responding on port 3000`);
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log(`✓ Page loaded successfully`);
        } else {
          console.log(`Content preview: ${data.slice(0, 200)}`);
        }
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log(`✗ Connection on port 3000 failed: ${err.message}`);
      resolve(false);
    });
  });
}

testServer().then(success => {
  process.exit(success ? 0 : 1);
});
