# Grupo 1: configuración y autenticación

Este backend es independiente del grupo 2. Usa Node.js, Prisma, bcrypt y JWT. La base de datos es PostgreSQL en un proyecto propio de Supabase.

## Base de datos

El archivo `supabase/sql/20261023_asisco_grupo_1.sql` adapta el SQL AsiscoUp del grupo 1. Crea 27 tablas en `grupo_1`, incluidos los catálogos de roles y aplicaciones.

Ejecutarlo una sola vez desde SQL Editor en la base del grupo 1. La transacción falla si las tablas ya existen; no borra ni reemplaza tablas anteriores. No ejecutar este archivo en el proyecto del grupo 2.

`grupo_1.usuarios` almacena UUID, correo y hash de contraseña. `grupo_1.perfiles` conserva los datos personales y se relaciona con el mismo UUID. El controlador crea ambos registros en una transacción. No hay dependencia de `auth.users`, `auth.uid()` ni Supabase Auth.

Se corrigió `aktualizado_en` a `actualizado_en` y se agregó un trigger para actualizar esa fecha. Las 27 tablas tienen RLS y no conceden acceso a `anon` ni `authenticated`.

El modelo Prisma incluye únicamente usuarios y perfiles, que son las tablas utilizadas por la API. Las demás tablas se mantienen en el SQL. No ejecutar `prisma migrate dev` ni `prisma db push` con este modelo sobre la base completa, porque no representa todas sus tablas.

## Configuración

Completar `.env` con `DATABASE_URL`, `DIRECT_URL` y `SUPABASE_PROJECT_REF` del proyecto del grupo 1. `JWT_SECRET` es propio de este backend y debe tener al menos 32 bytes. El archivo local ya tiene un secreto generado; no publicarlo ni compartirlo con el frontend.

```bash
npm ci
npm run generate
npm run typecheck
npm run check:config
npm run dev
```

El puerto local predeterminado es `3001`. La API local escucha en `127.0.0.1`. Para Render, seguir [DESPLIEGUE-RENDER.md](DESPLIEGUE-RENDER.md), que configura host, conexión y CORS.

## Registro

`POST /auth/registro`

```json
{
  "nombres": "Ana",
  "apellidos": "Peña",
  "correo": "ana@example.com",
  "clave": "ClaveDePrueba123!"
}
```

`nombres`, `correo` y `clave` son obligatorios. `apellidos`, `celular`, `tipoDocumento` y `numeroDocumento` son opcionales. La contraseña debe tener al menos 12 caracteres y no superar 72 bytes UTF-8. El correo se convierte a minúsculas y se eliminan sus espacios externos.

El registro devuelve `201` con `id`, `correo`, `creadoEn` y `perfil`. Un correo o documento duplicado devuelve `409`. No se recibe `equipo`, estado, roles ni permisos en el registro. El usuario nuevo no tiene roles asignados.

## Login y perfil

`POST /auth/login` recibe `correo` y `clave`. Devuelve `token` y `usuario`. El JWT dura dos horas y tiene emisor y audiencia del grupo 1.

`GET /auth/perfil` requiere `Authorization: Bearer TOKEN`. Rechaza tokens inválidos o vencidos y usuarios con perfil inactivo o bloqueado. No existe un endpoint público para listar usuarios ni tablas de negocio.

Los roles y aplicaciones del SQL se conservan sin asignar privilegios automáticamente. La autorización de futuras rutas de negocio debe implementarse en el backend; el archivo original `tiene_rol`, basado en `auth.uid()`, no se utiliza.

## Pruebas

```bash
npm run test:integration
```

Requiere Docker. Crea PostgreSQL temporal, aplica el SQL completo, prueba registro y login por HTTP, verifica perfiles, hash, duplicados, tokens y RLS, y elimina el contenedor al terminar. No utiliza la base de Supabase.

El contrato está en `postman/openapi.json`. Estas pruebas locales no sustituyen `npm run check:config` y una prueba HTTP contra la conexión real antes de desplegar.
