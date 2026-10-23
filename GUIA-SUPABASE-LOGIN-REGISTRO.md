# Guía: base de datos compartida en Supabase con login y registro

Esta guía explica, paso a paso, cómo crear **una sola base de datos por grupo** en Supabase y cómo construir sobre ella un **registro** y un **login** de usuarios usando este proyecto (Node.js + TypeScript + Prisma).

Al final, los 5 equipos de cada grupo van a trabajar con la misma base de datos: si el Equipo 1 registra un usuario, el Equipo 4 lo ve de inmediato.

---

## 0. Cómo nos organizamos

Hay 2 grupos y cada grupo tiene su propia base de datos. Dentro de cada grupo hay 5 equipos que comparten esa base.

| Grupo   | Estudiantes | Equipos       | Proyecto en Supabase          |
| ------- | ----------- | ------------- | ----------------------------- |
| Grupo 1 | 19          | 1, 2, 3, 4, 5 | `proyecto-integrador-grupo-1` |
| Grupo 2 | 19          | 1, 2, 3, 4, 5 | `proyecto-integrador-grupo-2` |

En cada grupo se elige **una persona responsable** de la base de datos. Solo esa persona hace la **Parte A**. Todos los demás hacen solamente la **Parte B**.

| Quién                     | Qué hace                                                       |
| ------------------------- | -------------------------------------------------------------- |
| Responsable del grupo (1) | Parte A completa: crea Supabase, crea la tabla, sube el código |
| Resto del grupo (18)      | Parte B: descarga el código, configura el `.env` y lo ejecuta  |
| Todos                     | Respetan las reglas de oro (sección 4)                         |

> La "terminal" en VS Code se abre con el menú **Terminal > New Terminal o Ctrl ñ**.

---

## Parte A. Solo la persona responsable del grupo

### A1. Crear la cuenta en Supabase

