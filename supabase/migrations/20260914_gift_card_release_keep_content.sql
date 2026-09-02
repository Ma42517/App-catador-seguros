-- Devolver una tarjeta a su dueño real SIN borrar lo que ya llenó.
--
-- El problema que cierra: mientras el enlace heredaba la sesión del asesor, hubo
-- tarjetas que quedaron amarradas a la cuenta equivocada. La persona la llenó
-- —su nombre, su foto, sus datos— y luego, al registrarse con su propio correo,
-- la app le responde "esta tarjeta ya pertenece a alguien". Es suya, pero el
-- dueño registrado es otro.
--
-- Ya existía `reset_gift_card`, que suelta al dueño pero BORRA el contenido: la
-- persona tendría que rehacer la tarjeta desde cero. Aquí se agrega el gesto
-- suave: soltar sólo la propiedad y dejar intacto el contenido. El asesor emite
-- un código nuevo, la persona se registra con su correo y encuentra su tarjeta
-- tal como la dejó.
--
-- Diferencia entre los tres gestos del asesor:
--   · release_gift_card → suelta al dueño, CONSERVA nombre, foto y datos.
--   · reset_gift_card   → suelta al dueño y BORRA todo (tarjeta en blanco).
--   · revoke_gift_card  → apaga la tarjeta (deja de existir para el público).

create or replace function public.release_gift_card(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  /*
    Se sueltan tres cosas y nada más: la cuenta dueña, el teléfono con el que
    entró y el código anterior. El contenido (full_name, avatar, especialidades,
    contactos) se queda donde está, y el estado vuelve a PENDIENTE para que
    `claim_gift_card_with_signup` pueda vincularla a la cuenta correcta.

    Los dispositivos autorizados se borran: si no, el teléfono que ya entraba
    seguiría editando una tarjeta que acaba de quedar libre.
  */
  update public.gift_cards
     set owner_google_sub = null,
         owner_email = null,
         owner_phone = null,
         status = 'PENDIENTE',
         claimed_at = null,
         access_code_hash = null, access_code_salt = null,
         access_code_expires_at = null, access_code_attempts = 0,
         access_code_uses_left = 0,
         updated_at = now()
   where id = p_card_id and advisor_id = v_advisor;

  if not found then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  delete from public.gift_card_devices where card_id = p_card_id;

  return jsonb_build_object('outcome', 'RELEASED');
end;
$$;

-- Soltar la propiedad es del asesor dueño de la tarjeta, nunca del público.
revoke all on function public.release_gift_card(uuid) from public;
grant execute on function public.release_gift_card(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- El asesor necesita VER la tarjeta ya activada de un prospecto
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Sin esto no hay forma de llegar a la tarjeta equivocada: `create_gift_card_for_lead`
-- ignora las tarjetas con dueño y crea una nueva (gastando inventario), así que
-- la tarjeta mal vinculada quedaba fuera de alcance. Con esta consulta, al abrir
-- el envío el asesor ve que ya existe una activada y puede devolverla.
--
-- No devuelve el correo del dueño completo: al asesor le basta saber que está
-- activada y con qué nombre. El correo se enmascara para no exponerlo.

create or replace function public.advisor_gift_cards_for_lead(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_cards jsonb;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select coalesce(jsonb_agg(item order by item ->> 'createdAt' desc), '[]'::jsonb)
    into v_cards
    from (
      select jsonb_build_object(
               'cardId', c.id,
               'status', c.status,
               'claimed', c.owner_google_sub is not null,
               'fullName', c.full_name,
               'hasPhoto', c.avatar_url is not null,
               'ownerHint', case
                 when c.owner_email is null then null
                 else left(c.owner_email, 1) || '***@' || split_part(c.owner_email, '@', 2)
               end,
               'claimedAt', c.claimed_at,
               'createdAt', c.created_at
             ) as item
        from public.gift_cards c
       where c.advisor_id = v_advisor
         and c.lead_id = p_lead_id
         and c.status <> 'REVOCADA'
         and c.parent_card_id is null
    ) s;

  return jsonb_build_object('outcome', 'READY', 'cards', v_cards);
end;
$$;

revoke all on function public.advisor_gift_cards_for_lead(uuid) from public;
grant execute on function public.advisor_gift_cards_for_lead(uuid) to authenticated;
