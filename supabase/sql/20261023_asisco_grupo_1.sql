BEGIN;
CREATE SCHEMA IF NOT EXISTS grupo_1;
CREATE TABLE grupo_1.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correo text NOT NULL UNIQUE CHECK (correo = lower(trim(correo)) AND length(correo) > 0),
  clave text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);
create table grupo_1.aplicaciones (
  codigo text primary key,
  nombre text not null
);
insert into grupo_1.aplicaciones (codigo, nombre) values
  ('bitacoraUp', 'BitacoraUp'),
  ('asiscoUp', 'AsiscoUp'),
  ('upnews', 'UpNews'),
  ('asiscoPay', 'AsiscoPay'),
  ('gameUp', 'GameUp');
create table grupo_1.roles (
  codigo text primary key,
  nombre text not null
);
insert into grupo_1.roles (codigo, nombre) values
  ('administrador', 'Administración de la fundación'),
  ('directora', 'Directora'),
  ('docente', 'Docente o terapeuta'),
  ('tallerista', 'Tallerista'),
  ('acudiente', 'Acudiente'),
  ('padrino', 'Padrino o donante'),
  ('estudiante', 'Estudiante o joven'),
  ('comunicaciones', 'Equipo de comunicaciones');
create table grupo_1.parentesco (
  codigo_parentesco text primary key,
  descripcion_parentesco text not null
);
create table grupo_1.perfiles (
  id uuid primary key references grupo_1.usuarios (id) on delete cascade,
  nombres text not null default '',
  apellidos text,
  celular text,
  tipo_documento text,
  numero_documento text unique,
  estado text not null default 'activo'
    check (estado in ('activo', 'inactivo', 'bloqueado')),
  acepto_tratamiento_datos_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create table grupo_1.usuario_roles (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references grupo_1.perfiles (id) on delete cascade,
  rol text not null references grupo_1.roles (codigo),
  aplicacion text references grupo_1.aplicaciones (codigo),
  asignado_por uuid references grupo_1.perfiles (id),
  creado_en timestamptz not null default now(),
  unique nulls not distinct (usuario_id, rol, aplicacion)
);
create table grupo_1.estudiantes (
  id uuid primary key default gen_random_uuid(),
  numero_identificacion_estudiante text unique not null,
  perfil_id uuid unique references grupo_1.perfiles (id) on delete set null,
  nombres text not null,
  apellidos text not null,
  fecha_nacimiento date,
  estado text not null default 'activo'
    check (estado in ('activo', 'inactivo', 'retirado')),
  creado_en timestamptz not null default now()
);
create table grupo_1.acudiente_estudiante (
  id_acudiente_estudiante bigint generated always as identity primary key,
  acudiente_id uuid not null references grupo_1.perfiles (id) on delete cascade,
  estudiante_id uuid not null references grupo_1.estudiantes (id) on delete cascade,
  codigo_parentesco text not null references grupo_1.parentesco (codigo_parentesco),
  es_principal boolean not null default false,
  unique (acudiente_id, estudiante_id)
);
create table grupo_1.docente_estudiante (
  docente_id uuid not null references grupo_1.perfiles (id) on delete cascade,
  estudiante_id uuid not null references grupo_1.estudiantes (id) on delete cascade,
  area text not null,
  primary key (docente_id, estudiante_id, area)
);
create table grupo_1.padrino_estudiante (
  padrino_id uuid not null references grupo_1.perfiles (id) on delete cascade,
  estudiante_id uuid not null references grupo_1.estudiantes (id) on delete cascade,
  desde date not null default current_date,
  hasta date,
  primary key (padrino_id, estudiante_id, desde)
);
create table grupo_1.modulo (
  codigo_modulo text primary key,
  descripcion_modulo text not null
);
create table grupo_1.contenido (
  codigo_contenido text primary key,
  codigo_modulo text not null references grupo_1.modulo (codigo_modulo) on delete cascade,
  descripcion_contenido text not null
);
create table grupo_1.matricula (
  codigo_matricula text primary key,
  estudiante_id uuid not null references grupo_1.estudiantes (id) on delete cascade,
  codigo_contenido text not null references grupo_1.contenido (codigo_contenido),
  fecha_matricula date not null default current_date,
  nota numeric(5,2)
);
create table grupo_1.tipo_pregunta (
  codigo_tipo_pregunta text primary key,
  descripcion text not null
);
create table grupo_1.pregunta (
  codigo_pregunta text primary key,
  codigo_tipo_pregunta text references grupo_1.tipo_pregunta (codigo_tipo_pregunta),
  pregunta_caracterizacion text not null
);
create table grupo_1.caracterizacion (
  id_caracterizacion bigint generated always as identity primary key,
  estudiante_id uuid not null references grupo_1.estudiantes (id) on delete cascade,
  codigo_pregunta text not null references grupo_1.pregunta (codigo_pregunta),
  nota text
);
create table grupo_1.donante (
  id uuid primary key references grupo_1.perfiles (id) on delete cascade
);
create table grupo_1.donacion_dinero (
  id bigint generated always as identity primary key,
  donante_id uuid not null references grupo_1.donante (id),
  monto numeric(12,2) not null,
  fecha timestamptz not null default now()
);
create table grupo_1.donacion_especie (
  id bigint generated always as identity primary key,
  donante_id uuid not null references grupo_1.donante (id),
  descripcion text not null,
  fecha timestamptz not null default now()
);
create table grupo_1.donacion_servicio (
  id bigint generated always as identity primary key,
  donante_id uuid not null references grupo_1.donante (id),
  servicio text not null,
  fecha timestamptz not null default now()
);
create table grupo_1.noticia (
  codigo_noticia text primary key,
  descripcion_noticia text not null,
  fecha_noticia timestamptz not null default now()
);
create table grupo_1.imagen (
  codigo_imagen text primary key,
  codigo_noticia text references grupo_1.noticia (codigo_noticia) on delete cascade,
  link_imagen text not null,
  descripcion_imagen text
);
create table grupo_1.video (
  codigo_video text primary key,
  codigo_noticia text references grupo_1.noticia (codigo_noticia) on delete cascade,
  link_video text not null,
  descripcion_video text
);
create table grupo_1.evento (
  codigo_evento text primary key,
  descripcion_evento text not null,
  fecha_evento timestamptz not null
);
create table grupo_1.participante (
  id uuid primary key references grupo_1.perfiles (id) on delete cascade
);
create table grupo_1.evento_participante (
  evento_id text not null references grupo_1.evento (codigo_evento) on delete cascade,
  participante_id uuid not null references grupo_1.participante (id) on delete cascade,
  primary key (evento_id, participante_id)
);
create table grupo_1.autorizaciones (
  id bigint generated always as identity primary key,
  estudiante_id uuid references grupo_1.estudiantes (id) on delete cascade,
  otorgada_por uuid not null references grupo_1.perfiles (id),
  tipo text not null check (tipo in (
    'datos_personales', 'imagen', 'grabacion_voz', 'novedades_padrino', 'salidas'
  )),
  otorgada boolean not null,
  fecha timestamptz not null default now(),
  revocada_en timestamptz,
  soporte_url text
);
CREATE FUNCTION grupo_1.actualizar_fecha_perfil()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER actualizar_fecha_perfil BEFORE UPDATE ON grupo_1.perfiles
FOR EACH ROW EXECUTE FUNCTION grupo_1.actualizar_fecha_perfil();
DO $$
DECLARE tabla record;
BEGIN
  FOR tabla IN SELECT tablename FROM pg_tables WHERE schemaname = 'grupo_1'
  LOOP
    EXECUTE format('ALTER TABLE grupo_1.%I ENABLE ROW LEVEL SECURITY', tabla.tablename);
  END LOOP;
END $$;
REVOKE ALL ON SCHEMA grupo_1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA grupo_1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA grupo_1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA grupo_1 FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA grupo_1 REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA grupo_1 REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA grupo_1 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
COMMIT;
