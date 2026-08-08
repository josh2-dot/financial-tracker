"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import type { Account, AccountBalance, AccountType } from "@/lib/types";

export default function AccountsManager({
  accounts,
  balances
}: {
  accounts: Account[];
  balances: AccountBalance[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [opening, setOpening] = useState("");
  const [busy, setBusy] = useState(false);

  const balanceById = Object.fromEntries(balances.map((b) => [b.account_id, b.balance]));

  async function add() {
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    await supabase.from("accounts").insert({
      user_id: uid,
      name,
      type,
      opening_balance: parseFloat(opening) || 0
    });
    setName("");
    setOpening("");
    setAdding(false);
    setBusy(false);
    router.refresh();
  }

  async function archive(id: string) {
    if (!confirm("Archive this account? Transactions stay.")) return;
    const supabase = createClient();
    await supabase.from("accounts").update({ archived: true }).eq("id", id);
    router.refresh();
  }

  async function rename(id: string, currentName: string) {
    const n = prompt("New name", currentName);
    if (!n || n === currentName) return;
    const supabase = createClient();
    await supabase.from("accounts").update({ name: n }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {accounts.filter((a) => !a.archived).map((a) => (
          <li key={a.id} className="card flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{a.name}</div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                {a.type}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm">
                {formatMoney(Number(balanceById[a.id] ?? a.opening_balance))}
              </div>
              <button
                className="text-xs text-neutral-500 underline"
                onClick={() => rename(a.id, a.name)}
              >
                rename
              </button>
              <button
                className="text-xs text-red-400/70 underline"
                onClick={() => archive(a.id)}
              >
                archive
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="card space-y-3">
          <input
            className="input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
          >
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="wallet">Wallet</option>
            <option value="savings">Savings</option>
          </select>
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Opening balance"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button
              className="btn-primary flex-1"
              onClick={add}
              disabled={busy || !name}
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost w-full" onClick={() => setAdding(true)}>
          + Add account
        </button>
      )}
    </div>
  );
}
