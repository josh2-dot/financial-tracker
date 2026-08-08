"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { advanceRunDate } from "@/lib/routine-savings";
import { formatMoney, todayISO } from "@/lib/utils";
import type { RoutineSaving } from "@/lib/types";

type Due = RoutineSaving & {
  goal_name: string;
  account_name: string;
};

export default function RoutineSavingsPrompt() {
  const [due, setDue] = useState<Due[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void loadDue();
  }, []);

  async function loadDue() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("routine_savings")
      .select(
        `
        *,
        savings_goals!inner(name),
        accounts!inner(name)
      `
      )
      .eq("active", true)
      .lte("next_run_date", todayISO());
    if (error || !data) return;

    // Auto-confirm ones fire immediately
    const dueList: Due[] = data.map((r: any) => ({
      ...r,
      goal_name: r.savings_goals?.name ?? "Goal",
      account_name: r.accounts?.name ?? "Account"
    }));

    for (const r of dueList.filter((x) => x.auto_confirm)) {
      await runOnce(r, true);
    }
    setDue(dueList.filter((x) => !x.auto_confirm));
  }

  async function runOnce(r: Due, silent = false) {
    if (!silent) setBusy(r.id);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    // 1) Transaction — outflow from source account
    const { data: txn, error: txnErr } = await supabase
      .from("transactions")
      .insert({
        user_id: uid,
        account_id: r.source_account_id,
        amount: -Math.abs(Number(r.amount)),
        occurred_at: new Date().toISOString(),
        note: `Routine saving → ${r.goal_name}`,
        source: "routine"
      })
      .select()
      .single();
    if (txnErr) {
      console.error(txnErr);
      if (!silent) setBusy(null);
      return;
    }

    // 2) Contribution row
    await supabase.from("savings_contributions").insert({
      user_id: uid,
      goal_id: r.goal_id,
      transaction_id: txn?.id ?? null,
      amount: Math.abs(Number(r.amount)),
      occurred_at: new Date().toISOString(),
      note: "Routine"
    });

    // 3) Advance next_run_date
    const next = advanceRunDate(r.next_run_date, r.frequency);
    await supabase
      .from("routine_savings")
      .update({ next_run_date: next, last_run_at: new Date().toISOString() })
      .eq("id", r.id);

    if (!silent) {
      setDue((prev) => prev.filter((x) => x.id !== r.id));
      setBusy(null);
    }
  }

  async function skip(r: Due) {
    setBusy(r.id);
    const supabase = createClient();
    const next = advanceRunDate(r.next_run_date, r.frequency);
    await supabase.from("routine_savings").update({ next_run_date: next }).eq("id", r.id);
    setDue((prev) => prev.filter((x) => x.id !== r.id));
    setBusy(null);
  }

  if (due.length === 0) return null;

  return (
    <div className="card border-yellow-900" style={{ borderColor: "#78350f" }}>
      <div className="mb-2 text-xs uppercase tracking-wider text-yellow-500">
        Routine savings due
      </div>
      <ul className="space-y-3">
        {due.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">
                {formatMoney(Number(r.amount))} → {r.goal_name}
              </div>
              <div className="truncate text-xs text-neutral-500">
                from {r.account_name} · {r.frequency}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-ghost"
                onClick={() => skip(r)}
                disabled={busy === r.id}
              >
                Skip
              </button>
              <button
                className="btn-primary"
                onClick={() => runOnce(r)}
                disabled={busy === r.id}
              >
                {busy === r.id ? "..." : "Confirm"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
