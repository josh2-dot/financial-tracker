export type BucketSplit = { bucket_id: string; pct: number };

export type Bucket = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
};

export type AccountType = "bank" | "cash" | "wallet" | "savings";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  archived: boolean;
  sort_order: number;
  created_at: string;
};

export type AccountBalance = {
  account_id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
};

export type CategoryKind = "expense" | "income" | "transfer";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  default_bucket_id: string | null;
  kind: CategoryKind;
  created_at: string;
};

export type TransactionSource = "manual" | "sms" | "import" | "routine";

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  occurred_at: string;
  category_id: string | null;
  bucket_id: string | null;
  bucket_splits: BucketSplit[] | null;
  counterparty: string | null;
  note: string | null;
  source: TransactionSource;
  transfer_pair_id: string | null;
  created_at: string;
};

export type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  linked_account_id: string | null;
  bucket_id: string | null;
  color: string;
  archived: boolean;
  created_at: string;
};

export type SavingsGoalProgress = {
  goal_id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  linked_account_id: string | null;
  color: string;
  current_amount: number;
  pct: number;
};

export type SavingsContribution = {
  id: string;
  user_id: string;
  goal_id: string;
  transaction_id: string | null;
  amount: number;
  occurred_at: string;
  note: string | null;
  created_at: string;
};

export type RoutineFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export type RoutineSaving = {
  id: string;
  user_id: string;
  goal_id: string;
  source_account_id: string;
  amount: number;
  frequency: RoutineFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  next_run_date: string;
  active: boolean;
  auto_confirm: boolean;
  last_run_at: string | null;
  created_at: string;
};

export type MonthlyEssential = {
  id: string;
  user_id: string;
  label: string;
  amount: number;
  created_at: string;
};
