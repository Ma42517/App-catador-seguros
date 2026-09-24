-- Tarjetas y diagnósticos ilimitados también para la cuenta de demostración.
--
-- Qué añade: hasta ahora sólo el admin estaba exento de gastar inventario y
-- monedas (20260917). Ahora también la cuenta `asesor@demo`, que se usa para
-- mostrar la app sin quedarse sin material a media demostración.
--
-- Por qué un INTERRUPTOR por perfil y no el correo escrito dentro de la función:
-- dejar 'asesor@demo' incrustado en el código obligaría a una migración nueva
-- cada vez que se quiera activar o quitar el privilegio a otra cuenta. Con una
-- columna booleana, eso se hace con un UPDATE de una línea. La función sólo
-- pregunta "¿esta cuenta lo tiene activado?", que es la regla real.
--
-- Sigue siendo restringido: el privilegio no se puede pedir desde el navegador.
-- Lo concede quien pueda escribir en `profiles` (la política de la tabla), y la
-- comprobación ocurre en el servidor contra el `auth.uid()` de quien llama.

-- Interruptor. Default false: ninguna cuenta existente lo gana por accidente.
alter table public.profiles
  add column if not exists unlimited_gifts boolean not null default false;

-- Se activa para la cuenta de demostración. `lower()` porque el correo pudo
-- guardarse con mayúsculas; así se encuentra igual.
update public.profiles
   set unlimited_gifts = true
 where lower(email) = 'asesor@demo';

/*
  ¿Quién no paga? El admin (por rol) o cualquier cuenta con el interruptor
  activado. Se concentra en una sola función para que las dos reglas —tarjetas y
  diagnósticos— no se puedan desincronizar.
*/
create or replace function public.has_unlimited_gifts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid()
       and (role = 'admin' or unlimited_gifts = true)
  )
$$;

revoke all on function public.has_unlimited_gifts() from public;
grant execute on function public.has_unlimited_gifts() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tarjetas: la cuenta exenta nunca consume inventario
-- ─────────────────────────────────────────────────────────────────────────────
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
  -- Barra libre (admin o interruptor). No se toca el monedero ni el inventario.
  if public.has_unlimited_gifts() then
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
-- Diagnósticos: la cuenta exenta no paga monedas
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- Primera vez: se cobra y se crea en la misma transacción. La cuenta exenta
  -- (admin o interruptor) tiene precio 0, así que salta saldo y descuento.
  v_price := coalesce(public.store_price('diagnostic'), 0);
  if public.has_unlimited_gifts() then
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
