-- Pases diagnósticos únicos por prospecto y cadena segura de referidos.
--
-- Un prospecto no recibe nada al ser capturado. El asesor crea/recupera su
-- pase explícitamente desde "Prospectos capturados" y WhatsApp sólo se abre
-- después de otro toque consciente. Los referidos que deja el destinatario
-- vuelven a leads con su origen, sin aceptar advisor_id desde el navegador.

alter table public.leads
  add column if not exists referred_by_name text,
  add column if not exists referrer_diagnostic_id uuid;

alter table public.diagnostics
  add column if not exists lead_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_referrer_diagnostic_id_fkey'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_referrer_diagnostic_id_fkey
      foreign key (referrer_diagnostic_id)
      references public.diagnostics (id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'diagnostics_lead_id_fkey'
      and conrelid = 'public.diagnostics'::regclass
  ) then
    alter table public.diagnostics
      add constraint diagnostics_lead_id_fkey
      foreign key (lead_id)
      references public.leads (id)
      on delete set null;
  end if;
end $$;

-- Un prospecto conserva un solo pase. El RPC devuelve siempre este mismo UUID,
-- incluso después de completar el diagnóstico.
create unique index if not exists diagnostics_lead_id_unique
  on public.diagnostics (lead_id)
  where lead_id is not null;

-- Evita duplicar el mismo referido si una respuesta se reintenta por red.
create unique index if not exists leads_referrer_phone_unique
  on public.leads (
    advisor_id,
    referrer_diagnostic_id,
    (public.diagnostic_whatsapp_key(whatsapp))
  )
  where referrer_diagnostic_id is not null;

-- Sólo una sesión autenticada puede crear un pase, y únicamente para uno de
-- sus propios leads. El UUID se crea bajo demanda, nunca durante la captura.
create or replace function public.get_or_create_diagnostic_for_lead(
  p_lead_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_diagnostic public.diagnostics%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_lead
    from public.leads
   where id = p_lead_id
     and advisor_id = auth.uid();

  if v_lead.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  if length(public.diagnostic_whatsapp_key(v_lead.whatsapp)) <> 10 then
    return jsonb_build_object('outcome', 'INVALID_CONTACT');
  end if;

  insert into public.diagnostics (
    advisor_id,
    lead_id,
    recipient_name,
    recipient_whatsapp
  ) values (
    v_lead.advisor_id,
    v_lead.id,
    v_lead.name,
    v_lead.whatsapp
  )
  on conflict (lead_id) where lead_id is not null
  do update set lead_id = excluded.lead_id
  returning * into v_diagnostic;

  return jsonb_build_object(
    'outcome', 'READY',
    'diagnosticId', v_diagnostic.id,
    'status', v_diagnostic.status
  );
end;
$$;

-- El dueño de un pase puede dejar de uno a tres contactos. El servidor vuelve
-- a validar su WhatsApp, resuelve asesor y nombre del referidor desde la fila
-- protegida y limita el lote antes de insertar.
create or replace function public.capture_public_diagnostic_referrals(
  p_diagnostic_id uuid,
  p_whatsapp text,
  p_referrals jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diagnostic public.diagnostics%rowtype;
  v_item jsonb;
  v_name text;
  v_phone text;
  v_created integer := 0;
begin
  select * into v_diagnostic
    from public.diagnostics
   where id = p_diagnostic_id;

  if v_diagnostic.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  if length(public.diagnostic_whatsapp_key(p_whatsapp)) <> 10
     or public.diagnostic_whatsapp_key(p_whatsapp)
       <> public.diagnostic_whatsapp_key(v_diagnostic.recipient_whatsapp) then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  if jsonb_typeof(p_referrals) <> 'array'
     or jsonb_array_length(p_referrals) < 1
     or jsonb_array_length(p_referrals) > 3 then
    return jsonb_build_object('outcome', 'INVALID');
  end if;

  for v_item in select value from jsonb_array_elements(p_referrals)
  loop
    v_name := trim(coalesce(v_item->>'name', ''));
    v_phone := trim(coalesce(v_item->>'whatsapp', v_item->>'phone', ''));

    if length(v_name) < 2 or length(v_name) > 120
       or length(public.diagnostic_whatsapp_key(v_phone)) <> 10 then
      return jsonb_build_object('outcome', 'INVALID');
    end if;

    insert into public.leads (
      advisor_id,
      name,
      whatsapp,
      source,
      referred_by_name,
      referrer_diagnostic_id
    ) values (
      v_diagnostic.advisor_id,
      v_name,
      v_phone,
      'diagnostic_referral',
      v_diagnostic.recipient_name,
      v_diagnostic.id
    )
    on conflict do nothing;

    if found then
      v_created := v_created + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'outcome', 'CAPTURED',
    'created', v_created,
    'received', jsonb_array_length(p_referrals)
  );
end;
$$;

-- Si un enlace se reenvía, el tercero sigue sin ver datos del dueño, pero el
-- lead que solicita su propio análisis conserva quién originó la cadena.
create or replace function public.capture_public_diagnostic_lead(
  p_diagnostic_id uuid,
  p_name text,
  p_whatsapp text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diagnostic public.diagnostics%rowtype;
  v_lead_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) < 2
     or length(public.diagnostic_whatsapp_key(p_whatsapp)) <> 10 then
    return jsonb_build_object('outcome', 'INVALID');
  end if;

  select * into v_diagnostic
    from public.diagnostics
   where id = p_diagnostic_id;

  if v_diagnostic.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  insert into public.leads (
    advisor_id,
    name,
    whatsapp,
    source,
    referred_by_name,
    referrer_diagnostic_id
  ) values (
    v_diagnostic.advisor_id,
    trim(p_name),
    trim(p_whatsapp),
    'public_diagnostic',
    v_diagnostic.recipient_name,
    v_diagnostic.id
  )
  on conflict do nothing
  returning id into v_lead_id;

  return jsonb_build_object(
    'outcome', 'CREATED',
    'leadId', v_lead_id,
    'alreadyCaptured', v_lead_id is null
  );
end;
$$;

revoke all on function public.get_or_create_diagnostic_for_lead(uuid) from public;
revoke all on function public.capture_public_diagnostic_referrals(uuid, text, jsonb) from public;
revoke all on function public.capture_public_diagnostic_lead(uuid, text, text) from public;

grant execute on function public.get_or_create_diagnostic_for_lead(uuid) to authenticated;
grant execute on function public.capture_public_diagnostic_referrals(uuid, text, jsonb)
  to anon, authenticated;
grant execute on function public.capture_public_diagnostic_lead(uuid, text, text)
  to anon, authenticated;
