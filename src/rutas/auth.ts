import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { registrarUsuario, iniciarSesion, obtenerPerfil } from "../controladores/auth.js";

export const authRouter = Router();
const limitarIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intente más tarde" },
});
authRouter.post("/registro", limitarIntentos, registrarUsuario);
authRouter.post("/login", limitarIntentos, iniciarSesion);
authRouter.get("/perfil", obtenerPerfil);
