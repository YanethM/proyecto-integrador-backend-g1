# Configuración del backend y Supabase — Grupo 1

El grupo 1 configura su propio proyecto de Supabase y despliega su propio backend. No utiliza la base de datos, las credenciales ni el secreto JWT del grupo 2. Los equipos internos consumen la API del grupo 1.

La autenticación está implementada en Node.js, Prisma, bcrypt y JWT. No es necesario configurar Supabase Auth ni sus proveedores de inicio de sesión.

## 1. Preparar el computador

Instalar Git y una versión de Node.js compatible con Prisma: Node.js 22.12 o posterior de la rama 22, o Node.js 24. Verificar:

```bash
node --version
npm --version
git --version
```

Descargar el repositorio cuando sus archivos estén publicados:

```bash
git clone https://github.com/YanethM/proyecto-integrador-backend-g1.git
cd proyecto-integrador-backend-g1
npm ci
```

Si ya recibieron la carpeta del proyecto, abrir una terminal en esa carpeta y ejecutar `npm ci`. La raíz es la carpeta que contiene `package.json`.

## 2. Crear el proyecto de Supabase

Esta parte la realiza una sola persona responsable de la base de datos del grupo 1.

1. Entrar en [Supabase Dashboard](https://supabase.com/dashboard).
2. Seleccionar la organización del grupo y pulsar **New project**.
3. Asignar un nombre identificable, por ejemplo `proyecto-integrador-grupo-1`.
4. Definir y guardar una contraseña para la base de datos. Es distinta de la contraseña de la cuenta de Supabase.
5. Seleccionar una región disponible cercana a quienes usarán el backend y revisar el plan antes de crear el proyecto.
6. Esperar a que termine la creación.

Si ya existe un proyecto propio del grupo 1, usar ese proyecto. Para la instalación inicial, el esquema `grupo_1` no debe contener tablas creadas previamente.

## 3. Crear las tablas

1. Abrir **SQL Editor** dentro del proyecto del grupo 1.
2. Crear una consulta nueva.
3. Abrir el archivo [supabase/sql/20261023_asisco_grupo_1.sql](supabase/sql/20261023_asisco_grupo_1.sql) de este repositorio.
4. Copiar y ejecutar su contenido completo mediante **Run**.
5. Comprobar que aparece `Success. No rows returned`.

Este es el SQL adaptado para el backend. No ejecutar el archivo original que utiliza `auth.users`.

El script crea 27 tablas en el esquema `grupo_1`, carga los catálogos de aplicaciones y roles, y activa RLS. No expone las tablas a clientes `anon` o `authenticated`.

Ejecutar esta consulta para comprobar el resultado:

```sql
SELECT count(*) AS tablas,
       count(*) FILTER (WHERE c.relrowsecurity) AS tablas_con_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'grupo_1' AND c.relkind = 'r';
```

Ambos valores deben ser `27`. En **Table Editor**, seleccionar el esquema `grupo_1` para ver sus tablas.

El script de creación se ejecuta una sola vez. Si aparece `relation already exists`, no borrar tablas ni repetir fragmentos: comprobar qué instalación existe. La ejecución completa está envuelta en una transacción.

## 4. Obtener las conexiones

En el proyecto, pulsar **Connect** y abrir la opción de cadenas de conexión (**Direct / Connection string**, según la interfaz).

1. Seleccionar **Transaction pooler**, formato **URI**, y copiar la cadena completa. Corresponde a `DATABASE_URL` y usa el puerto `6543`.
2. Seleccionar **Session pooler** y copiar su cadena. Corresponde a `DIRECT_URL` y usa el puerto `5432`.
3. Reemplazar `[YOUR-PASSWORD]` por la contraseña de la base de datos, sin los corchetes.
4. Copiar el identificador del proyecto para `SUPABASE_PROJECT_REF`: es el valor que aparece después de `/project/` en la URL del Dashboard.

Conservar el usuario, host y región que muestra el proyecto. No copiar los del grupo 2 ni escribir solamente la contraseña en `DATABASE_URL`.

Los modos y puertos están descritos en la [documentación de conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

Si la contraseña contiene caracteres reservados como `@`, `#`, `%`, `/` o `:`, codificar únicamente la contraseña para incluirla en la URI; por ejemplo, `@` se convierte en `%40`. No usar conversores públicos para procesar contraseñas. Si no recuerdan la contraseña, pueden restablecerla en **Database → Settings → Reset database password** y actualizar las conexiones que la utilicen.

## 5. Crear el archivo `.env`

En la raíz, copiar `.env.example` a `.env`. Si `.env` ya existe, editarlo en lugar de sobrescribirlo.

macOS o Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Generar un secreto JWT propio del grupo 1:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guardar el resultado en `JWT_SECRET`. Este secreto no es la contraseña de PostgreSQL ni una API key de Supabase.

Completar `.env` con los valores reales del proyecto:

```dotenv
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD_CODIFICADO@HOST_POOLER:6543/postgres"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD_CODIFICADO@HOST_POOLER:5432/postgres"
SUPABASE_PROJECT_REF="PROJECT_REF"
JWT_SECRET="SECRETO_GENERADO_EN_EL_PASO_ANTERIOR"
HOST=127.0.0.1
PORT=3001
```

Los textos en mayúsculas son marcadores que deben reemplazarse. `HOST_POOLER` es el host exacto copiado de Supabase.

`DATABASE_URL` es la conexión del servidor. `DIRECT_URL` está disponible para herramientas de Prisma, pero la creación inicial de este proyecto se realiza con el SQL del paso 3.

No subir `.env` a GitHub ni incluir sus valores en el frontend. La conexión `postgres` tiene permisos administrativos: debe permanecer bajo control de quienes administran el backend. Los consumidores de la API reciben su URL HTTP, no la conexión a PostgreSQL ni `JWT_SECRET`.

## 6. Verificar la configuración

Desde la raíz:

```bash
npm run generate
npm run typecheck
npm run check:config
```

El último comando debe mostrar el host propio del grupo 1, `proyecto Supabase esperado: sí` y:

```text
OK: conexión y columnas de grupo_1.usuarios verificadas
```

No continuar con el despliegue si falla o si el proyecto esperado aparece como `no`. Esta comprobación valida configuración, conexión y columnas de usuarios/perfiles; todavía no prueba un registro por HTTP.

No ejecutar `prisma migrate dev`, `prisma migrate reset` ni `prisma db push` sobre esta base. El modelo Prisma contiene usuarios y perfiles para la API de autenticación; el SQL completo mantiene las demás tablas del proyecto.

## 7. Encender el backend

```bash
npm run dev
```

Resultado esperado:

```text
Servidor disponible en http://127.0.0.1:3001
```

Dejar esa terminal abierta. Para detener el servidor, pulsar `Ctrl + C`. Los siguientes comandos se ejecutan en otra terminal.

## 8. Probar el registro

Los ejemplos con continuación `\` son para macOS, Linux o Git Bash. En PowerShell pueden usar `curl.exe` en una sola línea o Postman con el mismo método, URL y JSON.

```bash
curl -i -X POST http://127.0.0.1:3001/auth/registro \
  -H 'Content-Type: application/json' \
  --data '{"nombres":"Ana","apellidos":"Peña","correo":"ana.prueba@example.com","clave":"ClaveDePrueba123!"}'
```

Se espera `201 Created`. La respuesta contiene `id` UUID, `correo`, `creadoEn` y `perfil`; nunca devuelve `clave`.

En Supabase, verificar que existen el usuario en `grupo_1.usuarios` y su perfil en `grupo_1.perfiles`, con el mismo UUID. La columna `clave` contiene un hash bcrypt.

Esta prueba crea un usuario real en la base del grupo 1. Al repetirla con el mismo correo, se espera `409`, no otro usuario.

Campos obligatorios: `nombres`, `correo` y `clave`. Campos opcionales: `apellidos`, `celular`, `tipoDocumento` y `numeroDocumento`. No enviar `equipo`, roles ni estado. La contraseña requiere al menos 12 caracteres y admite hasta 72 bytes UTF-8.

El registro crea usuario y perfil en una transacción. Los nuevos usuarios no reciben roles automáticamente.

## 9. Probar login y perfil

Iniciar sesión:

```bash
curl -i -X POST http://127.0.0.1:3001/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"correo":"ana.prueba@example.com","clave":"ClaveDePrueba123!"}'
```

Se espera `200 OK`, con `token` y `usuario`. Copiar el token y sustituir `PEGAR_TOKEN` en esta petición:

```bash
curl -i http://127.0.0.1:3001/auth/perfil \
  -H 'Authorization: Bearer PEGAR_TOKEN'
```

Se espera `200 OK` y el perfil del mismo usuario. Sin token, con un token inválido o con un perfil bloqueado/inactivo, se espera `401`. Los tokens vencen a las dos horas.

## 10. Ejecutar las pruebas automatizadas

Con Docker instalado y activo:

```bash
npm run test:integration
```

El comando crea PostgreSQL temporal, aplica las 27 tablas, prueba el registro, hash de contraseña, duplicados, creación atómica del perfil, login, tokens y RLS, y elimina el contenedor al finalizar. No utiliza la base de Supabase.

El contrato de la API está en [postman/openapi.json](postman/openapi.json).

## 11. Resolver errores frecuentes

- **`Falta DATABASE_URL` o URL inválida:** revisar que `.env` esté junto a `package.json` y que la variable contenga la URI completa `postgresql://...`.
- **`password authentication failed` / `28P01`:** verificar la contraseña de la base, su codificación y el usuario exacto mostrado en Connect. No usar la contraseña de inicio de sesión de Supabase.
- **No existe `grupo_1.usuarios` o `grupo_1.perfiles`:** comprobar que el SQL del paso 3 se ejecutó en el mismo proyecto al que apunta `.env`.
- **`JWT_SECRET` demasiado corto:** generar el secreto del paso 5; no dejar el marcador de ejemplo.
- **Proyecto esperado `no`:** revisar `SUPABASE_PROJECT_REF` y las cadenas copiadas. El backend rechaza expresamente la conexión conocida del grupo 2.
- **No se puede conectar:** revisar el estado del proyecto en Supabase, la red y el host del pooler. No desactivar la verificación TLS para resolver un error de certificado.
- **`400` en registro:** usar `nombres`, no `nombre`, y revisar los campos indicados en la respuesta.
- **`409`:** el correo o número de documento ya existe.
- **`429`:** se superaron 20 intentos de registro/login desde la misma IP en 15 minutos.
- **Puerto ocupado:** detener el proceso anterior o cambiar `PORT` y ajustar las URLs de prueba.

Después de editar `.env`, reiniciar el backend.

## 12. Antes del despliegue

La configuración anterior deja el servicio funcionando localmente. Para publicarlo, el equipo debe configurar las variables como secretos en su proveedor, usar HTTPS y establecer `HOST=0.0.0.0` y el puerto requerido por ese proveedor.

Si el frontend y la API estarán en orígenes distintos, configurar CORS para los orígenes autorizados; el backend actual no incluye esa configuración. Revisar también el proxy del proveedor para que el límite por IP funcione como se espera.

Antes de compartir la URL pública, repetir registro, login y perfil en el entorno desplegado. Entregar a los equipos consumidores únicamente la URL de la API y su contrato. La configuración y el despliegue remotos quedan a cargo del grupo 1.
