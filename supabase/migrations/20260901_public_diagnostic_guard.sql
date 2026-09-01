-- Candado passwordless para Radiografías Patrimoniales compartidas.
--
-- La tabla nunca se abre a lectura anónima. El navegador sólo puede llamar
-- funciones SECURITY DEFINER que comparan el WhatsApp antes de devolver
-- respuestas o resultados. Así, ocultar el cuestionario en React no es la
-- barrera de seguridad: la validación también vive en Postgres.

create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.profiles (id) on delete cascade,
  recipient_name text not null,
  recipient_whatsapp text not null,
  status text not null default 'PENDIENTE'
    check (status in ('PENDIENTE', 'COMPLETADO')),
  responses jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists diagnostics_advisor_created_idx
  on public.diagnostics (advisor_id, created_at desc);

alter table public.diagnostics enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.diagnostics to authenticated;

-- El asesor administra únicamente los pases que creó.
drop policy if exists "el asesor administra sus diagnosticos" on public.diagnostics;
create policy "el asesor administra sus diagnosticos"
  on public.diagnostics for all
  to authenticated
  using (auth.uid() = advisor_id)
  with check (auth.uid() = advisor_id);

-- Normalización compartida por todos los RPC. Compara los últimos diez dígitos
-- para tolerar +52, espacios, guiones y formatos nacionales sin guardar una
-- versión débil o distinta del dato original.
create or replace function public.diagnostic_whatsapp_key(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select right(regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g'), 10)
$$;

revoke all on function public.diagnostic_whatsapp_key(text) from public;

-- Desbloqueo. Nunca devuelve recipient_whatsapp, ni siquiera cuando coincide.
-- En mismatch sólo expone el nombre necesario para el mensaje y el advisor_id
-- necesario para atribuir el lead posterior.
create or replace function public.unlock_public_diagnostic(
  p_diagnostic_id uuid,
  p_whatsapp text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.diagnostics%rowtype;
  v_input_key text;
begin
  select * into v_row
    from public.diagnostics
   where id = p_diagnostic_id;

  if v_row.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  v_input_key := public.diagnostic_whatsapp_key(p_whatsapp);
  if length(v_input_key) <> 10
     or v_input_key <> public.diagnostic_whatsapp_key(v_row.recipient_whatsapp) then
    return jsonb_build_object(
      'outcome', 'MISMATCH',
      'recipientName', v_row.recipient_name,
      'advisorId', v_row.advisor_id
    );
  end if;

  return jsonb_build_object(
    'outcome', 'MATCH',
    'id', v_row.id,
    'status', v_row.status,
    'recipientName', v_row.recipient_name,
    'advisorId', v_row.advisor_id,
    'responses', v_row.responses,
    'results', v_row.results,
    'revision', v_row.revision,
    'completedAt', v_row.completed_at
  );
end;
$$;

-- Guardado optimista para continuar más tarde sin que dos pestañas se pisen.
create or replace function public.save_public_diagnostic_progress(
  p_diagnostic_id uuid,
  p_whatsapp text,
  p_responses jsonb,
  p_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revision integer;
begin
  update public.diagnostics
     set responses = coalesce(p_responses, '{}'::jsonb),
         revision = revision + 1,
         updated_at = now()
   where id = p_diagnostic_id
     and status = 'PENDIENTE'
     and revision = p_revision
     and length(public.diagnostic_whatsapp_key(p_whatsapp)) = 10
     and public.diagnostic_whatsapp_key(recipient_whatsapp)
       = public.diagnostic_whatsapp_key(p_whatsapp)
  returning revision into v_revision;

  if v_revision is null then
    return jsonb_build_object('outcome', 'CONFLICT');
  end if;

  return jsonb_build_object('outcome', 'SAVED', 'revision', v_revision);
end;
$$;

-- Cierre atómico: guarda las últimas respuestas y el snapshot calculado antes
-- de cambiar el estado. Una vez COMPLETADO ningún RPC público vuelve a editarlo.
create or replace function public.complete_public_diagnostic(
  p_diagnostic_id uuid,
  p_whatsapp text,
  p_responses jsonb,
  p_results jsonb,
  p_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.diagnostics%rowtype;
begin
  update public.diagnostics
     set responses = coalesce(p_responses, '{}'::jsonb),
         results = coalesce(p_results, '{}'::jsonb),
         status = 'COMPLETADO',
         revision = revision + 1,
         updated_at = now(),
         completed_at = now()
   where id = p_diagnostic_id
     and status = 'PENDIENTE'
     and revision = p_revision
     and length(public.diagnostic_whatsapp_key(p_whatsapp)) = 10
     and public.diagnostic_whatsapp_key(recipient_whatsapp)
       = public.diagnostic_whatsapp_key(p_whatsapp)
  returning * into v_row;

  if v_row.id is null then
    return jsonb_build_object('outcome', 'CONFLICT');
  end if;

  return jsonb_build_object(
    'outcome', 'COMPLETED',
    'status', v_row.status,
    'responses', v_row.responses,
    'results', v_row.results,
    'revision', v_row.revision,
    'completedAt', v_row.completed_at
  );
end;
$$;

-- Fricción positiva: un tercero deja sus datos sin obtener las respuestas del
-- dueño. El advisor_id se resuelve dentro de la función; el cliente no puede
-- atribuir el lead a una cuenta arbitraria.
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
  v_advisor_id uuid;
  v_lead_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then
    return jsonb_build_object('outcome', 'INVALID');
  end if;

  select advisor_id into v_advisor_id
    from public.diagnostics
   where id = p_diagnostic_id;

  if v_advisor_id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  insert into public.leads (advisor_id, name, whatsapp, source)
  values (v_advisor_id, trim(p_name), trim(coalesce(p_whatsapp, '')), 'public_diagnostic')
  returning id into v_lead_id;

  return jsonb_build_object('outcome', 'CREATED', 'leadId', v_lead_id);
end;
$$;

revoke all on function public.unlock_public_diagnostic(uuid, text) from public;
revoke all on function public.save_public_diagnostic_progress(uuid, text, jsonb, integer) from public;
revoke all on function public.complete_public_diagnostic(uuid, text, jsonb, jsonb, integer) from public;
revoke all on function public.capture_public_diagnostic_lead(uuid, text, text) from public;

grant execute on function public.unlock_public_diagnostic(uuid, text) to anon, authenticated;
grant execute on function public.save_public_diagnostic_progress(uuid, text, jsonb, integer) to anon, authenticated;
grant execute on function public.complete_public_diagnostic(uuid, text, jsonb, jsonb, integer) to anon, authenticated;
grant execute on function public.capture_public_diagnostic_lead(uuid, text, text) to anon, authenticated;
