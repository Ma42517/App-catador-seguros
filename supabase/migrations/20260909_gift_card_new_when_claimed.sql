-- Una tarjeta reclamada ya no se reutiliza: se crea otra.
--
-- Bug que corrige: `create_gift_card_for_lead` devolvía la tarjeta existente del
-- prospecto aunque ya tuviera dueño. Consecuencia real: el asesor volvía a
-- "Crear tarjeta de regalo", obtenía el MISMO enlace —ya reclamado y lleno por
-- otra cuenta de Google— y quien lo abría veía una tarjeta ajena en solo lectura
-- en vez de una en blanco para hacerla suya.
--
-- Regla nueva, que es la que corresponde al modelo:
--   · Tarjeta PENDIENTE (sin dueño) → se reutiliza. No se cobra dos veces por un
--     enlace que todavía nadie usó, y el asesor puede reenviarlo sin gastar.
--   · Tarjeta ya reclamada (con dueño) → pertenece a esa persona para siempre;
--     regalar otra exige una tarjeta NUEVA, y por tanto consumir inventario.

create or replace function public.create_gift_card_for_lead(
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
  v_existing public.gift_cards%rowtype;
  v_new public.gift_cards%rowtype;
  v_source text;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_lead from public.leads
   where id = p_lead_id and advisor_id = v_advisor;
  if v_lead.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  /*
    Sólo se reutiliza una tarjeta SIN dueño. La condición
    `owner_google_sub is null` es la corrección: antes bastaba con que no
    estuviera revocada, así que una tarjeta ya activada por alguien se devolvía
    como si estuviera libre.
  */
  select * into v_existing from public.gift_cards
   where advisor_id = v_advisor
     and recipient_whatsapp = v_lead.whatsapp
     and status = 'PENDIENTE'
     and owner_google_sub is null
     and parent_card_id is null
   order by created_at desc limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'outcome', 'READY',
      'cardId', v_existing.id,
      'status', v_existing.status,
      'source', 'existing'
    );
  end if;

  v_source := public.consume_card(v_advisor, coalesce(p_use_emergency, false));
  if v_source = 'NEEDS_EMERGENCY' then
    return jsonb_build_object('outcome', 'NEEDS_EMERGENCY', 'kind', 'card');
  end if;
  if v_source = 'EMPTY' then
    return jsonb_build_object('outcome', 'EMPTY', 'kind', 'card');
  end if;

  insert into public.gift_cards (advisor_id, recipient_name, recipient_whatsapp)
  values (v_advisor, v_lead.name, v_lead.whatsapp)
  returning * into v_new;

  return jsonb_build_object(
    'outcome', 'READY',
    'cardId', v_new.id,
    'status', v_new.status,
    'source', v_source
  );
end;
$$;

revoke all on function public.create_gift_card_for_lead(uuid, boolean) from public;
grant execute on function public.create_gift_card_for_lead(uuid, boolean) to authenticated;
