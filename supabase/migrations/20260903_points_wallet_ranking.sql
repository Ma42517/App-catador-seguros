-- Monedero y ranking del asesor.
--
-- Los puntos diarios (Sistema de 20 Puntos) siguen viviendo en el navegador:
-- son la meta de hábito de hoy y se reinician cada mañana. Lo que esta
-- migración agrega es lo que NO puede vivir en el navegador:
--
--   · un ranking entre asesores —editable en localStorage no sería ranking—;
--   · un monedero que se gasta —un saldo editable desde el inspector sería
--     dinero regalado—.
--
-- ── El modelo de tres contadores ──
-- Cada punto ganado hace tres cosas a la vez y NINGUNA se resta al comprar:
--   1. suma al ranking GENERAL (todo el tiempo, nunca se reinicia);
--   2. suma al ranking MENSUAL (se reinicia el día 1, competencia pareja);
--   3. acuña una MONEDA (1 punto = 1 moneda) que sí se gasta.
-- Gastar toca `coins_balance`, jamás los totales de ranking. Por eso comprar un
-- diagnóstico no baja tu posición: premiar el trabajo y cobrar productos son
-- dos cosas distintas y se contabilizan por separado.

-- ─────────────────────────────────────────────────────────────────────────────
-- Saldo por asesor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.advisor_wallets (
  advisor_id uuid primary key references public.profiles (id) on delete cascade,
  -- Ranking que nunca se reinicia: la escalera de prestigio del asesor.
  lifetime_points bigint not null default 0 check (lifetime_points >= 0),
  -- Monedas disponibles para gastar. Se acuñan con los puntos y bajan al comprar.
  coins_balance bigint not null default 0 check (coins_balance >= 0),
  -- Monedas acuñadas en total, sólo informativo (balance = acuñadas - gastadas).
  coins_earned bigint not null default 0 check (coins_earned >= 0),
  coins_spent bigint not null default 0 check (coins_spent >= 0),
  updated_at timestamptz not null default now()
);

alter table public.advisor_wallets enable row level security;

-- El asesor lee su propio monedero. Escribir es sólo por RPC: sin política de
-- INSERT/UPDATE, nadie puede editar su saldo directamente aunque tenga sesión.
grant select on public.advisor_wallets to authenticated;

