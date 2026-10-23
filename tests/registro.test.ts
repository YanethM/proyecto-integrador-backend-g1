import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readConfig } from "../src/config.js";

test("configuración rechaza URL y puerto inválidos", () => {
  assert.throws(() => readConfig({}));
  assert.throws(() => readConfig({ DATABASE_URL: "https://example.com/db" }));
  assert.throws(() => readConfig({ DATABASE_URL: "postgresql://test@localhost/test", PORT: "0" }));
});

test("registro HTTP con PostgreSQL aislado", { skip: !process.env["TEST_DATABASE_URL"] }, async () => {
  const url = new URL(process.env["TEST_DATABASE_URL"]!);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/registro_test");
  process.env["DATABASE_URL"] = url.toString();
  const { app } = await import("../src/app.js");
  const { prisma, checkDatabase } = await import("../src/prisma.js");
  await checkDatabase();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const correo = `test-${crypto.randomUUID()}@example.com`;
  const clave = "ClaveDePrueba123!";
  const post = (body: unknown) => fetch(`${base}/auth/registro`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  try {
    const response = await post({ nombres: "  Ana Peña  ", correo: ` ${correo.toUpperCase()} `, clave });
    assert.equal(response.status, 201);
    const usuario = await response.json();
    assert.equal(usuario.perfil.nombres, "Ana Peña");
    assert.equal(usuario.correo, correo);
    assert.match(usuario.id, /^[0-9a-f-]{36}$/);
    assert.equal("equipo" in usuario, false);
    assert.equal("clave" in usuario, false);
    const stored = await prisma.usuario.findUniqueOrThrow({ where: { correo } });
    assert.notEqual(stored.clave, clave);
    assert.ok(await bcrypt.compare(clave, stored.clave));
    assert.equal((await post({ nombres: "Ana", correo, clave })).status, 409);
    for (const body of [
      {}, { nombres: " ", correo, clave }, { nombres: "Ana", correo: "invalido", clave },
      { nombres: "Ana", correo, clave: "corta" }, { nombres: "Ana", correo, clave, equipo: 2 },
      { nombres: "Ana", correo, clave: "ñ".repeat(37) },
      { nombres: "Ana", correo, clave, rol: "admin" },
    ]) assert.equal((await post(body)).status, 400);
    const malformed = await fetch(`${base}/auth/registro`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400);
    const raceEmail = `race-${crypto.randomUUID()}@example.com`;
    const concurrent = await Promise.all([post({ nombres: "Ana", correo: raceEmail, clave }), post({ nombres: "Ana", correo: raceEmail, clave })]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [201, 409]);
    assert.equal((await fetch(`${base}/usuarios`)).status, 404);
    const login = (password: string) => fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo, clave: password }) });
    assert.equal((await login("incorrecta")).status, 401);
    const session = await login(clave);
    assert.equal(session.status, 200);
    const sessionBody = await session.json();
    assert.equal("clave" in sessionBody.usuario, false);
    const headers = { Authorization: `Bearer ${sessionBody.token}` };
    const perfil = await fetch(`${base}/auth/perfil`, { headers });
    assert.equal(perfil.status, 200);
    assert.equal((await perfil.json()).id, usuario.id);
    assert.equal((await fetch(`${base}/auth/perfil`)).status, 401);
    assert.equal((await fetch(`${base}/auth/perfil`, { headers: { Authorization: "Bearer invalido" } })).status, 401);
    await prisma.perfil.update({ where: { id: usuario.id }, data: { estado: "bloqueado" } });
    assert.equal((await fetch(`${base}/auth/perfil`, { headers })).status, 401);
    assert.equal((await login(clave)).status, 401);
    const jwtOptions = { subject: usuario.id, algorithm: "HS256" as const, issuer: "proyecto-integrador-grupo-1", audience: "grupo-1" };
    for (const token of [
      jwt.sign({}, process.env["JWT_SECRET"]!, { ...jwtOptions, expiresIn: -1 }),
      jwt.sign({}, process.env["JWT_SECRET"]!, { ...jwtOptions, audience: "grupo-2", expiresIn: "2h" }),
    ]) assert.equal((await fetch(`${base}/auth/perfil`, { headers: { Authorization: `Bearer ${token}` } })).status, 401);
    const documento = crypto.randomUUID();
    assert.equal((await post({ nombres: "Ana", correo: `doc-${correo}`, clave, numeroDocumento: documento })).status, 201);
    const failedEmail = `rollback-${correo}`;
    assert.equal((await post({ nombres: "Otra", correo: failedEmail, clave, numeroDocumento: documento })).status, 409);
    assert.equal(await prisma.usuario.count({ where: { correo: failedEmail } }), 0);
    const tablas = await prisma.$queryRaw<Array<{ total: bigint; protegidas: bigint }>>`SELECT count(*) AS total, count(*) FILTER (WHERE relrowsecurity) AS protegidas FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='grupo_1' AND c.relkind='r'`;
    assert.equal(Number(tablas[0]?.total), 27);
    assert.equal(Number(tablas[0]?.protegidas), 27);
    const perfiles = await prisma.perfil.count({ where: { id: usuario.id } });
    assert.equal(perfiles, 1);
    const roles = await prisma.$queryRaw<Array<{ total: bigint }>>`SELECT count(*) AS total FROM grupo_1.usuario_roles WHERE usuario_id = ${usuario.id}::uuid`;
    assert.equal(Number(roles[0]?.total), 0);

  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
