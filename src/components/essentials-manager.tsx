"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import type { MonthlyEssential } from "@/lib/types";

export default function EssentialsManager({
  essentials
}: {
  essentials: MonthlyEssential[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const total = essentials.reduce((s, e) => s + Number(e.amount), 0);

  async function add() {
    if (!label.trim() || !amount) return;
    setBusy(true);
    const s = createClient();
    const { data: userData } = await s.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    await s.from("monthly_essentials").insert({
      user_id: uid,
      label: label.trim(),
      amount: parseFloat(amount)
    });
    setLabel("");
    setAmount("");
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    const s = createClient();
    await s.from("monthly_essentials").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {essentials.map((e) => (
          <li key={e.id} className="card flex items-center justify-between">
            <div>
              <div className="text-sm">{e.label}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm">{formatMoney(Number(e.amount))}</div>
              <button
                className="text-xs text-red-400/70 underline"
                onClick={() => remove(e.id)}
              >
                remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {essentials.length > 0 && (
        <div className="flex justify-between px-1 text-sm">
          <span className="text-neutral-500">Total</span>
          <span>{formatMoney(total)}</span>
        </div>
      )}
      <div className="card space-y-2">
        <input
          className="input"
          placeholder="Label (Rent, Data, etc)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="input"
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          className="btn-primary w-full"
          onClick={add}
          disabled={busy || !label.trim() || !amount}
        >
          Add
        </button>
      </div>
    </div>
  );
}