drop policy if exists "el asesor lee su monedero" on public.advisor_wallets;
create policy "el asesor lee su monedero"
  on public.advisor_wallets for select
  to authenticated
  using (auth.uid() = advisor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Puntos por periodo mensual: el ranking que se reinicia
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Una fila por asesor y por mes. No se borra al cambiar de mes: el histórico
-- queda para "ganador de octubre". El ranking mensual vivo es simplemente el de
-- `period = to_char(now(),'YYYY-MM')`, y el reinicio del día 1 es automático
-- porque esa cadena cambia sola: nadie tiene que correr un job.

create table if not exists public.advisor_month_points (
  advisor_id uuid not null references public.profiles (id) on delete cascade,
  period text not null,                     -- 'YYYY-MM', mes natural
  points bigint not null default 0 check (points >= 0),
  updated_at timestamptz not null default now(),
  primary key (advisor_id, period)
);

create index if not exists advisor_month_points_period_idx
  on public.advisor_month_points (period, points desc);

alter table public.advisor_month_points enable row level security;
grant select on public.advisor_month_points to authenticated;

-- El ranking se lee entre compañeros de la MISMA promotoría, no de toda la base.
-- La política deja ver las filas cuyo asesor comparte tu promotor_id; si aún no
-- hay promotorías, cada quien ve al menos la suya. La consulta ordenada se hace
-- por RPC para no exponer forma de tabla.
drop policy if exists "ranking visible en la promotoria" on public.advisor_month_points;
create policy "ranking visible en la promotoria"
  on public.advisor_month_points for select
  to authenticated
  using (
    advisor_id = auth.uid()
    or exists (
      select 1
        from public.profiles me
        join public.profiles other on other.id = advisor_month_points.advisor_id
       where me.id = auth.uid()
         and me.promotor_id is not null
         and me.promotor_id = other.promotor_id
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Libro de movimientos: sin historial, un saldo es incheckable
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('EARN', 'SPEND')),
  points integer not null default 0,        -- puntos de ranking sumados (EARN)
  coins integer not null,                   -- +acuñadas (EARN) / -gastadas (SPEND)
  reason text not null,                      -- acción de gamificación o producto
  reference text,                            -- id de evento, diagnóstico, etc.
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_advisor_idx
  on public.wallet_ledger (advisor_id, created_at desc);

-- Idempotencia dura: la misma acción con la misma referencia no se acuña dos
-- veces, aunque el cliente reintente. Es lo que evita que una recarga o un
-- doble toque dupliquen puntos o monedas.
create unique index if not exists wallet_ledger_dedupe
  on public.wallet_ledger (advisor_id, kind, reason, reference)
  where reference is not null;

alter table public.wallet_ledger enable row level security;
grant select on public.wallet_ledger to authenticated;

drop policy if exists "el asesor lee su libro" on public.wallet_ledger;
create policy "el asesor lee su libro"
  on public.wallet_ledger for select
  to authenticated
  using (auth.uid() = advisor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Acuñar: registrar puntos ganados (ranking + monedas, en una transacción)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Lo llama el navegador cada vez que la gamificación premia una conducta real
-- (referido, cita, cobro, póliza...). El cliente NO decide cuántos puntos: manda
-- la referencia y la cantidad que su store ya calculó, y el servidor la registra
-- de forma idempotente. La confianza no es total —el store vive en el cliente—,
-- pero el libro deja rastro de todo y la unicidad impide duplicar.

create or replace function public.record_points_earned(
  p_points integer,
  p_reason text,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_coins integer;
  v_period text := to_char(now(), 'YYYY-MM');
  v_wallet public.advisor_wallets%rowtype;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  if p_points is null or p_points <= 0 or p_points > 100 then
    return jsonb_build_object('outcome', 'INVALID');
  end if;

  -- 1 punto = 1 moneda. La tasa vive aquí, en un solo lugar.
  v_coins := p_points;

  -- El registro en el libro es la barrera de idempotencia. Si la referencia ya
  -- existe para esta acción, no se acuña de nuevo y los saldos no se mueven.
  begin
    insert into public.wallet_ledger (advisor_id, kind, points, coins, reason, reference)
    values (v_advisor, 'EARN', p_points, v_coins, p_reason, p_reference);
  exception when unique_violation then
    select * into v_wallet from public.advisor_wallets where advisor_id = v_advisor;
    return jsonb_build_object(
      'outcome', 'DUPLICATE',
      'coinsBalance', coalesce(v_wallet.coins_balance, 0),
      'lifetimePoints', coalesce(v_wallet.lifetime_points, 0)
    );
  end;

  insert into public.advisor_wallets (
    advisor_id, lifetime_points, coins_balance, coins_earned
  )
  values (v_advisor, p_points, v_coins, v_coins)
  on conflict (advisor_id) do update
    set lifetime_points = advisor_wallets.lifetime_points + p_points,
        coins_balance = advisor_wallets.coins_balance + v_coins,
        coins_earned = advisor_wallets.coins_earned + v_coins,
        updated_at = now()
  returning * into v_wallet;

  insert into public.advisor_month_points (advisor_id, period, points)
  values (v_advisor, v_period, p_points)
  on conflict (advisor_id, period) do update
    set points = advisor_month_points.points + p_points,
        updated_at = now();

  return jsonb_build_object(
    'outcome', 'RECORDED',
    'coinsBalance', v_wallet.coins_balance,
    'lifetimePoints', v_wallet.lifetime_points
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Gastar: descuenta monedas de forma atómica, sin tocar el ranking
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Punto único de cobro para diagnósticos y tarjetas. Falla si no alcanza, y el
-- descuento y el asiento en el libro ocurren en la misma transacción: no hay
-- ventana donde el saldo baje sin registro ni al revés.

create or replace function public.spend_coins(
  p_amount integer,
  p_reason text,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_wallet public.advisor_wallets%rowtype;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('outcome', 'INVALID');
  end if;

  select * into v_wallet from public.advisor_wallets
   where advisor_id = v_advisor for update;

  if v_wallet.advisor_id is null or v_wallet.coins_balance < p_amount then
    return jsonb_build_object(
      'outcome', 'INSUFFICIENT',
      'coinsBalance', coalesce(v_wallet.coins_balance, 0)
    );
  end if;

  update public.advisor_wallets
     set coins_balance = coins_balance - p_amount,
         coins_spent = coins_spent + p_amount,
         updated_at = now()
   where advisor_id = v_advisor
  returning * into v_wallet;

  insert into public.wallet_ledger (advisor_id, kind, coins, reason, reference)
  values (v_advisor, 'SPEND', -p_amount, p_reason, p_reference);

  return jsonb_build_object('outcome', 'SPENT', 'coinsBalance', v_wallet.coins_balance);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lectura: mi resumen y las dos tablas de ranking
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.my_wallet_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_wallet public.advisor_wallets%rowtype;
  v_month bigint;
  v_period text := to_char(now(), 'YYYY-MM');
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_wallet from public.advisor_wallets where advisor_id = v_advisor;
  select points into v_month
    from public.advisor_month_points
   where advisor_id = v_advisor and period = v_period;

  return jsonb_build_object(
    'outcome', 'READY',
    'coinsBalance', coalesce(v_wallet.coins_balance, 0),
    'coinsEarned', coalesce(v_wallet.coins_earned, 0),
    'coinsSpent', coalesce(v_wallet.coins_spent, 0),
    'lifetimePoints', coalesce(v_wallet.lifetime_points, 0),
    'monthPoints', coalesce(v_month, 0),
    'period', v_period
  );
end;
$$;

-- Ranking de la promotoría. `p_scope` elige la escalera: 'month' (competencia
-- viva del mes en curso) o 'lifetime' (prestigio de todo el tiempo). Devuelve
-- una lista ordenada y ya recortada, con la posición del propio asesor marcada.
create or replace function public.promotoria_ranking(
  p_scope text default 'month',
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_promotor uuid;
  v_period text := to_char(now(), 'YYYY-MM');
  v_rows jsonb;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select promotor_id into v_promotor from public.profiles where id = v_advisor;

  -- Universo del ranking: la propia promotoría. Sin promotor asignado, el asesor
  -- se ve sólo a sí mismo, hasta que quede en un equipo.
  with peers as (
    select p.id, coalesce(p.full_name, p.email, 'Asesor') as name
      from public.profiles p
     where (v_promotor is not null and p.promotor_id = v_promotor)
        or p.id = v_advisor
  ),
  scored as (
    select
      peers.id,
      peers.name,
      case
        when p_scope = 'lifetime' then coalesce(w.lifetime_points, 0)
        else coalesce(mp.points, 0)
      end as score
      from peers
      left join public.advisor_wallets w on w.advisor_id = peers.id
      left join public.advisor_month_points mp
        on mp.advisor_id = peers.id and mp.period = v_period
  ),
  ranked as (
    select id, name, score,
           rank() over (order by score desc, name asc) as position
      from scored
  )
  select jsonb_agg(
           jsonb_build_object(
             'position', position,
             'name', name,
             'score', score,
             'isMe', id = v_advisor
           )
           order by position
         )
    into v_rows
    from ranked
   where position <= greatest(1, least(p_limit, 100));

  return jsonb_build_object(
    'outcome', 'READY',
    'scope', case when p_scope = 'lifetime' then 'lifetime' else 'month' end,
    'period', v_period,
    'entries', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on function public.record_points_earned(integer, text, text) from public;
revoke all on function public.spend_coins(integer, text, text) from public;
revoke all on function public.my_wallet_summary() from public;
revoke all on function public.promotoria_ranking(text, integer) from public;

-- Todo el monedero exige sesión: son datos y dinero del asesor. Nada para anon.
grant execute on function public.record_points_earned(integer, text, text) to authenticated;
grant execute on function public.spend_coins(integer, text, text) to authenticated;
grant execute on function public.my_wallet_summary() to authenticated;
grant execute on function public.promotoria_ranking(text, integer) to authenticated;
