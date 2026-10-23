import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const container = `integrador-g1-registro-test-${process.pid}`;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`${command} falló: ${result.stderr ?? ''}`);
  return result.stdout?.trim();
}
try {
  run('docker', ['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_PASSWORD=local_test_only', '-e', 'POSTGRES_DB=registro_test', '-p', '127.0.0.1::5432', 'postgres:17-alpine']);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres']);
    if (result.status === 0) { ready = true; break; }
    await setTimeout(500);
  }
  if (!ready) throw new Error('PostgreSQL no inició');
  const port = run('docker', ['port', container, '5432/tcp']).split(':').at(-1);
  const sql = 'CREATE ROLE anon; CREATE ROLE authenticated;\n' + readFileSync('supabase/sql/20261023_asisco_grupo_1.sql', 'utf8');
  run('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'registro_test', '-v', 'ON_ERROR_STOP=1', '-q'], { input: sql });
  const result = spawnSync('npm', ['test'], { stdio: 'inherit', env: { ...process.env, TEST_DATABASE_URL: `postgresql://postgres:local_test_only@127.0.0.1:${port}/registro_test` } });
  process.exitCode = result.status ?? 1;
} finally {
  spawnSync('docker', ['stop', container], { stdio: 'ignore' });
}
