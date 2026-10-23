import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { registrarUsuario } from "../controladores/auth.js";

export const authRouter = Router();
authRouter.post("/registro", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intente más tarde" },
}), registrarUsuario);
