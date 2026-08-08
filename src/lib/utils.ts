export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(amount: number, currency = "NGN") {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(abs);
  const sign = amount < 0 ? "-" : "";
  const symbol = currency === "NGN" ? "\u20A6" : currency + " ";
  return `${sign}${symbol}${formatted}`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function startOfMonthISO(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toISOString();
}
