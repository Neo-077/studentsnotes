# RLS.md — Políticas de acceso

**Roles**: `admin`, `maestro`. El *JWT de Supabase* incluye `auth.uid()` y, opcionalmente,
*claims* personalizadas. Mapeamos `auth.uid()` → `usuario` (tabla) por `email` u OIDC.

> Suposición: el usuario (Supabase Auth) tiene `email` que coincide con `usuario.email`.
> El `usuario.rol` determina permisos. `usuario.id_docente` enlaza con los `grupos` que imparte.

## Función auxiliar
```sql
create or replace function app.current_usuario_id()
returns int language sql security definer set search_path = public as $$
  select u.id_usuario from usuario u
  where u.email = auth.email() and u.activo = true
  limit 1;
$$;

create or replace function app.current_docente_id()
returns int language sql security definer set search_path = public as $$
  select u.id_docente from usuario u
  where u.email = auth.email() and u.activo = true
  limit 1;
$$;
```

## Políticas

### admin: acceso total (lectura/escritura)
Ejemplo para `estudiante` (replicar en demás tablas):
```sql
create policy admin_all on estudiante
for all using (
  exists(select 1 from usuario u
         where u.email = auth.email() and u.rol = 'admin' and u.activo)
)
with check (
  exists(select 1 from usuario u
         where u.email = auth.email() and u.rol = 'admin' and u.activo)
);
```

### maestro: lectura restringida a sus grupos
**grupo** (solo leer grupos donde es titular):
```sql
create policy maestro_select_grupo on grupo
for select using (id_docente = app.current_docente_id());
```

**inscripcion** (lectura solo si pertenece a un grupo del maestro):
```sql
create policy maestro_select_inscripcion on inscripcion
for select using (
  exists(select 1 from grupo g where g.id_grupo = inscripcion.id_grupo
         and g.id_docente = app.current_docente_id())
);
```

**evaluacion_unidad / asistencia** (análogo):
```sql
create policy maestro_select_eval on evaluacion_unidad
for select using (
  exists(select 1 from inscripcion i
         join grupo g on g.id_grupo = i.id_grupo
         where i.id_inscripcion = evaluacion_unidad.id_inscripcion
           and g.id_docente = app.current_docente_id())
);
create policy maestro_select_asistencia on asistencia
for select using (
  exists(select 1 from inscripcion i
         join grupo g on g.id_grupo = i.id_grupo
         where i.id_inscripcion = asistencia.id_inscripcion
           and g.id_docente = app.current_docente_id())
);
```

**carrera, genero, materia, termino, modalidad** (lectura pública a usuarios autenticados):
```sql
create policy auth_read_catalogos on carrera for select using (auth.role() = 'authenticated');
create policy auth_read_genero on genero for select using (auth.role() = 'authenticated');
create policy auth_read_materia on materia for select using (auth.role() = 'authenticated');
create policy auth_read_termino on termino for select using (auth.role() = 'authenticated');
create policy auth_read_modalidad on modalidad for select using (auth.role() = 'authenticated');
```

> Ajusta *insert/update* para `maestro` si deseas permitir captura (por ahora, sólo `admin`).
