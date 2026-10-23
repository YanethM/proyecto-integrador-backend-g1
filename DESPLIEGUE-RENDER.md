# Despliegue en Render — Grupo 1

El backend se despliega como un Web Service de Node.js. Supabase conserva la base de datos y Render ejecuta la API. El archivo [render.yaml](render.yaml) define el servicio; crear estos archivos no publica ni despliega la aplicación.

## 1. Preparar Supabase y el repositorio

Completar primero [CONFIGURACION-SUPABASE-GRUPO-1.md](CONFIGURACION-SUPABASE-GRUPO-1.md): crear el proyecto propio, ejecutar `supabase/sql/20261023_asisco_grupo_1.sql` y comprobar la conexión.

Subir a GitHub el código, `package-lock.json`, `render.yaml`, `.node-version`, `tsconfig.build.json` y los demás archivos del proyecto. No subir `.env`, `node_modules`, `generated` ni `dist`.

La versión de Node para Render se selecciona en `.node-version`. El build instala dependencias, genera Prisma y compila TypeScript. El arranque ejecuta JavaScript compilado; no necesita `tsx`.

## 2. Crear el servicio mediante Blueprint

1. Entrar en Render y seleccionar **New → Blueprint**.
2. Conectar el repositorio del grupo 1 y seleccionar la rama que contiene estos archivos.
3. Revisar el servicio `proyecto-integrador-backend-g1` y el plan antes de confirmar. El archivo propone `free`; su disponibilidad y límites dependen de Render.
4. Completar las variables solicitadas:
   - `DATABASE_URL`: conexión Transaction pooler de Supabase del grupo 1.
   - `DIRECT_URL`: conexión Session pooler del mismo proyecto.
   - `SUPABASE_PROJECT_REF`: identificador del proyecto del grupo 1.
   - `CORS_ORIGINS`: orígenes exactos de los frontends autorizados, separados por comas.
5. Render generará `JWT_SECRET` mediante `generateValue: true`. Mantener ese valor estable; cambiarlo invalida los tokens emitidos.
6. Confirmar la creación y revisar los logs de build y arranque.

La configuración usa `HOST=0.0.0.0`, `NODE_ENV=production` y `TRUST_PROXY_HOPS=1`. El servidor toma el puerto de `PORT`, proporcionado por Render. No fijar un puerto de desarrollo en el Blueprint.

El archivo usa el mecanismo oficial de [Blueprints de Render](https://render.com/docs/blueprint-spec). Las variables `sync: false` se completan al crear el Blueprint; las modificaciones posteriores de sus valores se realizan en **Environment** del servicio.

## 3. Configurar los frontends autorizados

Ejemplo de `CORS_ORIGINS`:

```dotenv
CORS_ORIGINS=https://equipo1.example.com,https://equipo2.example.com,http://localhost:5173
```

Reemplazar los dominios de ejemplo por los reales. Incluir protocolo y puerto si aplica, sin rutas ni barra final. No usar `*`. `http://localhost:3000` y `http://localhost:5173` son orígenes diferentes.

Cada equipo informa el origen donde corre su frontend. El responsable actualiza esta variable en Render y aplica el cambio al servicio. Para desarrollo local, configurar también `CORS_ORIGINS` en `.env`.

La API responde a preflight `OPTIONS` y permite `Content-Type` y `Authorization`. No usa cookies de sesión; el perfil se consulta con un Bearer token.

CORS controla el acceso desde el navegador. No sustituye la autenticación ni impide solicitudes de herramientas o servidores sin cabecera `Origin`.

## 4. Alternativa: crear un Web Service manualmente

Si no se utiliza Blueprint, seleccionar **New → Web Service**, conectar el repositorio y configurar:

- Runtime: Node.
- Root Directory: vacío si `package.json` está en la raíz del repositorio.
- Build Command: `npm ci --include=dev && npm run build`.
- Start Command: `npm start`.
- Health Check Path: `/health`.
- Variables: las del paso 2, más `HOST=0.0.0.0`, `NODE_ENV=production`, `TRUST_PROXY_HOPS=1` y un `JWT_SECRET` propio generado con `crypto.randomBytes(32)`.

No crear una base de Render Postgres: este backend se conecta a Supabase. No ejecutar migraciones automáticas ni el SQL de creación durante cada despliegue.

## 5. Verificar el despliegue

Render asigna la URL pública al crear el servicio. Usar la URL real, por ejemplo `https://NOMBRE-REAL.onrender.com`.

```bash
curl -i https://NOMBRE-REAL.onrender.com/health
```

Se espera `200` y `{"status":"ok"}`. Esta ruta comprueba la conexión a PostgreSQL y devuelve `503` si no está disponible. Render utiliza el [health check HTTP](https://render.com/docs/health-checks) para evaluar el estado del servicio.

Repetir los ejemplos de registro, login y perfil de la guía de configuración, sustituyendo `http://127.0.0.1:3001` por la URL de Render. Estas pruebas crean usuarios reales en Supabase.

Probar además desde cada frontend autorizado. Si aparece `403 Origen no autorizado`, revisar su origen exacto en `CORS_ORIGINS`.

La configuración de proxy confía en un salto por delante de Express. Verificar en el entorno desplegado que clientes distintos no comparten indebidamente el contador de intentos. Si se añade otro proxy o CDN, revisar `TRUST_PROXY_HOPS` según la cadena real; no establecer `trust proxy=true` indiscriminadamente. Véase [Express detrás de proxies](https://expressjs.com/en/guide/behind-proxies/).

El límite de intentos utiliza memoria local del proceso: se reinicia con el servicio y no se comparte entre instancias. Antes de escalar horizontalmente, cambiarlo por un almacenamiento compartido.

## 6. Qué reciben los otros equipos

Los equipos consumidores reciben la URL base HTTPS y el contrato [postman/openapi.json](postman/openapi.json). No reciben `DATABASE_URL`, `DIRECT_URL`, la contraseña de PostgreSQL ni `JWT_SECRET`.

- `POST /auth/registro`: enviar `nombres`, `correo`, `clave` y los campos opcionales documentados.
- `POST /auth/login`: enviar `correo` y `clave`; guardar el token de sesión que devuelve la API.
- `GET /auth/perfil`: enviar `Authorization: Bearer TOKEN`.

El frontend puede guardar la URL pública como `VITE_API_URL` en Vite o `NEXT_PUBLIC_API_URL` en Next.js. Es una dirección pública, no un secreto.

Ejemplo de registro desde un frontend:

```js
const respuesta = await fetch(`${apiUrl}/auth/registro`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nombres, correo, clave }),
});
const resultado = await respuesta.json();
if (!respuesta.ok) throw new Error(resultado.error);
```

La URL basta como dirección de conexión; cada petición sigue necesitando los datos indicados. El login devuelve el JWT, de modo que ningún frontend necesita conocer el secreto con el que se firma. Los tokens vencen a las dos horas; si `/auth/perfil` responde `401`, solicitar nuevamente el inicio de sesión.

Este servicio expone autenticación y perfil. No proporciona acceso directo a las tablas de negocio, ni autoriza automáticamente operaciones en los backends propios de los otros equipos.

## 7. Comprobaciones antes de publicar

```bash
npm run typecheck
npm run test:integration
```

La prueba de integración compila el proyecto, ejecuta PostgreSQL temporal y verifica también el servidor compilado en modo producción. No despliega en Render ni modifica Supabase.
