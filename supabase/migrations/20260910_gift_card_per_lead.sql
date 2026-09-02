-- Una tarjeta por PROSPECTO, no por número de teléfono.
--
-- Bug que corrige, y era grave: `create_gift_card_for_lead` buscaba la tarjeta
-- existente por `recipient_whatsapp`. Dos prospectos distintos que compartan
-- número —cosa habitual en pruebas, y real en una familia que comparte teléfono—
-- recibían EL MISMO enlace. Como cada tarjeta se amarra a una sola cuenta de
-- Google, el primero que entraba se quedaba con ella y los demás veían "esta
-- tarjeta ya pertenece a alguien" sin poder hacer la suya.
--
-- La identidad de una tarjeta es el prospecto al que se le regaló, así que se
-- guarda `lead_id` y la búsqueda pasa a hacerse por él.

alter table public.gift_cards
  add column if not exists lead_id uuid references public.leads (id) on delete set null;

create index if not exists gift_cards_lead_idx
  on public.gift_cards (lead_id) where lead_id is not null;

/*
  Las tarjetas que ya existen se quedan sin `lead_id`: no hay forma fiable de
  adivinar a qué prospecto pertenecían cuando varios comparten el mismo número
  —que es justo el caso que provocó el error—. Al no coincidir con ningún
  prospecto, la próxima vez que el asesor pulse "Crear tarjeta" se generará una
  nueva y correcta para cada uno, en vez de arrastrar la confusión.
*/

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
    Se reutiliza sólo la tarjeta DE ESTE PROSPECTO y sólo si nadie la reclamó.
    Las dos condiciones importan:
      · `lead_id = p_lead_id` — antes era el teléfono, y ahí estaba el error.
      · `owner_google_sub is null` — una tarjeta con dueño ya es de esa persona
        para siempre; regalar otra exige una nueva.
  */
  select * into v_existing from public.gift_cards
   where advisor_id = v_advisor
     and lead_id = p_lead_id
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

  insert into public.gift_cards (
    advisor_id, lead_id, recipient_name, recipient_whatsapp
  ) values (
    v_advisor, v_lead.id, v_lead.name, v_lead.whatsapp
  )
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
