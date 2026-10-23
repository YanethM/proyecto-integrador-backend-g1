import express from "express";
import type { ErrorRequestHandler } from "express";
import { authRouter } from "./rutas/auth.js";

export const app = express();
app.disable("x-powered-by");
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
