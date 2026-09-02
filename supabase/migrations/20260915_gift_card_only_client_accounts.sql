-- Sólo una cuenta de cliente puede quedarse con una tarjeta de regalo.
--
-- Cierre por el lado del servidor de la raíz del problema. En el navegador ya se
-- separaron las sesiones (la tarjeta usa su propio almacén, así que no puede
-- heredar la del asesor), pero el navegador es del usuario: código viejo en caché
-- o una llamada hecha a mano podrían intentar vincular una tarjeta con una cuenta
-- de asesor. Aquí eso deja de ser posible.
--
-- La marca es la que ya se pone al registrarse en la página de la tarjeta:
-- `user_metadata.df360_role = 'client'`. Las cuentas de asesor (Google) no la
-- tienen, así que su token no puede reclamar nada. Vincular una tarjeta es un
-- gesto de una sola vez e irreversible sin el asesor: es el punto que hay que
-- proteger, no la lectura.

create or replace function public.claim_gift_card_with_signup(
  p_card_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v_email text := auth.jwt() ->> 'email';
  v_role text := coalesce(auth.jwt() -> 'user_metadata' ->> 'df360_role', '');
  v_card public.gift_cards%rowtype;
begin
  if v_sub is null then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  /*
    Puerta nueva: la cuenta tiene que ser de cliente, de las que nacen en la
    página de la tarjeta. Cualquier otra sesión —la del asesor, sobre todo— se va
    con WRONG_ACCOUNT y la tarjeta se queda libre para su dueño real.
  */
  if v_role <> 'client' then
    return jsonb_build_object('outcome', 'WRONG_ACCOUNT');
  end if;

  select * into v_card from public.gift_cards where id = p_card_id for update;
  if v_card.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;
  if v_card.status = 'REVOCADA' then
    return jsonb_build_object('outcome', 'REVOKED');
  end if;

  -- Ya tiene dueño: si es esta cuenta, entra; si no, no. El código no arrebata
  -- una tarjeta ya vinculada.
  if v_card.owner_google_sub is not null then
    if v_card.owner_google_sub = v_sub then
      return jsonb_build_object('outcome', 'OWNER');
    end if;
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;

  -- El código de invitación no caduca por tiempo: sólo importa que exista y que
  -- no se haya usado ya (uses_left).
  if v_card.access_code_hash is null
     or v_card.access_code_uses_left <= 0 then
    return jsonb_build_object('outcome', 'CODE_EXPIRED');
  end if;

  if v_card.access_code_attempts >= 5 then
    return jsonb_build_object('outcome', 'TOO_MANY_ATTEMPTS');
  end if;

  if public.diagnostic_hash(regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g'),
                            v_card.access_code_salt) <> v_card.access_code_hash then
    update public.gift_cards
       set access_code_attempts = access_code_attempts + 1, updated_at = now()
     where id = p_card_id;
    return jsonb_build_object(
      'outcome', 'CODE_INVALID',
      'attemptsLeft', greatest(0, 4 - v_card.access_code_attempts)
    );
  end if;

  -- Código correcto: se amarra la tarjeta y se AGOTA el código (un solo uso).
  update public.gift_cards
     set owner_google_sub = v_sub,
         owner_email = v_email,
         status = 'ACTIVA',
         full_name = coalesce(full_name, v_card.recipient_name),
         claimed_at = now(),
         access_code_uses_left = 0,
         access_code_attempts = 0,
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'OWNER');
end;
$$;

revoke all on function public.claim_gift_card_with_signup(uuid, text) from public;
grant execute on function public.claim_gift_card_with_signup(uuid, text) to authenticated;
