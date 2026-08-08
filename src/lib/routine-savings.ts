import type { RoutineFrequency } from "./types";

/**
 * Given a run date and a frequency, compute the next run date.
 * - daily: +1 day
 * - weekly: +7 days
 * - biweekly: +14 days
 * - monthly: +1 calendar month (day-of-month preserved when possible;
 *   clamped to last day when it doesn't exist, e.g. Jan 31 -> Feb 28)
 */
export function advanceRunDate(currentISO: string, frequency: RoutineFrequency): string {
  const d = new Date(currentISO + "T00:00:00");
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly": {
      const targetDay = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      const lastDayOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(targetDay, lastDayOfNextMonth));
      break;
    }
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Catch up a routine to today: if next_run_date is in the past,
 * advance it repeatedly until it's today or in the future.
 * Returns the number of missed runs (caller can decide whether to
 * generate contributions for each, or just skip forward).
 */
export function catchUpRuns(nextRunISO: string, frequency: RoutineFrequency): {
  missed: number;
  newNextRunISO: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);

  let missed = 0;
  let cursor = nextRunISO;
  while (cursor <= todayISO) {
    missed += 1;
    cursor = advanceRunDate(cursor, frequency);
    if (missed > 365) break; // safety
  }
  return { missed, newNextRunISO: cursor };
}
