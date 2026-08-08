import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Bucket, Transaction, Account, Category } from "@/lib/types";

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: { bucket?: string; account?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("transactions")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (searchParams.bucket) query = query.eq("bucket_id", searchParams.bucket);
  if (searchParams.account) query = query.eq("account_id", searchParams.account);

  const [{ data: txns }, { data: buckets }, { data: accounts }, { data: categories }] =
    await Promise.all([
      query,
      supabase.from("buckets").select("*").order("sort_order"),
      supabase.from("accounts").select("*").eq("archived", false),
      supabase.from("categories").select("*")
    ]);

  const ts = (txns as Transaction[]) ?? [];
  const bks = (buckets as Bucket[]) ?? [];
  const accs = (accounts as Account[]) ?? [];
  const cats = (categories as Category[]) ?? [];

  const bucketById = Object.fromEntries(bks.map((b) => [b.id, b]));
  const accountById = Object.fromEntries(accs.map((a) => [a.id, a]));
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));

  // Group by day
  const groups: Record<string, Transaction[]> = {};
  for (const t of ts) {
    const day = t.occurred_at.slice(0, 10);
    (groups[day] ||= []).push(t);
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Transactions</h1>
        <Link href="/transactions/new" className="btn-primary">
          + New
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/transactions"
          className={`bucket-pill ${!searchParams.bucket && !searchParams.account ? "text-white" : ""}`}
        >
          All
        </Link>
        {bks.map((b) => (
          <Link
            key={b.id}
            href={`/transactions?bucket=${b.id}`}
            className={`bucket-pill ${searchParams.bucket === b.id ? "text-white" : ""}`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: b.color }}
            />
            {b.name}
          </Link>
        ))}
      </div>

      {Object.keys(groups).length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing yet.</p>
      ) : (
        Object.entries(groups).map(([day, list]) => (
          <section key={day}>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
              {formatDate(day)}
            </h3>
            <div className="card space-y-3 p-0">
              {list.map((t, i) => {
                const b = t.bucket_id ? bucketById[t.bucket_id] : null;
                const a = accountById[t.account_id];
                const c = t.category_id ? catById[t.category_id] : null;
                const amt = Number(t.amount);
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-3 ${i > 0 ? "border-t border-neutral-800" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">
                        {t.counterparty || t.note || c?.name || "Transaction"}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                        {a && <span>{a.name}</span>}
                        {c && <span>· {c.name}</span>}
                        {b && (
                          <span className="bucket-pill" style={{ padding: "0 6px" }}>
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ background: b.color }}
                            />
                            {b.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${amt < 0 ? "text-red-400" : "text-green-400"}`}
                    >
                      {formatMoney(amt)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
