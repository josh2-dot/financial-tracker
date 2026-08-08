"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home" },
  { href: "/transactions", label: "Txns" },
  { href: "/savings", label: "Savings" },
  { href: "/accounts", label: "Accounts" },
  { href: "/settings", label: "Settings" }
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        background: "var(--bg)",
        borderColor: "var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)"
      }}
    >
      <div className="mx-auto flex max-w-3xl">
        {items.map((it) => {
          const active =
            it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex-1 py-3 text-center text-xs",
                active ? "text-white" : "text-neutral-500"
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
