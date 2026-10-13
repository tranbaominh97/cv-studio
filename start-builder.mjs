import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Standalone CV Creator & Scoring Dashboard...');

// Start Express Backend
const backend = spawn('node', [`"${path.join(__dirname, 'server.mjs')}"`], {
  stdio: 'inherit',
  shell: true
});

// Start Vite Frontend
const frontend = spawn('npx', ['vite', `"${__dirname}"`], {
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => {
  console.error('❌ Failed to start Backend server:', err);
});

frontend.on('error', (err) => {
  console.error('❌ Failed to start Vite frontend server:', err);
});

const cleanup = () => {
  console.log('\nStopping servers...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
