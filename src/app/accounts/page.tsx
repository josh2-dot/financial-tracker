import { createClient } from "@/lib/supabase/server";
import AccountsManager from "@/components/accounts-manager";
import type { Account, AccountBalance } from "@/lib/types";

export default async function AccountsPage() {
  const supabase = createClient();
  const [{ data: accounts }, { data: balances }] = await Promise.all([
    supabase.from("accounts").select("*").order("sort_order"),
    supabase.from("account_balances").select("*")
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">Accounts</h1>
      <AccountsManager
        accounts={(accounts as Account[]) ?? []}
        balances={(balances as AccountBalance[]) ?? []}
      />
    </div>
  );
}
