const http = require('http');

const ports = [3003, 3002, 3000];

async function testPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ port, success: true, status: res.statusCode });
        } else {
          resolve({ port, success: false, status: res.statusCode });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ port, success: false, error: err.message });
    });
  });
}

async function findServer() {
  console.log('Testing ports for running Next.js dev server...');
  for (const port of ports) {
    const result = await testPort(port);
    if (result.success) {
      console.log(`✓ Found running server on port ${port}`);
      process.exit(0);
    } else if (result.status) {
      console.log(`✓ Server responding on port ${port} (status: ${result.status})`);
      process.exit(0);
    }
  }
  console.log('✗ No running server found');
  process.exit(1);
}

findServer();
