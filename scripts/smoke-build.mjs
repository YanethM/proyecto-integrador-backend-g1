import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';

const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const server = spawn(process.execPath, ['dist/src/server.js'], {
  env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), CORS_ORIGINS: 'https://equipo.example.com', TRUST_PROXY_HOPS: '1' },
  stdio: ['ignore', 'ignore', 'inherit'],
});
const stopped = once(server, 'exit');
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error('El servidor compilado no inició');
    try { ready = (await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch {}
    if (ready) break;
    await setTimeout(250);
  }
  assert.ok(ready, 'El servidor compilado debe responder /health');
  const correo = `render-${crypto.randomUUID()}@example.com`;
  const clave = 'ClavePruebaRender123!';
  const headers = { 'Content-Type': 'application/json', Origin: 'https://equipo.example.com' };
  const registro = await fetch(`${base}/auth/registro`, { method: 'POST', headers, body: JSON.stringify({ nombres: 'Prueba Render', correo, clave }) });
  assert.equal(registro.status, 201);
  assert.equal(registro.headers.get('access-control-allow-origin'), headers.Origin);
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers, body: JSON.stringify({ correo, clave }) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const perfil = await fetch(`${base}/auth/perfil`, { headers: { Origin: headers.Origin, Authorization: `Bearer ${token}` } });
  assert.equal(perfil.status, 200);
  assert.equal((await perfil.json()).correo, correo);
  console.log('OK: servidor compilado en producción, health, CORS, registro, login y perfil');
} finally {
  if (server.exitCode === null) server.kill('SIGTERM');
  await stopped;
}
