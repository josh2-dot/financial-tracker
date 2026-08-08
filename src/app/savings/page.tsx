import { createClient } from "@/lib/supabase/server";
import SavingsManager from "@/components/savings-manager";
import type {
  Account,
  RoutineSaving,
  SavingsGoal,
  SavingsGoalProgress
} from "@/lib/types";

export default async function SavingsPage() {
  const supabase = createClient();

  const [
    { data: goals },
    { data: progress },
    { data: routines },
    { data: accounts }
  ] = await Promise.all([
    supabase.from("savings_goals").select("*").eq("archived", false),
    supabase.from("savings_goal_progress").select("*"),
    supabase.from("routine_savings").select("*").eq("active", true),
    supabase.from("accounts").select("*").eq("archived", false).order("sort_order")
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">Savings</h1>
      <SavingsManager
        goals={(goals as SavingsGoal[]) ?? []}
        progress={(progress as SavingsGoalProgress[]) ?? []}
        routines={(routines as RoutineSaving[]) ?? []}
        accounts={(accounts as Account[]) ?? []}
      />
    </div>
  );
}
