import { createClient } from "@/lib/supabase/server";
import BucketsManager from "@/components/buckets-manager";
import type { Bucket } from "@/lib/types";

export default async function BucketsPage() {
  const supabase = createClient();
  const { data: buckets } = await supabase
    .from("buckets")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">Buckets</h1>
      <p className="text-sm text-neutral-500">
        Tag transactions by bucket to filter and report on cashflow slices —
        e.g. Personal, Side project, Family, Client A. Rename or add whatever
        fits.
      </p>
      <BucketsManager buckets={(buckets as Bucket[]) ?? []} />
    </div>
  );
}
