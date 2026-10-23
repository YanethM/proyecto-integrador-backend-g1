import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import bcrypt from "bcryptjs";
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
    const response = await post({ nombre: "  Ana Peña  ", correo: ` ${correo.toUpperCase()} `, clave });
    assert.equal(response.status, 201);
    const usuario = await response.json();
    assert.equal(usuario.nombre, "Ana Peña");
    assert.equal(usuario.correo, correo);
    assert.equal("equipo" in usuario, false);
    assert.equal("clave" in usuario, false);
    const stored = await prisma.usuario.findUniqueOrThrow({ where: { correo } });
    assert.notEqual(stored.clave, clave);
    assert.ok(await bcrypt.compare(clave, stored.clave));
    assert.equal((await post({ nombre: "Ana", correo, clave })).status, 409);
    for (const body of [
      {}, { nombre: " ", correo, clave }, { nombre: "Ana", correo: "invalido", clave },
      { nombre: "Ana", correo, clave: "corta" }, { nombre: "Ana", correo, clave, equipo: 2 },
      { nombre: "Ana", correo, clave: "ñ".repeat(37) },
      { nombre: "Ana", correo, clave, rol: "admin" },
    ]) assert.equal((await post(body)).status, 400);
    const malformed = await fetch(`${base}/auth/registro`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400);
    const raceEmail = `race-${crypto.randomUUID()}@example.com`;
    const concurrent = await Promise.all([post({ nombre: "Ana", correo: raceEmail, clave }), post({ nombre: "Ana", correo: raceEmail, clave })]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [201, 409]);
    assert.equal((await fetch(`${base}/usuarios`)).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
