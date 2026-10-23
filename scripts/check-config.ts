import { readConfig } from "../src/config.js";

try {
  const config = readConfig();
  const url = new URL(config.databaseUrl);
  const projectRef = process.env["SUPABASE_PROJECT_REF"];
  const target = !!projectRef && (url.hostname.includes(projectRef) || decodeURIComponent(url.username).endsWith(`.${projectRef}`));
  console.log(`Destino: ${url.hostname}:${url.port || "5432"}; esquema: grupo_1; proyecto Supabase esperado: ${target ? "sí" : "no"}`);
  const { checkDatabase, prisma } = await import("../src/prisma.js");
  try {
    await checkDatabase();
    console.log("OK: conexión y columnas de grupo_1.usuarios verificadas");
  } finally {
    await prisma.$disconnect();
  }
} catch {
  console.error("Configuración fallida: revise DATABASE_URL, disponibilidad, credenciales y acceso a grupo_1.usuarios");
  process.exitCode = 1;
}
