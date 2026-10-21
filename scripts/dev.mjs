import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiOrigin = (process.env.API_ORIGIN || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const apiReadyUrl = `${apiOrigin}/health/ready`;
const startupTimeoutMs = 15 * 60 * 1000;
const pollIntervalMs = 2000;

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      ...options,
    });

    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (signal) {
        rejectRun(new Error(`${command} was stopped by ${signal}`));
      } else if (code !== 0) {
        rejectRun(new Error(`${command} exited with code ${code}`));
      } else {
        resolveRun();
      }
    });
  });
}

async function waitForApi() {
  const deadline = Date.now() + startupTimeoutMs;
  let nextNoticeAt = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(apiReadyUrl, { signal: AbortSignal.timeout(3000) });
      if (response.ok) return;
    } catch {
      // The API may need time for its database migration, reference import, and model setup.
    }

    if (Date.now() >= nextNoticeAt) {
      console.log('Still waiting for the local API to become ready…');
      nextNoticeAt = Date.now() + 30_000;
    }

    await delay(pollIntervalMs);
  }

  throw new Error(`The API did not become ready within 15 minutes (${apiReadyUrl}).`);
}

async function main() {
  console.log('Starting the Classroom Studio backend with Docker Compose…');
  await run('docker', [
    'compose', 'up', '-d', 'postgres', 'redis', 'exporter', 'api', 'worker', 'beat',
  ]);

  console.log('Waiting for the API health check…');
  await waitForApi();

  console.log('Starting Vite at http://localhost:5173 …');
  const vitePath = resolve(projectRoot, 'node_modules/vite/bin/vite.js');
  const vite = spawn(process.execPath, [vitePath, '--host', '0.0.0.0'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  const forwardSignal = (signal) => {
    if (!vite.killed) vite.kill(signal);
  };
  process.once('SIGINT', forwardSignal);
  process.once('SIGTERM', forwardSignal);

  const exitCode = await new Promise((resolveExit, rejectExit) => {
    vite.once('error', rejectExit);
    vite.once('exit', (code, signal) => resolveExit(signal ? 1 : code ?? 1));
  });

  process.removeListener('SIGINT', forwardSignal);
  process.removeListener('SIGTERM', forwardSignal);
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  if (error.message.includes('docker')) {
    console.error('Start Docker Desktop and confirm its engine is running, then run npm run dev again.');
  } else {
    console.error('Check the backend with: docker compose ps');
    console.error('For startup logs, run: docker compose logs api reference-import ollama-model');
  }
  process.exitCode = 1;
});
