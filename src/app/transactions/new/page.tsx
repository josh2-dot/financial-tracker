import { createClient } from "@/lib/supabase/server";
import TransactionForm from "@/components/transaction-form";
import type { Account, Bucket, Category } from "@/lib/types";

export default async function NewTransactionPage() {
  const supabase = createClient();
  const [{ data: accounts }, { data: buckets }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").eq("archived", false).order("sort_order"),
    supabase.from("buckets").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("name")
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">New transaction</h1>
      <TransactionForm
        accounts={(accounts as Account[]) ?? []}
        buckets={(buckets as Bucket[]) ?? []}
        categories={(categories as Category[]) ?? []}
      />
    </div>
  );
}
