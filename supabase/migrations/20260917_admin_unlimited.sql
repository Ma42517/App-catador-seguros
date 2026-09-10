-- Diagnósticos y tarjetas ilimitados SÓLO para el administrador, para pruebas.
--
-- La idea: el admin necesita crear pases de diagnóstico y tarjetas sin gastar su
-- inventario ni sus monedas, para probar el flujo cuantas veces quiera. En vez de
-- regalarle saldo (que se acabaría y habría que recargar), se le exime del cobro
-- en el punto exacto donde se descuenta. Nadie más nota el cambio.
--
-- Por qué en la base y no en el front: el descuento vive en RPC `security
-- definer`. Si el atajo estuviera en el navegador, cualquiera podría fingirlo;
-- aquí se comprueba el rol contra la tabla `profiles` con el `auth.uid()` real,
-- así que sólo la cuenta marcada `role = 'admin'` obtiene el privilegio.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: ¿quien llama es el administrador de la app?
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  )
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tarjetas: el admin nunca consume inventario
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Se antepone el atajo del admin al descuento. Devuelve 'ADMIN' —una fuente más,
-- como 'INVENTORY' o 'EMERGENCY'— para que quede trazado de dónde salió la
-- tarjeta sin tocar el saldo. El resto de la lógica queda idéntica.
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
  -- Admin: barra libre. No se toca el monedero ni el inventario.
  if public.is_app_admin() then
    return 'ADMIN';
  end if;

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
-- Diagnósticos: el admin no paga monedas
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Misma firma y mismo contrato de salida que la versión con cobro. El único
-- cambio: si es admin, el precio se fuerza a 0, así que ni valida saldo ni
-- descuenta ni escribe en el ledger. Todo lo demás intacto.
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

  -- Primera vez: se cobra y se crea en la misma transacción. El admin no paga:
  -- su precio efectivo es 0, así que salta la validación de saldo y el descuento.
  v_price := coalesce(public.store_price('diagnostic'), 0);
  if public.is_app_admin() then
    v_price := 0;
  end if;

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
