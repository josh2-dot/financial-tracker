"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Account, Bucket, Category } from "@/lib/types";
import { todayISO } from "@/lib/utils";

type Direction = "out" | "in";

export default function TransactionForm({
  accounts,
  buckets,
  categories
}: {
  accounts: Account[];
  buckets: Bucket[];
  categories: Category[];
}) {
  const router = useRouter();
  const defaultBucket = buckets.find((b) => b.is_default) ?? buckets[0];

  const [direction, setDirection] = useState<Direction>("out");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [bucketId, setBucketId] = useState(defaultBucket?.id ?? "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [counterparty, setCounterparty] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const relevantCats = categories.filter((c) =>
    direction === "in" ? c.kind === "income" : c.kind === "expense"
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setErr("Not signed in");
      setSaving(false);
      return;
    }

    const numeric = parseFloat(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setErr("Enter a positive amount");
      setSaving(false);
      return;
    }

    const signed = direction === "out" ? -numeric : numeric;

    const { error } = await supabase.from("transactions").insert({
      user_id: uid,
      account_id: accountId,
      amount: signed,
      occurred_at: new Date(date + "T12:00:00").toISOString(),
      category_id: categoryId || null,
      bucket_id: bucketId || null,
      counterparty: counterparty || null,
      note: note || null,
      source: "manual"
    });

    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push("/transactions");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Direction toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDirection("out")}
          className={`btn ${direction === "out" ? "bg-red-500/20 text-red-300" : "btn-ghost"}`}
        >
          − Expense
        </button>
        <button
          type="button"
          onClick={() => setDirection("in")}
          className={`btn ${direction === "in" ? "bg-green-500/20 text-green-300" : "btn-ghost"}`}
        >
          + Income
        </button>
      </div>

      <div>
        <label className="label">Amount</label>
        <input
          className="input text-2xl"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Account</label>
          <select
            className="input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            {accounts.length === 0 && <option value="">— Add one first —</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Bucket</label>
          <select
            className="input"
            value={bucketId}
            onChange={(e) => setBucketId(e.target.value)}
          >
            <option value="">— None —</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Category</label>
        <select
          className="input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— None —</option>
          {relevantCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Who / where</label>
        <input
          className="input"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="label">Note</label>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="label">Date</label>
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {err && <p className="text-xs text-red-400">{err}</p>}

      <button className="btn-primary w-full" disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
