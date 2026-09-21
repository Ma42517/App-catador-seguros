-- Simulador de tarjetas para el administrador.
--
-- Para qué: el admin necesita probar el flujo COMPLETO de la tarjeta del cliente
-- —entrar como si le hubieran mandado el link, registrarse, crear y editar— tantas
-- veces como quiera, con tarjetas DESECHABLES que no ensucian los datos reales ni
-- consumen inventario. Cada simulación es una tarjeta nueva con su propio código;
-- cuando un cambio le gusta, lo replica a mano en la tarjeta real.
--
-- Diferencia con create_gift_card_for_lead: aquélla exige un prospecto (lead) y
-- descuenta inventario/emergencia. Ésta no: es una tarjeta de laboratorio, marcada
-- como tal, que sólo el admin puede crear (is_app_admin, ya existente). Emite el
-- código en el mismo paso para que el admin lo use al registrarse.
--
-- Seguridad: security definer + verificación de admin dentro. Un asesor normal
-- que llame a este RPC recibe UNAUTHORIZED. La tarjeta se atribuye al propio admin
-- como asesor (advisor_id = auth.uid()), así que vive bajo su RLS como cualquiera.

-- Marca de sandbox: columna aditiva para poder distinguir y limpiar las de prueba
-- sin tocar las reales. Default false: ninguna tarjeta existente se ve afectada.
alter table public.gift_cards
  add column if not exists is_sandbox boolean not null default false;

create or replace function public.create_sandbox_gift_card()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_advisor uuid := auth.uid();
  v_card public.gift_cards%rowtype;
  v_bytes bytea;
  v_code text;
  v_salt text;
begin
  -- Sólo el administrador. El simulador es una herramienta interna de pruebas.
  if not public.is_app_admin() then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  -- Tarjeta de prueba: sin lead, sin consumir inventario, marcada is_sandbox.
  -- recipient_* son obligatorios en la tabla; se llenan con textos de prueba.
  insert into public.gift_cards (
    advisor_id, recipient_name, recipient_whatsapp, is_sandbox
  ) values (
    v_advisor, 'Prueba (simulación)', '0000000000', true
  )
  returning * into v_card;

  -- Código de un solo uso, igual que issue_gift_card_access_code, para que el
  -- admin lo escriba al registrarse en /mi-tarjeta.
  v_bytes := gen_random_bytes(3);
  v_code := lpad(((
    get_byte(v_bytes, 0)::int * 65536
    + get_byte(v_bytes, 1)::int * 256
    + get_byte(v_bytes, 2)::int
  ) % 1000000)::text, 6, '0');
  v_salt := encode(gen_random_bytes(16), 'hex');

  update public.gift_cards
     set access_code_hash = public.diagnostic_hash(v_code, v_salt),
         access_code_salt = v_salt,
         access_code_expires_at = now() + public.gift_code_ttl(),
         access_code_attempts = 0,
         access_code_uses_left = 1,
         updated_at = now()
   where id = v_card.id;

  return jsonb_build_object('outcome', 'READY', 'cardId', v_card.id, 'code', v_code);
end;
$$;

revoke all on function public.create_sandbox_gift_card() from public;
grant execute on function public.create_sandbox_gift_card() to authenticated;

-- Limpieza: borra TODAS las tarjetas de prueba del admin de una vez, para que el
-- laboratorio no se acumule. Sólo toca las marcadas is_sandbox del propio admin.
create or replace function public.clear_sandbox_gift_cards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_count integer;
begin
  if not public.is_app_admin() then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  delete from public.gift_cards
   where advisor_id = v_advisor and is_sandbox = true;
  get diagnostics v_count = row_count;

  return jsonb_build_object('outcome', 'CLEARED', 'deleted', v_count);
end;
$$;

revoke all on function public.clear_sandbox_gift_cards() from public;
grant execute on function public.clear_sandbox_gift_cards() to authenticated;
