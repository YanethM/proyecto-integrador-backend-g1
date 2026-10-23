import express from "express";
import cors from "cors";
import { readConfig } from "./config.js";
import { prisma } from "./prisma.js";
import type { ErrorRequestHandler } from "express";
import { authRouter } from "./rutas/auth.js";

export const app = express();
const { corsOrigins, trustProxyHops } = readConfig();
app.disable("x-powered-by");
app.set("trust proxy", trustProxyHops);
app.get("/health", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !corsOrigins.includes(origin)) {
    res.status(403).json({ error: "Origen no autorizado" });
    return;
  }
  next();
});
app.use(cors({ origin: corsOrigins, methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"], maxAge: 600 }));
app.use(express.json({ limit: "16kb" }));
app.use("/auth", authRouter);
app.use((_req, res) => { res.status(404).json({ error: "Ruta no encontrada" }); });
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON inválido" });
    return;
  }
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "Solicitud demasiado grande" });
    return;
  }
  res.status(503).json({ error: "No se pudo completar la solicitud. Intente más tarde" });
};
app.use(errorHandler);