1. Ir a https://supabase.com
2. Clic en **Start your project**.
3. Clic en **Continue with GitHub** (si no tiene cuenta de GitHub, crearla primero en https://github.com/signup).
4. Autorizar a Supabase.


### A2. Crear el proyecto (la base de datos)

1. Si pide crear una **organización**: nombre `Proyecto Integrador Grupo 1` (o `Grupo 2`), tipo **Educational**, plan **Free**. Clic en **Create organization**.
2. Clic en **New project** y llenar:

| Campo             | Qué poner                                                          |
| ----------------- | ------------------------------------------------------------------ |
| Project name      | `proyecto-integrador-grupo-1` (o `grupo-2`)                        |
| Database Password | Una contraseña **solo con letras y números**, mínimo 16 caracteres |
| Region            | **South America (São Paulo)**, la más cercana a Colombia           |
| Plan              | Free                                                               |

3. **Copiar la contraseña y guardarla** en un lugar seguro. Supabase no la vuelve a mostrar.
4. Clic en **Create new project** y esperar 1 o 2 minutos mientras dice *Setting up project*.

> Por qué solo letras y números: los símbolos como `@`, `#` o `/` dañan la dirección de conexión y causan errores difíciles de entender.

### A3. Copiar las direcciones de conexión

La aplicación necesita saber "dónde vive" la base de datos. Eso se indica con una dirección (URL de conexión).

1. Dentro del proyecto, clic en el botón **Connect** (arriba, en la barra superior).
2. Seleccionar la pestaña **Connection String**, tipo **URI**.
3. Buscar la sección **Transaction pooler** y copiar la dirección. Termina en `:6543/postgres`. Esta será `DATABASE_URL`.
4. Buscar la sección **Session pooler** y copiar la dirección. Termina en `:5432/postgres`. Esta será `DIRECT_URL`.
5. En ambas, reemplazar `[YOUR-PASSWORD]` (incluyendo los corchetes) por la contraseña del paso A2.

Ejemplo de cómo deben quedar (los valores reales serán distintos):

```
postgresql://postgres.abcdefghijk:MiClave123456789@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
postgresql://postgres.abcdefghijk:MiClave123456789@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

| Variable       | Puerto | Para qué se usa                                                     |
| -------------- | ------ | ------------------------------------------------------------------- |
| `DATABASE_URL` | 6543   | La usa el servidor cuando está corriendo. Soporta muchas conexiones |
| `DIRECT_URL`   | 5432   | La usa Prisma para crear o modificar tablas (migraciones)           |

> No usar la opción **Direct connection** (`db.xxxx.supabase.co`): en muchas redes de casa y de la universidad no funciona.

### A4. Preparar este proyecto

Abrir esta carpeta (`proyecto-integrador-backend`) en VS Code y abrir una terminal.

**1. Renombrar el archivo de configuración de Prisma.** Prisma busca un archivo llamado exactamente `prisma.config.ts`:

```bash
mv prisma7.config.ts prisma.config.ts
```

**2. Abrir `prisma.config.ts`** y reemplazar todo su contenido por:

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Las migraciones fallan a través del Transaction pooler (6543)
    url: process.env["DIRECT_URL"],
  },
});
```

**3. Instalar las librerías** que faltan para el servidor, el cifrado de contraseñas y los tokens de sesión:

```bash
npm install express cors bcryptjs jsonwebtoken
npm install --save-dev @types/express @types/cors @types/jsonwebtoken
```

| Librería       | Para qué sirve                                                  |
| -------------- | --------------------------------------------------------------- |
| `express`      | Crear el servidor y las rutas (`/auth/registro`, `/auth/login`) |
| `cors`         | Permitir que un frontend (React, Next.js) llame a este servidor |
| `bcryptjs`     | Guardar las contraseñas cifradas, nunca en texto plano          |
| `jsonwebtoken` | Crear el "token" que demuestra que el usuario ya inició sesión  |

**4. Abrir `package.json`** y reemplazar la sección `"scripts"` por:

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "postinstall": "prisma generate"
},
```

> `postinstall` hace que cada vez que alguien ejecute `npm install`, Prisma prepare automáticamente el código para hablar con la base de datos.

**5. Abrir `tsconfig.json`** y cambiar la línea `"types": [],` por:

```json
"types": ["node"],
```

**6. Crear la clave secreta para los tokens.** En la terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar el texto largo que aparece. Esa será `JWT_SECRET`.

**7. Abrir el archivo `.env`** y reemplazar todo su contenido por (con los valores reales de A3 y del paso anterior):

```
DATABASE_URL="postgresql://postgres.abcdefghijk:MiClave123456789@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.abcdefghijk:MiClave123456789@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="pegar-aqui-el-texto-largo-del-paso-6"
PORT=3000
```

**8. Abrir el archivo `.env.example`** y reemplazar su contenido por la misma estructura, pero **sin valores reales**. Este archivo sí se sube a GitHub y sirve de plantilla para los demás:

```
DATABASE_URL=""
DIRECT_URL=""
JWT_SECRET=""
PORT=3000
```

### A5. Crear el modelo `Usuario` (la "clase" de la base de datos)

Un **modelo** describe cómo es una tabla: qué columnas tiene y de qué tipo es cada una. Es parecido a una clase en programación: define la forma, y cada fila de la tabla es un objeto con esa forma.

Abrir `prisma/schema.prisma` y agregar **al final** del archivo:

```prisma
model Usuario {
  id       Int      @id @default(autoincrement())
  nombre   String
  correo   String   @unique
  clave    String
  equipo   Int?
  creadoEn DateTime @default(now())

  @@map("usuarios")
}
```

| Línea                                  | Qué significa                                                         |
| -------------------------------------- | --------------------------------------------------------------------- |
| `id Int @id @default(autoincrement())` | Número único de cada usuario. Se asigna solo: 1, 2, 3...              |
| `nombre String`                        | Texto obligatorio                                                     |
| `correo String @unique`                | Texto obligatorio. No pueden existir dos usuarios con el mismo correo |
| `clave String`                         | La contraseña **cifrada** (nunca la original)                         |
| `equipo Int?`                          | Número del equipo (1 a 5). El `?` significa que es opcional           |
| `creadoEn DateTime @default(now())`    | Fecha y hora del registro. Se llena sola                              |
| `@@map("usuarios")`                    | En Supabase la tabla se llamará `usuarios`                            |

### A6. Crear la tabla en Supabase (migración)

Una **migración** es el proceso de tomar el modelo del paso anterior y convertirlo en una tabla real dentro de Supabase.

```bash
npx prisma migrate dev --name crear_usuarios
npx prisma generate
```

Resultado esperado:

- Aparece una carpeta nueva `prisma/migrations/` con un archivo `.sql` adentro. **Esa carpeta se sube a GitHub.**
- Aparece la carpeta `generated/prisma/`. Esa **no** se sube (ya está en `.gitignore`).
- En la terminal aparece: `Your database is now in sync with your schema.`

### A7. Ver la tabla en Supabase y protegerla

1. En Supabase, menú izquierdo, clic en **Table Editor**.
2. Debe aparecer la tabla **usuarios** (vacía por ahora).
3. Supabase expone las tablas por internet a través de su propia API. Para que nadie pueda leer los correos y claves desde fuera de nuestro servidor, ir al menú izquierdo **SQL Editor**, pegar esto y clic en **Run**:

```sql
alter table public.usuarios enable row level security;
alter table public._prisma_migrations enable row level security;
```

> Esto no afecta a nuestro servidor: Prisma entra como administrador y sigue pudiendo leer y escribir.

### A8. Escribir el código del login y el registro

Crear una carpeta `src` en la raíz del proyecto y, dentro, los archivos de abajo. La estructura final queda así:

```
proyecto-integrador-backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── rutas/
│   │   └── auth.ts
│   ├── prisma.ts
│   └── server.ts
├── .env
├── .env.example
├── package.json
└── prisma.config.ts
```

**Archivo `src/prisma.ts`** (la conexión a la base de datos, se escribe una sola vez):

```ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });

