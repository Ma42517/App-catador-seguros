-- Transición amable de Login → Registro en el acceso por correo.
--
-- Problema: Supabase, por privacidad, devuelve el MISMO error ("Invalid login
-- credentials") para un correo que no existe y para una contraseña equivocada,
-- así que el formulario no puede distinguir "aún no tienes cuenta" de "tu
-- contraseña está mal". Para la app esa distinción importa: a quien no está
-- registrado se le quiere llevar al registro sin un error rojo, conservando lo
-- que ya escribió.
--
-- Solución: una función que responde SÓLO un booleano —si el correo ya existe en
-- `profiles`— sin devolver ningún dato del usuario. Es un compromiso de
-- privacidad consciente y acotado (revela existencia, nada más), aceptable para
-- esta app donde la prioridad es que cualquiera —incluido un adulto mayor— entre
-- sin tropezar con un error que no sabe resolver.

create or replace function public.email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where lower(email) = lower(trim(p_email))
  );
$$;

-- El formulario de acceso la llama ANTES de autenticar, así que debe poder
-- invocarla tanto el visitante anónimo como el ya autenticado.
revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
