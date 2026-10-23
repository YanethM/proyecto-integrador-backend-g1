import "dotenv/config";

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const value = env["DATABASE_URL"];
  if (!value) throw new Error("Falta DATABASE_URL en el archivo .env");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL no es una URL válida");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2) {
    throw new Error("DATABASE_URL debe contener una conexión PostgreSQL");
  }
  if (url.hostname.includes("oovoswegjrisiqhumkya") || decodeURIComponent(url.username).endsWith(".oovoswegjrisiqhumkya")) {
    throw new Error("La conexión corresponde al grupo 2; configure la base independiente del grupo 1");
  }
  const port = Number(env["PORT"] ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT debe estar entre 1 y 65535");
  const jwtSecret = env["JWT_SECRET"];
  if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) throw new Error("JWT_SECRET debe tener al menos 32 bytes");
  return { jwtSecret, databaseUrl: value, port, host: env["HOST"] ?? "127.0.0.1" };
}
