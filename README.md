# Finance Tracker — Weekend 1 Build

A single-user personal finance PWA. Next.js 14 App Router + Supabase + Tailwind.
No hardcoded categorization or bucket names. Renaming is a first-class feature.

## What's here

- **Auth**: Supabase magic-link. Middleware-protected routes.
- **Accounts**: bank / cash / wallet / savings. Live balance = opening + Σ transactions (via a Postgres view).
- **Transactions**: signed amounts (negative = outflow). Filter by bucket.
- **Buckets**: fully user-editable — name, color, default. Not "Personal vs Work"; whatever you want.
- **Savings**:
  - Goals with progress bars and target dates.
  - **One-off contributions** (creates a linked transaction + contribution row).
  - **Routine (recurring) savings**: daily / weekly / biweekly / monthly. On dashboard open, due routines either auto-confirm (silent) or prompt for confirm/skip.
- **Runway calc**: liquid balance ÷ monthly essentials (falls back to this month's spend if essentials aren't set).
- **Dashboard**: liquid, savings, runway, month in/out, per-bucket spend, top 3 goals.
- **PWA**: manifest included. Add icons + `next-pwa` to complete offline install.

## Setup

### 1. Supabase
- Create a fresh Supabase project (not a schema inside an existing one).
- Copy the SQL from `supabase/migrations/0001_initial_schema.sql` into the SQL editor and run it.
- Under Authentication → URL Configuration, add `http://localhost:3000/auth/callback` and your prod URL.
- Copy the project URL and anon key into `.env.local`.

### 2. App
```bash
cp .env.local.example .env.local   # fill in the values
npm install
npm run dev
```

Open `http://localhost:3000`. First sign-in triggers the `setup_user()` function which seeds default buckets (Personal, Work — rename or delete freely) and starter expense/income categories.

### 3. First-run flow
1. Go to **Accounts** → add at least one account with its current balance as `opening_balance`.
2. (Optional) **Buckets** → rename the defaults or add your own.
3. (Optional) **Settings → Monthly essentials** → add recurring must-pays. Without this, runway falls back to this month's actual spend.
4. **Savings** → create a goal, then optionally set a routine (e.g. ₦50,000 monthly from GTB → Emergency fund).
5. Start adding transactions.

## Data model

- `buckets` — user-editable tags. `is_default` used to preselect on new transactions.
- `accounts` — with archived flag (transactions preserved).
- `categories` — one level of nesting via `parent_id`. `kind` ∈ (expense, income, transfer).
- `transactions` — signed `amount`. Optional `bucket_id`. `bucket_splits` (jsonb) reserved for future partial splits.
- `savings_goals` + `savings_contributions` + `routine_savings`.
- `monthly_essentials` — flat list, summed for runway.

Two views:
- `account_balances` — opening + tx sum.
- `savings_goal_progress` — current + pct.

RLS is on for every table; every policy is `auth.uid() = user_id`.

## What's NOT in weekend 1

Deliberately skipped so you can ship and use it:
- Multi-currency conversion (single currency per account is fine).
- Budgets / envelopes.
- Recurring transaction generation (only routine *savings* recur).
- Category CRUD UI (edit in Supabase for now).
- CSV import.
- SMS ingestion (Track 2 — separate spike).
- Charts beyond progress bars.

## Weekend 2 candidates (in priority order)
1. CSV import for backfilling from bank statements.
2. Category CRUD UI + parent nesting.
3. Monthly rollup screen (per-bucket, per-category, with trend).
4. Recurring general transactions (rent, subscriptions), same pattern as routine savings.
5. Transaction editing (currently insert-only).
6. Split transactions UI using the existing `bucket_splits` jsonb.

## File tree

```
finance-tracker/
├── supabase/migrations/0001_initial_schema.sql
├── src/
│   ├── middleware.ts
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── routine-savings.ts   # advance/catch-up date logic
│   ├── components/
│   │   ├── nav.tsx
│   │   ├── transaction-form.tsx
│   │   ├── routine-savings-prompt.tsx
│   │   ├── accounts-manager.tsx
│   │   ├── buckets-manager.tsx
│   │   ├── savings-manager.tsx
│   │   └── essentials-manager.tsx
│   └── app/
│       ├── layout.tsx
│       ├── globals.css
│       ├── page.tsx                       # dashboard
│       ├── login/page.tsx
│       ├── auth/callback/route.ts
│       ├── auth/signout/route.ts
│       ├── transactions/page.tsx
│       ├── transactions/new/page.tsx
│       ├── accounts/page.tsx
│       ├── buckets/page.tsx
│       ├── savings/page.tsx
│       └── settings/page.tsx
├── public/manifest.json
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
└── postcss.config.js
```
