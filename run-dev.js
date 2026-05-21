const { spawn } = require('child_process');
const fs = require('fs');

const logStream = fs.createWriteStream('dev-server.log', { flags: 'a' });

console.log('Starting dev server...');
logStream.write(`\n=== Dev Server Started at ${new Date().toISOString()} ===\n`);

const child = spawn('cmd', ['/c', 'npm run dev'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, PATH: process.env.PATH + ';C:\\Program Files\\nodejs' }
});

child.stdout.pipe(logStream);
child.stderr.pipe(logStream);
child.stdout.on('data', (data) => {
  console.log(data.toString());
});
child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('error', (error) => {
  console.error('Failed to start process:', error);
  logStream.write(`Error: ${error}\n`);
});

child.on('exit', (code, signal) => {
  console.log(`Process exited with code ${code} and signal ${signal}`);
  logStream.write(`\nProcess exited with code ${code} and signal ${signal}\n`);
});