export const prisma = new PrismaClient({ adapter });
```

**Archivo `src/rutas/auth.ts`** (registro, login y perfil):

```ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "";

export const authRouter = Router();

authRouter.post("/registro", async (req, res) => {
  const { nombre, correo, clave, equipo } = req.body ?? {};

  if (!nombre || !correo || !clave) {
    res.status(400).json({ error: "nombre, correo y clave son obligatorios" });
    return;
  }

  const existente = await prisma.usuario.findUnique({ where: { correo } });
  if (existente) {
    res.status(409).json({ error: "Ese correo ya está registrado" });
    return;
  }

  const claveCifrada = await bcrypt.hash(clave, 10);

  const usuario = await prisma.usuario.create({
    data: { nombre, correo, clave: claveCifrada, equipo: Number(equipo) || null },
    select: { id: true, nombre: true, correo: true, equipo: true },
  });

  res.status(201).json(usuario);
});

authRouter.post("/login", async (req, res) => {
  const { correo, clave } = req.body ?? {};

  if (!correo || !clave) {
    res.status(400).json({ error: "correo y clave son obligatorios" });
    return;
  }

  const usuario = await prisma.usuario.findUnique({ where: { correo } });

  // Mismo mensaje en ambos casos para no revelar qué correos existen
  if (!usuario || !(await bcrypt.compare(clave, usuario.clave))) {
    res.status(401).json({ error: "Correo o contraseña incorrectos" });
    return;
  }

  const token = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: "2h" });

  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, equipo: usuario.equipo },
  });
});

authRouter.get("/perfil", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "") ?? "";

  try {
    const { id } = jwt.verify(token, JWT_SECRET) as { id: number };
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nombre: true, correo: true, equipo: true, creadoEn: true },
    });
    res.json(usuario);
  } catch {
    res.status(401).json({ error: "Token inválido o vencido. Inicie sesión de nuevo" });
  }
});
```

**Archivo `src/server.ts`** (el servidor):

```ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./prisma.js";
import { authRouter } from "./rutas/auth.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);

app.get("/usuarios", async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, correo: true, equipo: true, creadoEn: true },
    orderBy: { id: "asc" },
  });
  res.json(usuarios);
});

const PORT = Number(process.env["PORT"]) || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

Encender el servidor:

```bash
npm run dev
```

Debe aparecer: `Servidor corriendo en http://localhost:3000`. Para apagarlo: `Ctrl + C`.

### A9. Probar el registro y el login con Postman

Con el servidor encendido, abrir Postman.

**Prueba 1: registrar un usuario**

1. Clic en **New > HTTP**.
2. Cambiar `GET` por **POST**.
3. En la URL escribir: `http://localhost:3000/auth/registro`
4. Ir a la pestaña **Body**, seleccionar **raw** y a la derecha elegir **JSON**.
5. Pegar:

