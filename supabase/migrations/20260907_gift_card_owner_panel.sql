-- Panel del dueño de la tarjeta de regalo.
--
-- Cierra dos huecos de la entrega anterior:
--   1. El dueño necesita volver a su tarjeta sin conservar el enlace: al entrar
--      con su Google a /mi-tarjeta (sin id), ve TODAS las tarjetas que le
--      pertenecen y elige cuál editar o compartir.
--   2. La propagación desde la página del cliente se retira: referir es
--      exclusivo del asesor. El cliente sólo obtiene, edita y comparte su
--      tarjeta como presentación.

-- La tarjeta del cliente ya no propaga: se apaga el permiso para todas. Referir
-- queda sólo del lado del asesor.
update public.gift_cards set can_propagate = false where can_propagate = true;

-- Lista las tarjetas cuyo dueño es el Google que entró. Sólo devuelve lo
-- necesario para pintar la lista; el `sub` sale del token, no de un parámetro.
create or replace function public.my_gift_cards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v_rows jsonb;
begin
  if v_sub is null then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  select jsonb_agg(
           jsonb_build_object(
             'id', id,
             'fullName', coalesce(full_name, recipient_name),
             'title', title,
             'avatarUrl', avatar_url,
             'status', status
           )
           order by claimed_at desc nulls last, created_at desc
         )
    into v_rows
    from public.gift_cards
   where owner_google_sub = v_sub
     and status <> 'REVOCADA';

  return jsonb_build_object('outcome', 'OK', 'cards', coalesce(v_rows, '[]'::jsonb));
end;
$$;

-- La propagación queda deshabilitada de raíz: se reemplaza por una versión que
-- siempre rechaza, para que ninguna pantalla del cliente pueda referir aunque
-- llame al RPC. Referir es del asesor.
create or replace function public.propagate_gift_card(
  p_card_id uuid,
  p_name text,
  p_whatsapp text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('outcome', 'DISABLED');
end;
$$;

revoke all on function public.my_gift_cards() from public;
grant execute on function public.my_gift_cards() to authenticated;
