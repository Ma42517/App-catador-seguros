-- Acceso a la tarjeta con correo y contraseña propios (Supabase Auth).
--
-- Reemplaza a Google en la tarjeta de regalo. El cliente crea su cuenta con
-- correo y contraseña; Supabase Auth guarda la contraseña hasheada (bcrypt) — no
-- se guarda en ninguna tabla nuestra ni en texto—. Sigue conviviendo con el
-- acceso por número + clave de 15 minutos.
--
-- ── Por qué el correo del asesor aparecía en la tarjeta ──
-- La página de la tarjeta comparte Supabase Auth con la app del asesor. Si el
-- asesor había entrado con su Google, esa sesión se colaba en la página del
-- cliente y su correo se mostraba en "Activa tu tarjeta". Al pasar a cuentas de
-- correo propias del cliente y quitar Google de esta página, el asesor y el
-- cliente dejan de compartir sesión: el asesor usa la app; el cliente, su cuenta
-- de tarjeta.
--
-- ── Aislamiento: un cliente NO es un asesor ──
-- El registro por la tarjeta ocurre en la página `/mi-tarjeta`, que NO monta
-- `SessionProvider`, así que no crea ficha en `profiles`: el cliente vive sólo en
-- `auth.users`. El riesgo es que, si esa misma cuenta abriera después la app
-- principal, `fetchOrCreateProfile` le crearía una ficha de asesor `pending`.
-- Esto lo cierra la app marcando esas cuentas con `role='client'` al registrarse
-- (metadato del usuario), y el Gate deja fuera a `client`. Aquí se documenta el
-- rol y se añade a los catálogos para que el resto del código lo reconozca.
--
-- No hay tabla nueva de contraseñas: usar una sería el error que se evita. La
-- identidad del dueño sigue siendo `auth.jwt()->>'sub'`, que con correo+password
-- es el `auth.uid` de la cuenta — el mismo campo que ya comparan las funciones de
-- la tarjeta, así que claim/my/save/photo funcionan sin cambios.

-- Marca de que una ficha, si llegara a existir, es de un cliente de tarjeta y no
-- de un asesor. El disparador que protege el rol de `profiles` ya impide que
-- alguien se ascienda solo; 'client' es un rol sin ningún permiso de la app.
do $$
begin
  -- Si existe un CHECK sobre profiles.role que enumere roles, se amplía para
  -- incluir 'client'. Se hace con IF para no fallar donde no exista tal check.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    -- Nada que alterar en el tipo: `role` es text libre. El rol 'client' se
    -- reconoce en la app; esta migración sólo deja constancia y prepara la
    -- limpieza de abajo.
    null;
  end if;
end $$;

-- Por si alguna cuenta de cliente ya hubiera generado una ficha de asesor
-- `pending` en pruebas (al abrir la app principal con esa cuenta): se degrada a
-- 'client' cualquier ficha cuyo usuario de auth traiga el metadato de cliente.
-- Es idempotente y seguro: sólo toca las marcadas explícitamente como cliente.
update public.profiles p
   set role = 'client'
  from auth.users u
 where u.id = p.id
   and coalesce(u.raw_user_meta_data ->> 'df360_role', '') = 'client'
   and p.role <> 'client';
