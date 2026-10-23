import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { readConfig } from "./config.js";

const adapter = new PrismaPg({
  connectionString: readConfig().databaseUrl,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
  max: 5,
});
export const prisma = new PrismaClient({ adapter });

export async function checkDatabase() {
  await prisma.$queryRaw`SELECT u.id, u.correo, u.clave, u.creado_en, p.nombres, p.apellidos, p.estado FROM grupo_1.usuarios u LEFT JOIN grupo_1.perfiles p ON p.id = u.id LIMIT 0`;
}
