import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, startOfMonthISO } from "@/lib/utils";
import RoutineSavingsPrompt from "@/components/routine-savings-prompt";
import type {
  AccountBalance,
  Bucket,
  Transaction,
  SavingsGoalProgress
} from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: balances }, { data: buckets }, { data: monthTxns }, { data: goals }, { data: essentials }] =
    await Promise.all([
      supabase.from("account_balances").select("*"),
      supabase.from("buckets").select("*").order("sort_order"),
      supabase
        .from("transactions")
        .select("*")
        .gte("occurred_at", startOfMonthISO()),
      supabase.from("savings_goal_progress").select("*"),
      supabase.from("monthly_essentials").select("*")
    ]);

  const bs = (balances as AccountBalance[]) ?? [];
  const bks = (buckets as Bucket[]) ?? [];
  const txns = (monthTxns as Transaction[]) ?? [];
  const gs = (goals as SavingsGoalProgress[]) ?? [];
  const ess = (essentials ?? []) as { amount: number }[];

  const totalLiquid = bs
    .filter((a) => a.type !== "savings")
    .reduce((s, a) => s + Number(a.balance), 0);
  const totalSavings = bs
    .filter((a) => a.type === "savings")
    .reduce((s, a) => s + Number(a.balance), 0);

  const monthSpend = txns
    .filter((t) => Number(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const monthIncome = txns
    .filter((t) => Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0);

  // Runway = liquid / (monthly essentials || monthly spend fallback)
  const essentialsTotal = ess.reduce((s, e) => s + Number(e.amount), 0);
  const monthlyBurn = essentialsTotal > 0 ? essentialsTotal : monthSpend;
  const runwayMonths = monthlyBurn > 0 ? totalLiquid / monthlyBurn : null;

  // Bucket totals for month
  const bucketTotals: Record<string, number> = {};
  for (const t of txns) {
    if (t.bucket_id && Number(t.amount) < 0) {
      bucketTotals[t.bucket_id] = (bucketTotals[t.bucket_id] || 0) + Math.abs(Number(t.amount));
    }
  }

  return (
    <div className="space-y-4">
      <RoutineSavingsPrompt />

      <header className="mb-2">
        <h1 className="text-lg font-medium text-neutral-400">Overview</h1>
      </header>

      {/* Liquid + Runway */}
      <section className="card">
        <div className="mb-1 text-xs uppercase tracking-wider text-neutral-500">Liquid</div>
        <div className="text-3xl font-semibold">{formatMoney(totalLiquid)}</div>
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>
            Savings: <span className="text-neutral-300">{formatMoney(totalSavings)}</span>
          </span>
          <span>
            Runway:{" "}
            <span className="text-neutral-300">
              {runwayMonths === null
                ? "—"
                : runwayMonths > 99
                  ? "99+ mo"
                  : `${runwayMonths.toFixed(1)} mo`}
            </span>
          </span>
        </div>
      </section>

      {/* Month summary */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-neutral-500">Month in</div>
          <div className="text-lg text-green-400">{formatMoney(monthIncome)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-neutral-500">Month out</div>
          <div className="text-lg text-red-400">{formatMoney(monthSpend)}</div>
        </div>
      </section>

      {/* Buckets */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm text-neutral-400">Buckets this month</h2>
          <Link href="/buckets" className="text-xs text-neutral-500 underline">
            edit
          </Link>
        </div>
        {bks.length === 0 ? (
          <p className="text-xs text-neutral-500">No buckets yet.</p>
        ) : (
          <ul className="space-y-2">
            {bks.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: b.color }}
                  />
                  <span>{b.name}</span>
                </div>
                <span className="text-neutral-400">
                  {formatMoney(bucketTotals[b.id] || 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Savings goals summary */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm text-neutral-400">Savings goals</h2>
          <Link href="/savings" className="text-xs text-neutral-500 underline">
            manage
          </Link>
        </div>
        {gs.length === 0 ? (
          <p className="text-xs text-neutral-500">No goals yet.</p>
        ) : (
          <ul className="space-y-3">
            {gs.slice(0, 3).map((g) => (
              <li key={g.goal_id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{g.name}</span>
                  <span className="text-neutral-400">
                    {formatMoney(Number(g.current_amount))} /{" "}
                    {formatMoney(Number(g.target_amount))}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${g.pct}%`, background: g.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pt-2">
        <Link href="/transactions/new" className="btn-primary w-full">
          + Add transaction
        </Link>
      </div>
    </div>
  );
}
