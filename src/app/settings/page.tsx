import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EssentialsManager from "@/components/essentials-manager";
import type { MonthlyEssential } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: essentials } = await supabase
    .from("monthly_essentials")
    .select("*")
    .order("created_at");
  const { data: userData } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-medium">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm text-neutral-400">Monthly essentials</h2>
        <p className="text-xs text-neutral-500">
          Recurring must-pays (rent, data, food baseline). Their total is used
          for the runway calculation.
        </p>
        <EssentialsManager
          essentials={(essentials as MonthlyEssential[]) ?? []}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm text-neutral-400">Manage</h2>
        <div className="space-y-2">
          <Link href="/buckets" className="card flex justify-between">
            <span>Buckets</span>
            <span className="text-neutral-500">→</span>
          </Link>
          <Link href="/accounts" className="card flex justify-between">
            <span>Accounts</span>
            <span className="text-neutral-500">→</span>
          </Link>
        </div>
      </section>

      <section className="pt-4 text-xs text-neutral-500">
        Signed in as {userData.user?.email}
      </section>

      <SignOutButton />
    </div>
  );
}

function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button className="btn-danger w-full">Sign out</button>
    </form>
  );
}