```json
{
  "nombre": "Ana Pérez",
  "correo": "ana@ucaldas.edu.co",
  "clave": "MiClaveSegura1",
  "equipo": 1
}
```

6. Clic en **Send**. Respuesta esperada (código `201 Created`):

```json
{ "id": 1, "nombre": "Ana Pérez", "correo": "ana@ucaldas.edu.co", "equipo": 1 }
```

7. Ir a Supabase > **Table Editor** > **usuarios**. Ana debe aparecer, y en la columna `clave` se ve un texto raro que empieza por `$2b$`: es la contraseña cifrada.

**Prueba 2: iniciar sesión**

1. Nueva petición **POST** a `http://localhost:3000/auth/login`
2. Body > raw > JSON:

```json
{
  "correo": "ana@ucaldas.edu.co",
  "clave": "MiClaveSegura1"
}
```

3. **Send**. La respuesta trae un `token` (texto largo). Copiarlo sin las comillas.

**Prueba 3: ver el perfil con el token**

1. Nueva petición **GET** a `http://localhost:3000/auth/perfil`
2. Pestaña **Authorization**, tipo **Bearer Token**, pegar el token.
3. **Send**. Debe responder los datos de Ana.

**Prueba 4: errores esperados**

| Qué hacer                          | Respuesta esperada                            |
| ---------------------------------- | --------------------------------------------- |
| Registrar otra vez el mismo correo | `409` Ese correo ya está registrado           |
| Login con una clave equivocada     | `401` Correo o contraseña incorrectos         |
| Pedir `/auth/perfil` sin token     | `401` Token inválido o vencido                |
| Registrar sin `nombre`             | `400` nombre, correo y clave son obligatorios |

### A10. Subir el proyecto a GitHub y compartir el acceso

1. Crear un repositorio en https://github.com/new llamado `proyecto-integrador-grupo-1` (o `grupo-2`). Visibilidad: **Private**.
2. En la terminal del proyecto:

```bash
git init
git add .
git status
```

3. **Revisar la lista que muestra `git status`**: el archivo `.env` y la carpeta `node_modules` **no deben aparecer**. Si aparecen, detenerse y pedir ayuda.
4. Continuar:

```bash
git commit -m "add usuarios table with login and registro"
git branch -M main
git remote add origin https://github.com/USUARIO/proyecto-integrador-grupo-1.git
git push -u origin main
```

5. En GitHub: **Settings > Collaborators > Add people** y agregar a los 18 compañeros del grupo.
6. Enviar a los compañeros, **por mensaje privado** (nunca en el repositorio ni en un grupo público), el contenido completo del archivo `.env`.

---

## Parte B. Todos los demás estudiantes del grupo

Antes de empezar, el responsable debe haber terminado la Parte A y haberle enviado a usted: la invitación de GitHub y el contenido del `.env`.

### B1. Aceptar la invitación y descargar el proyecto

1. Abrir el correo de GitHub y aceptar la invitación al repositorio.
2. En el repositorio, clic en el botón verde **Code** y copiar la dirección HTTPS.
3. Abrir una terminal en la carpeta donde quiere guardar el proyecto y ejecutar:

```bash
git clone https://github.com/USUARIO/proyecto-integrador-grupo-1.git
cd proyecto-integrador-grupo-1
npm install
```

### B2. Crear el archivo `.env`

1. Abrir la carpeta en VS Code (**File > Open Folder**).
2. Crear un archivo nuevo en la raíz llamado exactamente `.env` (con el punto al inicio, sin nada más).
3. Pegar el contenido que envió el responsable y guardar.

### B3. Encender el servidor y comprobar que todo funciona

```bash
npm run dev
```

1. Abrir en el navegador: http://localhost:3000/usuarios
2. Debe aparecer la lista de usuarios, incluida **Ana Pérez**, que fue registrada por el responsable desde otro computador. Esto confirma que todos están usando la misma base de datos.
3. Registrar un usuario propio con Postman (igual que en A9, con su número de equipo) y pedirle a alguien de otro equipo que recargue http://localhost:3000/usuarios: su usuario debe aparecerle.

---

## Parte C. Cuando se necesite una tabla nueva o cambiar una existente

Ejemplo: el Equipo 3 necesita una tabla de productos.

