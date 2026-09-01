-- Tienda: cobro del diagnóstico en monedas.
--
-- El pase deja de ser gratis. Crear el enlace de un prospecto cuesta monedas,
-- descontadas del monedero (`spend_coins`, migración anterior). Reglas del
-- cobro, que son las que evitan discusiones con el asesor:
--
--   · Se cobra SÓLO al crear el diagnóstico por primera vez para ese prospecto.
--     Recuperar el mismo pase (segunda vez que abre la hoja, emitir otro código,
--     revocar) NO vuelve a cobrar: `get_or_create` es idempotente y el precio va
--     atado a la creación real, no a la consulta.
--   · El cobro y la creación ocurren en la MISMA transacción. Si no alcanza el
--     saldo, no se crea el pase y no se descuenta nada: nunca queda un pase a
--     medias ni un cobro sin pase.
--
-- ── Por qué los precios viven en la base ──
-- Para que cambiarlos no exija desplegar la app ni tocar el cliente, y para que
-- el precio que se cobra sea el mismo que decide el servidor —un precio en el
-- navegador sería editable—. Una tabla de una fila por producto, ajustable con
-- un UPDATE.

create table if not exists public.store_prices (
  product text primary key,
  coins integer not null check (coins >= 0),
  updated_at timestamptz not null default now()
);

-- Precios PROVISIONALES. Cámbialos con:
--   update public.store_prices set coins = <n>, updated_at = now()
--    where product = 'diagnostic';
insert into public.store_prices (product, coins) values
  ('diagnostic', 10),
  ('referral_card', 60)
on conflict (product) do nothing;

alter table public.store_prices enable row level security;
grant select on public.store_prices to authenticated;

-- Los precios son públicos para cualquier asesor con sesión: los necesita para
-- mostrar la tienda. Cambiarlos no: sin política de escritura, sólo el panel de
-- Supabase (service_role) los edita.
drop policy if exists "precios visibles" on public.store_prices;
create policy "precios visibles"
  on public.store_prices for select
  to authenticated
  using (true);

create or replace function public.store_price(p_product text)
returns integer
language sql
stable
set search_path = public
as $$
  select coins from public.store_prices where product = p_product
$$;

revoke all on function public.store_price(text) from public;
grant execute on function public.store_price(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- get_or_create con cobro
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Reemplaza la versión gratuita. Mantiene la firma y el contrato de salida
-- (`READY` + diagnosticId + status) para no romper la app, y añade `charged`
-- para que la hoja pueda avisar cuánto se descontó. El cobro se hace en línea,
-- no llamando a `spend_coins`, para que creación y descuento compartan la misma
-- transacción y el mismo `for update` sobre el monedero.

create or replace function public.get_or_create_diagnostic_for_lead(
  p_lead_id uuid
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
  v_price integer;
  v_wallet public.advisor_wallets%rowtype;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_lead
    from public.leads
   where id = p_lead_id
     and advisor_id = v_advisor;

  if v_lead.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  if length(public.diagnostic_whatsapp_key(v_lead.whatsapp)) <> 10 then
    return jsonb_build_object('outcome', 'INVALID_CONTACT');
  end if;

  -- Ya tiene pase: se devuelve sin cobrar de nuevo.
  select * into v_existing
    from public.diagnostics
   where lead_id = p_lead_id;

  if v_existing.id is not null then
    return jsonb_build_object(
      'outcome', 'READY',
      'diagnosticId', v_existing.id,
      'status', v_existing.status,
      'charged', 0
    );
  end if;

  -- Primera vez: se cobra y se crea en la misma transacción.
  v_price := coalesce(public.store_price('diagnostic'), 0);

  if v_price > 0 then
    select * into v_wallet
      from public.advisor_wallets
     where advisor_id = v_advisor for update;

    if v_wallet.advisor_id is null or v_wallet.coins_balance < v_price then
      return jsonb_build_object(
        'outcome', 'INSUFFICIENT',
        'price', v_price,
        'coinsBalance', coalesce(v_wallet.coins_balance, 0)
      );
    end if;
  end if;

  insert into public.diagnostics (advisor_id, lead_id, recipient_name, recipient_whatsapp)
  values (v_advisor, v_lead.id, v_lead.name, v_lead.whatsapp)
  returning * into v_new;

  if v_price > 0 then
    update public.advisor_wallets
       set coins_balance = coins_balance - v_price,
           coins_spent = coins_spent + v_price,
           updated_at = now()
     where advisor_id = v_advisor;

    insert into public.wallet_ledger (advisor_id, kind, coins, reason, reference)
    values (v_advisor, 'SPEND', -v_price, 'diagnostic', v_new.id::text);
  end if;

  return jsonb_build_object(
    'outcome', 'READY',
    'diagnosticId', v_new.id,
    'status', v_new.status,
    'charged', v_price
  );
end;
$$;

revoke all on function public.get_or_create_diagnostic_for_lead(uuid) from public;
grant execute on function public.get_or_create_diagnostic_for_lead(uuid) to authenticated;
