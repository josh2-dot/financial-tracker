-- ============================================================
-- Personal Finance Tracker — Initial Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- Buckets: user-defined tags (Personal / Work / whatever)
-- Fully editable. No hardcoded names.
-- ------------------------------------------------------------
create table public.buckets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#94a3b8',
  sort_order int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Only one default bucket per user
create unique index buckets_user_default_unique
  on public.buckets (user_id) where is_default = true;

-- ------------------------------------------------------------
-- Accounts: bank / cash / wallet / savings
-- ------------------------------------------------------------
create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('bank', 'cash', 'wallet', 'savings')),
  currency text not null default 'NGN',
  opening_balance numeric(14,2) not null default 0,
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Categories (one level of nesting via parent_id)
-- ------------------------------------------------------------
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  default_bucket_id uuid references public.buckets(id) on delete set null,
  kind text not null default 'expense' check (kind in ('expense', 'income', 'transfer')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Transactions: signed amounts (negative = outflow, positive = inflow)
-- bucket_splits (jsonb) supports [{bucket_id, pct}, ...] summing to 100
-- when null, transaction is fully in bucket_id
-- ------------------------------------------------------------
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references public.accounts(id) on delete restrict not null,
  amount numeric(14,2) not null,
  occurred_at timestamptz not null default now(),
  category_id uuid references public.categories(id) on delete set null,
  bucket_id uuid references public.buckets(id) on delete set null,
  bucket_splits jsonb,
  counterparty text,
  note text,
  source text not null default 'manual' check (source in ('manual', 'sms', 'import', 'routine')),
  transfer_pair_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index transactions_user_occurred_idx on public.transactions (user_id, occurred_at desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_bucket_idx on public.transactions (bucket_id);

-- ------------------------------------------------------------
-- Savings goals + contributions + routine (recurring) plans
-- ------------------------------------------------------------
create table public.savings_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_amount numeric(14,2) not null,
  target_date date,
  linked_account_id uuid references public.accounts(id) on delete set null,
  bucket_id uuid references public.buckets(id) on delete set null,
  color text not null default '#22c55e',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.savings_contributions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references public.savings_goals(id) on delete cascade not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric(14,2) not null,
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index savings_contributions_goal_idx on public.savings_contributions (goal_id);

-- Routine savings: recurring contribution templates
-- On app load we check for `next_run_date <= today AND active`
-- and either auto-create (if auto_confirm) or prompt the user.
create table public.routine_savings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references public.savings_goals(id) on delete cascade not null,
  source_account_id uuid references public.accounts(id) on delete restrict not null,
  amount numeric(14,2) not null,
  frequency text not null check (frequency in ('daily','weekly','biweekly','monthly')),
  day_of_week int check (day_of_week between 0 and 6),
  day_of_month int check (day_of_month between 1 and 31),
  next_run_date date not null,
  active boolean not null default true,
  auto_confirm boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create index routine_savings_next_run_idx
  on public.routine_savings (user_id, active, next_run_date);

-- ------------------------------------------------------------
-- Monthly essentials — feeds runway calculation
-- ------------------------------------------------------------
create table public.monthly_essentials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.buckets enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.routine_savings enable row level security;
alter table public.monthly_essentials enable row level security;

create policy "own buckets" on public.buckets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own accounts" on public.accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own categories" on public.categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on public.transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own savings_goals" on public.savings_goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own savings_contributions" on public.savings_contributions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own routine_savings" on public.routine_savings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own monthly_essentials" on public.monthly_essentials for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Views: derived reads
-- ============================================================

-- Live account balance = opening_balance + sum(transactions)
create or replace view public.account_balances as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.type,
  a.currency,
  a.opening_balance + coalesce(sum(t.amount), 0) as balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
where a.archived = false
group by a.id;

-- Savings goal progress + pct
create or replace view public.savings_goal_progress as
select
  g.id as goal_id,
  g.user_id,
  g.name,
  g.target_amount,
  g.target_date,
  g.linked_account_id,
  g.color,
  coalesce(sum(c.amount), 0) as current_amount,
  case
    when g.target_amount > 0 then
      least(100, round((coalesce(sum(c.amount), 0) / g.target_amount * 100)::numeric, 1))
    else 0
  end as pct
from public.savings_goals g
left join public.savings_contributions c on c.goal_id = g.id
where g.archived = false
group by g.id;

-- ============================================================
-- Bootstrap trigger: seed default buckets + categories on signup
-- User can rename or delete these freely afterwards.
-- ============================================================
create or replace function public.setup_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.buckets (user_id, name, color, sort_order, is_default) values
    (new.id, 'Personal', '#3b82f6', 0, true),
    (new.id, 'Work',     '#10b981', 1, false);

  insert into public.categories (user_id, name, kind) values
    (new.id, 'Food',          'expense'),
    (new.id, 'Transport',     'expense'),
    (new.id, 'Bills',         'expense'),
    (new.id, 'Subscriptions', 'expense'),
    (new.id, 'Health',        'expense'),
    (new.id, 'Salary',        'income'),
    (new.id, 'Other Income',  'income'),
    (new.id, 'Transfer',      'transfer');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.setup_user();
