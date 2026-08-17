// ============================================================================
// scripts/dev.mjs — RUN BOTH HALVES AT ONCE
// ============================================================================
//
// Development needs two processes now:
//
//   - Vite on :5173, serving the React app with hot reloading
//   - Node on :3000, serving the API
//
// Vite proxies /api through to Node (see vite.config.js), so the browser only
// ever talks to :5173 and cookies behave as if there were one server.
//
// Most projects reach for a package like `concurrently` to do this. Twenty
// lines of Node does the same job without another dependency — and shows what
// that package is actually doing.
//
//     npm run dev   ->  open http://localhost:5173
// ============================================================================

import { spawn } from 'node:child_process';

const children = [];

function run(name, command, args) {
  const child = spawn(command, args, {
    // Inherit means the child's output goes straight to this terminal, so you
    // see Vite's messages and the server's request log interleaved.
    stdio: 'inherit',
    // Required on Windows: npm and npx are .cmd shims, not real executables,
    // so spawn cannot launch them without a shell.
    shell: true,
  });

  child.on('exit', (code) => {
    // If either half dies, stop the other. A running API with no frontend
    // looks like the app is broken rather than like a crash.
    console.log(`\n  ${name} exited (${code}). Stopping.`);
    stop();
    process.exit(code ?? 0);
  });

  children.push(child);
  return child;
}

function stop() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

// Ctrl+C reaches this process; pass it on rather than orphaning the children.
process.on('SIGINT', () => {
  stop();
  process.exit(0);
});

console.log('\n  Starting the API on :3000 and Vite on :5173…');
console.log('  Open http://localhost:5173\n');

run('api', 'node', ['--watch', 'server.js']);
run('vite', 'npx', ['vite']);
