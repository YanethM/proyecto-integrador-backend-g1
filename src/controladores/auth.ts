import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { readConfig } from "../config.js";
import { Prisma } from "../../generated/prisma/client.js";

const { jwtSecret } = readConfig();
const issuer = "proyecto-integrador-grupo-1";
const audience = "grupo-1";
const correoSchema = z.string().trim().toLowerCase().email().max(254);
const registroSchema = z.object({
  nombres: z.string().trim().min(1).max(150),
  apellidos: z.string().trim().min(1).max(150).optional(),
  celular: z.string().trim().min(1).max(30).optional(),
  tipoDocumento: z.string().trim().min(1).max(30).optional(),
  numeroDocumento: z.string().trim().min(1).max(50).optional(),
  correo: correoSchema,
  clave: z.string().min(12).refine(value => Buffer.byteLength(value, "utf8") <= 72),
}).strict();
const loginSchema = z.object({
  correo: correoSchema,
  clave: z.string().min(1).refine(value => Buffer.byteLength(value, "utf8") <= 72),
}).strict();
const perfilSelect = { nombres: true, apellidos: true, celular: true, tipoDocumento: true, numeroDocumento: true, estado: true } as const;
const usuarioSelect = { id: true, correo: true, creadoEn: true, perfil: { select: perfilSelect } } as const;

export async function registrarUsuario(req: Request, res: Response) {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos de registro inválidos", campos: [...new Set(parsed.error.issues.map(issue => issue.path[0] ?? "body"))] });
    return;
  }
  const { correo, clave, nombres, apellidos, celular, tipoDocumento, numeroDocumento } = parsed.data;
  const claveHash = await bcrypt.hash(clave, 12);
  try {
    const usuario = await prisma.usuario.create({
      data: {
        correo, clave: claveHash,
        perfil: { create: { nombres, apellidos: apellidos ?? null, celular: celular ?? null, tipoDocumento: tipoDocumento ?? null, numeroDocumento: numeroDocumento ?? null } },
      },
      select: usuarioSelect,
    });
    res.status(201).json(usuario);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: "El correo o documento ya está registrado" });
      return;
    }
    throw error;
  }
}

export async function iniciarSesion(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Correo y clave inválidos" });
    return;
  }
  const usuario = await prisma.usuario.findUnique({ where: { correo: parsed.data.correo }, select: { ...usuarioSelect, clave: true } });
  if (!usuario || !(await bcrypt.compare(parsed.data.clave, usuario.clave)) || usuario.perfil?.estado !== "activo") {
    res.status(401).json({ error: "Correo o contraseña incorrectos, o cuenta no disponible" });
    return;
  }
  const token = jwt.sign({}, jwtSecret, { subject: usuario.id, algorithm: "HS256", expiresIn: "2h", issuer, audience });
  const { clave: _clave, ...datos } = usuario;
  res.setHeader("Cache-Control", "no-store");
  res.json({ token, usuario: datos });
}

export async function obtenerPerfil(req: Request, res: Response) {
  const authorization = req.headers.authorization;
  const bearer = authorization?.match(/^Bearer (\S+)$/i);
  let id: string;
  try {
    if (!bearer?.[1]) throw new Error("Token ausente");
    const payload = jwt.verify(bearer[1], jwtSecret, { algorithms: ["HS256"], issuer, audience });
    if (typeof payload === "string" || !z.string().uuid().safeParse(payload.sub).success) throw new Error("Token inválido");
    id = payload.sub!;
  } catch {
    res.status(401).json({ error: "Token inválido o vencido" });
    return;
  }
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: usuarioSelect });
  if (usuario?.perfil?.estado !== "activo") {
    res.status(401).json({ error: "Usuario no disponible" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(usuario);
}
