import { app } from "./app.js";
import { readConfig } from "./config.js";
import { checkDatabase, prisma } from "./prisma.js";

const { host, port } = readConfig();
try {
  await checkDatabase();
  const server = app.listen(port, host, () => console.log(`Servidor disponible en http://${host}:${port}`));
  server.on("error", async () => {
    console.error("No se pudo abrir el puerto del servidor");
    await prisma.$disconnect();
    process.exitCode = 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => server.close(async () => { await prisma.$disconnect(); }));
  }
} catch {
  console.error("No se pudo conectar o consultar grupo_1.usuarios. Revise DATABASE_URL, credenciales y permisos");
  await prisma.$disconnect();
  process.exitCode = 1;
}
