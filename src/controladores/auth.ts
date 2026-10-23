import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

const registroSchema = z.object({
  nombre: z.string().trim().min(1).max(150),
  correo: z.string().trim().toLowerCase().email().max(254),
  clave: z.string().min(12).refine(value => Buffer.byteLength(value, "utf8") <= 72),
}).strict();

export async function registrarUsuario(req: Request, res: Response) {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos de registro inválidos", campos: [...new Set(parsed.error.issues.map(issue => issue.path[0] ?? "body"))] });
    return;
  }
  const { nombre, correo, clave } = parsed.data;
  const claveHash = await bcrypt.hash(clave, 12);
  try {
    const usuario = await prisma.usuario.create({
      data: { nombre, correo, clave: claveHash },
      select: { id: true, nombre: true, correo: true, creadoEn: true },
    });
    res.status(201).json(usuario);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: "Ese correo ya está registrado" });
      return;
    }
    throw error;
  }
}
