-- Inventario, paquetes y fondo de emergencia.
--
-- Cambia el modelo económico completo, así que reemplaza piezas de la migración
-- anterior. Antes crear un diagnóstico gastaba monedas directo. Ahora:
--
--   monedas ──comprar paquete──▶ inventario ──usar──▶ diagnóstico / tarjeta
--
-- El asesor compra PAQUETES en la tienda (estilo Clash Royale); su contenido cae
-- al INVENTARIO; y crear un pase consume del inventario, no de las monedas. Si el
-- inventario está en cero, se ofrece el FONDO DE EMERGENCIA —un colchón que el
-- asesor no ve como contador, sólo se le ofrece al momento de necesitarlo—.
--
-- Regla de la propagación (un solo nivel), que vive en el flujo público y no
-- aquí: el pase que sale del inventario del asesor puede regalar 3 diagnósticos /
-- 1 tarjeta gratis; esos regalados YA NO propagan. Esta migración sólo modela lo
-- que cuesta —iniciar la cadena—; la propagación gratis ya la resuelven los RPC
-- públicos existentes y no descuenta inventario.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Catálogo de paquetes
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.store_packs (
  code text primary key,
  kind text not null check (kind in ('diagnostic', 'card')),
  title text not null,
  quantity integer not null check (quantity > 0),
  coins integer not null check (coins >= 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Paquetes iniciales. Ajustables con UPDATE, sin desplegar.
insert into public.store_packs (code, kind, title, quantity, coins, sort_order) values
  ('diag_3',  'diagnostic', 'Paquete de 3 diagnósticos', 3, 5,  1),
  ('card_3',  'card',       'Paquete de 3 tarjetas',     3, 10, 2)
on conflict (code) do nothing;

alter table public.store_packs enable row level security;
grant select on public.store_packs to authenticated;

drop policy if exists "paquetes visibles" on public.store_packs;
create policy "paquetes visibles"
  on public.store_packs for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Inventario, y estado del regalo de bienvenida / emergencia
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Se añade al monedero que ya existe. El inventario son dos contadores; la
-- emergencia lleva su saldo y la marca de la última reposición, para reponer sin
-- un job: se calcula al vuelo cuántas fechas de reposición pasaron desde la
-- última vez que se tocó.

alter table public.advisor_wallets
  add column if not exists inv_diagnostics integer not null default 0
    check (inv_diagnostics >= 0),
  add column if not exists inv_cards integer not null default 0
    check (inv_cards >= 0),
  add column if not exists welcome_granted boolean not null default false,
  add column if not exists emergency_diagnostics integer not null default 0
    check (emergency_diagnostics >= 0),
  add column if not exists emergency_cards integer not null default 0
    check (emergency_cards >= 0),
  add column if not exists emergency_synced_on date;

-- Regalo de bienvenida y topes de emergencia. En una tabla de una fila para
-- ajustarlos sin tocar código.
create table if not exists public.economy_config (
  id boolean primary key default true check (id),
  welcome_diagnostics integer not null default 9,
  welcome_cards integer not null default 6,
  emergency_diagnostics_cap integer not null default 3,   -- tope al reponer el mes
  emergency_cards_cap integer not null default 3,          -- 1 los días 7, 15 y 21
  updated_at timestamptz not null default now()
);
insert into public.economy_config (id) values (true) on conflict (id) do nothing;

alter table public.economy_config enable row level security;
-- No se concede lectura: la config es interna. La usa el servidor en SECURITY
-- DEFINER; el cliente nunca la necesita.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Sincronizar bienvenida + emergencia (idempotente, sin job)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Se llama al inicio de cualquier operación económica. Concede el regalo una vez
-- y repone la emergencia según las fechas transcurridas: los diagnósticos se
-- fijan al tope el día 1 del mes; las tarjetas suben de a una en los días 7, 15 y
-- 21, sin pasar del tope. Trabaja sobre una fila ya bloqueada por el llamador.

create or replace function public.sync_wallet_grants(p_wallet public.advisor_wallets)
returns public.advisor_wallets
language plpgsql
set search_path = public
as $$
declare
  v public.advisor_wallets := p_wallet;
  v_cfg public.economy_config;
  v_today date := (now() at time zone 'utc')::date;
  v_last date := coalesce(v.emergency_synced_on, v_today - 1);
  v_cursor date;
begin
  select * into v_cfg from public.economy_config where id;

  -- Regalo de bienvenida, una sola vez.
  if not v.welcome_granted then
    v.inv_diagnostics := v.inv_diagnostics + coalesce(v_cfg.welcome_diagnostics, 0);
    v.inv_cards := v.inv_cards + coalesce(v_cfg.welcome_cards, 0);
    v.welcome_granted := true;
  end if;

  -- Reposición de emergencia recorriendo día por día desde la última sync. Es
  -- barato (a lo sumo unos días) y evita perder una fecha si el asesor no entró
  -- justo ese día: la reposición ocurre la próxima vez que abre la app.
  if v_last < v_today then
    v_cursor := v_last + 1;
    while v_cursor <= v_today loop
      -- Día 1: los diagnósticos de emergencia se fijan al tope del mes.
      if extract(day from v_cursor) = 1 then
        v.emergency_diagnostics := coalesce(v_cfg.emergency_diagnostics_cap, 0);
      end if;
      -- Días 7, 15 y 21: una tarjeta de emergencia, sin pasar del tope.
      if extract(day from v_cursor) in (7, 15, 21) then
        v.emergency_cards := least(
          coalesce(v_cfg.emergency_cards_cap, 0),
          v.emergency_cards + 1
        );
      end if;
      v_cursor := v_cursor + 1;
    end loop;
    v.emergency_synced_on := v_today;
  end if;

  return v;
end;
$$;

-- Asegura que el asesor tenga fila de monedero y que sus regalos estén al día.
-- Devuelve la fila ya bloqueada (for update) para que el llamador siga operando.
create or replace function public.ensure_wallet(p_advisor uuid)
returns public.advisor_wallets
language plpgsql
set search_path = public
as $$
declare
  v public.advisor_wallets;
begin
  insert into public.advisor_wallets (advisor_id)
  values (p_advisor)
  on conflict (advisor_id) do nothing;

  select * into v from public.advisor_wallets where advisor_id = p_advisor for update;
  v := public.sync_wallet_grants(v);

  update public.advisor_wallets
     set inv_diagnostics = v.inv_diagnostics,
         inv_cards = v.inv_cards,
         welcome_granted = v.welcome_granted,
         emergency_diagnostics = v.emergency_diagnostics,
         emergency_cards = v.emergency_cards,
         emergency_synced_on = v.emergency_synced_on,
         updated_at = now()
   where advisor_id = p_advisor
  returning * into v;

  return v;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Comprar un paquete: monedas → inventario
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.buy_pack(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_pack public.store_packs%rowtype;
  v_wallet public.advisor_wallets%rowtype;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_pack from public.store_packs where code = p_code and active;
  if v_pack.code is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  v_wallet := public.ensure_wallet(v_advisor);

  if v_wallet.coins_balance < v_pack.coins then
    return jsonb_build_object(
      'outcome', 'INSUFFICIENT',
      'price', v_pack.coins,
      'coinsBalance', v_wallet.coins_balance
    );
  end if;

  update public.advisor_wallets
     set coins_balance = coins_balance - v_pack.coins,
         coins_spent = coins_spent + v_pack.coins,
         inv_diagnostics = inv_diagnostics
           + case when v_pack.kind = 'diagnostic' then v_pack.quantity else 0 end,
         inv_cards = inv_cards
           + case when v_pack.kind = 'card' then v_pack.quantity else 0 end,
         updated_at = now()
   where advisor_id = v_advisor
  returning * into v_wallet;

  insert into public.wallet_ledger (advisor_id, kind, coins, reason, reference)
  values (v_advisor, 'SPEND', -v_pack.coins, 'pack:' || v_pack.code, gen_random_uuid()::text);

  return jsonb_build_object(
    'outcome', 'BOUGHT',
    'coinsBalance', v_wallet.coins_balance,
    'invDiagnostics', v_wallet.inv_diagnostics,
    'invCards', v_wallet.inv_cards
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Consumo interno: inventario primero, luego emergencia (opcional)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `p_use_emergency` distingue los dos toques de la UI: primero se intenta sólo
-- con inventario; si no hay y sí queda emergencia, la app pregunta y vuelve a
-- llamar con true. Así el asesor decide gastar su colchón, no se consume solo.

create or replace function public.consume_diagnostic(
  p_advisor uuid,
  p_use_emergency boolean
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v public.advisor_wallets;
begin
  v := public.ensure_wallet(p_advisor);

  if v.inv_diagnostics > 0 then
    update public.advisor_wallets set inv_diagnostics = inv_diagnostics - 1,
           updated_at = now() where advisor_id = p_advisor;
    return 'INVENTORY';
  end if;

  if v.emergency_diagnostics > 0 then
    if not p_use_emergency then return 'NEEDS_EMERGENCY'; end if;
    update public.advisor_wallets set emergency_diagnostics = emergency_diagnostics - 1,
           updated_at = now() where advisor_id = p_advisor;
    return 'EMERGENCY';
  end if;

  return 'EMPTY';
end;
$$;

create or replace function public.consume_card(
  p_advisor uuid,
  p_use_emergency boolean
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v public.advisor_wallets;
begin
  v := public.ensure_wallet(p_advisor);

  if v.inv_cards > 0 then
    update public.advisor_wallets set inv_cards = inv_cards - 1,
           updated_at = now() where advisor_id = p_advisor;
    return 'INVENTORY';
  end if;

  if v.emergency_cards > 0 then
    if not p_use_emergency then return 'NEEDS_EMERGENCY'; end if;
    update public.advisor_wallets set emergency_cards = emergency_cards - 1,
           updated_at = now() where advisor_id = p_advisor;
    return 'EMERGENCY';
  end if;

  return 'EMPTY';
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Crear el pase de diagnóstico: ahora consume inventario, no monedas
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Reemplaza la versión de la migración anterior (que cobraba monedas). Conserva
-- la firma y el contrato de salida. `source` dice de dónde salió el pase, para
-- que la UI muestre "usaste 1 de tu inventario" o "usaste tu fondo de emergencia".

create or replace function public.get_or_create_diagnostic_for_lead(
  p_lead_id uuid,
  p_use_emergency boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_lead public.leads%rowtype;
  v_existing public.diagnostics%rowtype;
  v_new public.diagnostics%rowtype;
  v_source text;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_lead
    from public.leads
   where id = p_lead_id and advisor_id = v_advisor;

  if v_lead.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  if length(public.diagnostic_whatsapp_key(v_lead.whatsapp)) <> 10 then
    return jsonb_build_object('outcome', 'INVALID_CONTACT');
  end if;

  -- Ya tiene pase: se devuelve sin consumir nada.
  select * into v_existing from public.diagnostics where lead_id = p_lead_id;
  if v_existing.id is not null then
    return jsonb_build_object(
      'outcome', 'READY',
      'diagnosticId', v_existing.id,
      'status', v_existing.status,
      'source', 'existing'
    );
  end if;

  v_source := public.consume_diagnostic(v_advisor, coalesce(p_use_emergency, false));

  if v_source = 'NEEDS_EMERGENCY' then
    return jsonb_build_object('outcome', 'NEEDS_EMERGENCY', 'kind', 'diagnostic');
  end if;
  if v_source = 'EMPTY' then
    return jsonb_build_object('outcome', 'EMPTY', 'kind', 'diagnostic');
  end if;

  insert into public.diagnostics (advisor_id, lead_id, recipient_name, recipient_whatsapp)
  values (v_advisor, v_lead.id, v_lead.name, v_lead.whatsapp)
  returning * into v_new;

  return jsonb_build_object(
    'outcome', 'READY',
    'diagnosticId', v_new.id,
    'status', v_new.status,
    'source', v_source
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Resumen: monedas + inventario + si hay emergencia disponible (no el número)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Reemplaza `my_wallet_summary`. La emergencia se expone como booleano, no como
-- cantidad: el asesor no debe llevar la cuenta de su colchón, sólo enterarse de
-- que existe cuando lo necesita.

create or replace function public.my_wallet_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v public.advisor_wallets;
  v_month bigint;
  v_period text := to_char(now(), 'YYYY-MM');
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  v := public.ensure_wallet(v_advisor);

  select points into v_month
    from public.advisor_month_points
   where advisor_id = v_advisor and period = v_period;

  return jsonb_build_object(
    'outcome', 'READY',
    'coinsBalance', v.coins_balance,
    'coinsEarned', v.coins_earned,
    'coinsSpent', v.coins_spent,
    'lifetimePoints', v.lifetime_points,
    'monthPoints', coalesce(v_month, 0),
    'period', v_period,
    'invDiagnostics', v.inv_diagnostics,
    'invCards', v.inv_cards,
    'hasEmergencyDiagnostics', v.emergency_diagnostics > 0,
    'hasEmergencyCards', v.emergency_cards > 0,
    'emergencyDiagnostics', v.emergency_diagnostics,
    'emergencyCards', v.emergency_cards
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Permisos
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on function public.sync_wallet_grants(public.advisor_wallets) from public;
revoke all on function public.ensure_wallet(uuid) from public;
revoke all on function public.consume_diagnostic(uuid, boolean) from public;
revoke all on function public.consume_card(uuid, boolean) from public;
revoke all on function public.buy_pack(text) from public;
revoke all on function public.get_or_create_diagnostic_for_lead(uuid, boolean) from public;
revoke all on function public.my_wallet_summary() from public;

grant execute on function public.buy_pack(text) to authenticated;
grant execute on function public.get_or_create_diagnostic_for_lead(uuid, boolean) to authenticated;
grant execute on function public.my_wallet_summary() to authenticated;

-- La versión anterior de get_or_create (un solo argumento) queda obsoleta: la
-- reemplaza la de dos argumentos. Se elimina para no dejar dos firmas activas.
drop function if exists public.get_or_create_diagnostic_for_lead(uuid);
