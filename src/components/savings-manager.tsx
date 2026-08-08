"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatDate, todayISO } from "@/lib/utils";
import type {
  Account,
  RoutineFrequency,
  RoutineSaving,
  SavingsGoal,
  SavingsGoalProgress
} from "@/lib/types";

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6"];

export default function SavingsManager({
  goals,
  progress,
  routines,
  accounts
}: {
  goals: SavingsGoal[];
  progress: SavingsGoalProgress[];
  routines: RoutineSaving[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [addingGoal, setAddingGoal] = useState(false);
  const [contributingTo, setContributingTo] = useState<string | null>(null);
  const [routineFor, setRoutineFor] = useState<string | null>(null);

  const progressById = Object.fromEntries(progress.map((p) => [p.goal_id, p]));
  const routinesByGoal: Record<string, RoutineSaving[]> = {};
  for (const r of routines) {
    (routinesByGoal[r.goal_id] ||= []).push(r);
  }
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return (
    <div className="space-y-4">
      {/* Goal list */}
      <ul className="space-y-3">
        {goals.map((g) => {
          const p = progressById[g.id];
          const pct = p ? Number(p.pct) : 0;
          const current = p ? Number(p.current_amount) : 0;
          const gRoutines = routinesByGoal[g.id] ?? [];
          return (
            <li key={g.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-neutral-500">
                    Target {formatMoney(Number(g.target_amount))}
                    {g.target_date && ` by ${formatDate(g.target_date)}`}
                  </div>
                </div>
                <button
                  className="text-xs text-red-400/70 underline"
                  onClick={async () => {
                    if (!confirm(`Archive "${g.name}"?`)) return;
                    const s = createClient();
                    await s.from("savings_goals").update({ archived: true }).eq("id", g.id);
                    router.refresh();
                  }}
                >
                  archive
                </button>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-neutral-400">
                  <span>{formatMoney(current)}</span>
                  <span>{pct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: g.color }}
                  />
                </div>
              </div>

              {gRoutines.length > 0 && (
                <div className="rounded-lg bg-neutral-900 p-3 text-xs">
                  <div className="mb-1 uppercase tracking-wider text-neutral-500">
                    Routine
                  </div>
                  {gRoutines.map((r) => (
                    <div key={r.id} className="flex justify-between">
                      <span>
                        {formatMoney(Number(r.amount))} {r.frequency} from{" "}
                        {accountById[r.source_account_id]?.name ?? "?"}
                      </span>
                      <button
                        className="text-red-400/70 underline"
                        onClick={async () => {
                          const s = createClient();
                          await s.from("routine_savings").update({ active: false }).eq("id", r.id);
                          router.refresh();
                        }}
                      >
                        stop
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="btn-ghost flex-1"
                  onClick={() => setRoutineFor(g.id)}
                >
                  + Routine
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={() => setContributingTo(g.id)}
                >
                  + Contribute
                </button>
              </div>

              {contributingTo === g.id && (
                <ContributeForm
                  goalId={g.id}
                  accounts={accounts}
                  onClose={() => setContributingTo(null)}
                  onSaved={() => {
                    setContributingTo(null);
                    router.refresh();
                  }}
                />
              )}
              {routineFor === g.id && (
                <RoutineForm
                  goalId={g.id}
                  accounts={accounts}
                  onClose={() => setRoutineFor(null)}
                  onSaved={() => {
                    setRoutineFor(null);
                    router.refresh();
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>

      {addingGoal ? (
        <NewGoalForm
          onClose={() => setAddingGoal(false)}
          onSaved={() => {
            setAddingGoal(false);
            router.refresh();
          }}
        />
      ) : (
        <button className="btn-ghost w-full" onClick={() => setAddingGoal(true)}>
          + New savings goal
        </button>
      )}
    </div>
  );
}

function NewGoalForm({
  onClose,
  onSaved
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const s = createClient();
    const { data: userData } = await s.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    await s.from("savings_goals").insert({
      user_id: uid,
      name,
      target_amount: parseFloat(target) || 0,
      target_date: date || null,
      color
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="card space-y-3">
      <input
        className="input"
        placeholder="Goal name (e.g. Emergency fund)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input"
        type="number"
        step="0.01"
        placeholder="Target amount"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      <input
        className="input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="flex gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary flex-1"
          onClick={save}
          disabled={busy || !name}
        >
          Create
        </button>
      </div>
    </div>
  );
}

function ContributeForm({
  goalId,
  accounts,
  onClose,
  onSaved
}: {
  goalId: string;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const numeric = parseFloat(amount);
    if (!numeric) return;
    setBusy(true);
    const s = createClient();
    const { data: userData } = await s.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const { data: txn } = await s
      .from("transactions")
      .insert({
        user_id: uid,
        account_id: accountId,
        amount: -Math.abs(numeric),
        occurred_at: new Date().toISOString(),
        note: note || "Savings contribution",
        source: "manual"
      })
      .select()
      .single();

    await s.from("savings_contributions").insert({
      user_id: uid,
      goal_id: goalId,
      transaction_id: txn?.id ?? null,
      amount: Math.abs(numeric),
      occurred_at: new Date().toISOString(),
      note: note || null
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="space-y-3 rounded-lg bg-neutral-900 p-3">
      <input
        className="input"
        type="number"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <select
        className="input"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            from {a.name}
          </option>
        ))}
      </select>
      <input
        className="input"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary flex-1"
          onClick={save}
          disabled={busy || !amount || !accountId}
        >
          Contribute
        </button>
      </div>
    </div>
  );
}

function RoutineForm({
  goalId,
  accounts,
  onClose,
  onSaved
}: {
  goalId: string;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [frequency, setFrequency] = useState<RoutineFrequency>("monthly");
  const [start, setStart] = useState(todayISO());
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    const numeric = parseFloat(amount);
    if (!numeric) return;
    setBusy(true);
    const s = createClient();
    const { data: userData } = await s.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    await s.from("routine_savings").insert({
      user_id: uid,
      goal_id: goalId,
      source_account_id: accountId,
      amount: numeric,
      frequency,
      next_run_date: start,
      auto_confirm: autoConfirm,
      active: true
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="space-y-3 rounded-lg bg-neutral-900 p-3">
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        Routine savings
      </div>
      <input
        className="input"
        type="number"
        step="0.01"
        placeholder="Amount per run"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <select
        className="input"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            from {a.name}
          </option>
        ))}
      </select>
      <select
        className="input"
        value={frequency}
        onChange={(e) => setFrequency(e.target.value as RoutineFrequency)}
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Every 2 weeks</option>
        <option value="monthly">Monthly</option>
      </select>
      <div>
        <label className="label">First run date</label>
        <input
          type="date"
          className="input"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoConfirm}
          onChange={(e) => setAutoConfirm(e.target.checked)}
        />
        <span>Auto-confirm (no prompt on due day)</span>
      </label>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary flex-1"
          onClick={save}
          disabled={busy || !amount || !accountId}
        >
          Start routine
        </button>
      </div>
    </div>
  );
}