| Paso | Quién       | Qué hace                                                                                      |
| ---- | ----------- | --------------------------------------------------------------------------------------------- |
| 1    | El equipo   | Le escribe al responsable qué tabla necesita y qué columnas                                   |
| 2    | Responsable | Agrega el `model` en `prisma/schema.prisma`                                                   |
| 3    | Responsable | Ejecuta `npx prisma migrate dev --name crear_productos` y luego `npx prisma generate`         |
| 4    | Responsable | Activa la protección en SQL Editor: `alter table public.productos enable row level security;` |
| 5    | Responsable | Sube los cambios: `git add .`, `git commit -m "add productos table"`, `git push`              |
| 6    | Responsable | Avisa en el grupo que ya está lista                                                           |
| 7    | Todos       | Ejecutan `git pull` y luego `npm install`, y reinician el servidor                            |

---

## 4. Reglas de oro

1. **Solo el responsable ejecuta `npx prisma migrate dev`.** Si dos personas lo ejecutan con modelos distintos, Prisma puede proponer borrar tablas y se pierden los datos de los 5 equipos.
2. **Nadie más modifica `prisma/schema.prisma`.** Los cambios se le piden al responsable (Parte C).
3. **El archivo `.env` nunca se sube a GitHub** ni se publica en grupos. Contiene la llave de la base de datos.
4. **Nunca borrar filas ni tablas desde Supabase** sin avisar al grupo: los datos son de todos.
5. Si Prisma pregunta algo como `We need to reset the database` o `All data will be lost`, **responder `N` y avisar al responsable**.
6. **Las contraseñas de usuarios siempre se guardan cifradas** con `bcrypt.hash`, nunca como texto normal.

---

## 5. Problemas comunes

| Mensaje o síntoma                                    | Causa probable                                      | Solución                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Can't reach database server`                        | Proyecto pausado o `.env` mal copiado               | Revisar el `.env`. Si Supabase dice *Paused*, el responsable da clic en **Restore project** |
| `password authentication failed`                     | Contraseña mal escrita en el `.env`                 | Volver a copiar el `.env` que envió el responsable                                          |
| `Cannot find module '../generated/prisma/client.js'` | No se generó el cliente de Prisma                   | Ejecutar `npx prisma generate`                                                              |
| `Property 'usuario' does not exist`                  | El cliente de Prisma está desactualizado            | Ejecutar `npx prisma generate` y reiniciar el servidor                                      |
| `EADDRINUSE: address already in use :::3000`         | Ya hay otro servidor encendido en ese computador    | Cerrar la otra terminal o cambiar `PORT=3001` en el `.env`                                  |
| `npm: command not found`                             | Node.js no está instalado                           | Instalar Node.js LTS y cerrar y abrir VS Code                                               |
| Postman responde `400` aunque se envió todo          | El Body no está en **raw > JSON**                   | Revisar la pestaña Body                                                                     |
| La migración se queda pegada o falla                 | Se usó la dirección del puerto 6543 en `DIRECT_URL` | `DIRECT_URL` debe terminar en `:5432/postgres`                                              |

> Supabase pausa los proyectos gratuitos que pasan 7 días sin uso. Si eso pasa, solo el responsable puede reactivarlo desde el panel. Los datos no se pierden.

---

## 6. Glosario

| Palabra         | Significado                                                                      |
| --------------- | -------------------------------------------------------------------------------- |
| Base de datos   | Lugar donde se guarda la información de forma permanente, organizada en tablas   |
| Tabla           | Como una hoja de Excel: columnas (nombre, correo...) y filas (cada usuario)      |
| Supabase        | Servicio en internet que nos presta una base de datos PostgreSQL gratis          |
| Prisma          | Herramienta que permite usar la base de datos desde TypeScript sin escribir SQL  |
| Modelo          | Descripción de una tabla en `schema.prisma`. Parecido a una clase                |
| Migración       | Convertir los cambios del modelo en cambios reales de la base de datos           |
| Servidor        | Programa que recibe peticiones (registro, login) y responde                      |
| Endpoint o ruta | Una dirección del servidor, por ejemplo `/auth/login`                            |
| Hash o cifrado  | Transformar la contraseña en un texto que no se puede devolver al original       |
| Token (JWT)     | "Pase" temporal que recibe el usuario al iniciar sesión y que demuestra quién es |
| `.env`          | Archivo con datos secretos (contraseñas, llaves) que nunca se sube a GitHub      |
