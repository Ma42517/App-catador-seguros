-- Restablecer una tarjeta de regalo: soltar a su dueño.
--
-- Sirve para dos casos reales: probar el flujo sin crear tarjetas nuevas, y
-- reasignar una tarjeta que reclamó por error un Google equivocado (el asesor
-- solo tiene el WhatsApp del contacto, no su Gmail, así que si entra el primero
-- que no debía, hay que poder soltarla).
--
-- Deja la tarjeta como recién creada: sin dueño, PENDIENTE, y olvida la foto (se
-- borra de Storage desde la app con la ruta que devuelve). Sólo el asesor dueño.

create or replace function public.reset_gift_card(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_path text;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  -- Se lee la ruta ANTES de limpiarla: el `returning` de abajo ya la vería nula.
  select avatar_path into v_path
    from public.gift_cards
   where id = p_card_id and advisor_id = v_advisor;

  update public.gift_cards
     set owner_google_sub = null,
         owner_email = null,
         status = 'PENDIENTE',
         full_name = null,
         title = null,
         company = null,
         specialties = '[]'::jsonb,
         bio = null,
         phone = null,
         whatsapp = null,
         avatar_url = null,
         avatar_path = null,
         photo_focus = null,
         claimed_at = null,
         updated_at = now()
   where id = p_card_id and advisor_id = v_advisor;

  if not found then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  return jsonb_build_object('outcome', 'RESET', 'avatarPath', v_path);
end;
$$;

revoke all on function public.reset_gift_card(uuid) from public;
grant execute on function public.reset_gift_card(uuid) to authenticated;
