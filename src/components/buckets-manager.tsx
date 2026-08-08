"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Bucket } from "@/lib/types";

const PRESET_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#eab308"
];

export default function BucketsManager({ buckets }: { buckets: Bucket[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    await supabase.from("buckets").insert({
      user_id: uid,
      name: name.trim(),
      color,
      sort_order: buckets.length
    });
    setName("");
    setBusy(false);
    router.refresh();
  }

  async function rename(b: Bucket) {
    const n = prompt("New name", b.name);
    if (!n || n === b.name) return;
    const supabase = createClient();
    await supabase.from("buckets").update({ name: n }).eq("id", b.id);
    router.refresh();
  }

  async function changeColor(b: Bucket, c: string) {
    const supabase = createClient();
    await supabase.from("buckets").update({ color: c }).eq("id", b.id);
    router.refresh();
  }

  async function makeDefault(b: Bucket) {
    const supabase = createClient();
    // Clear all defaults, then set this one
    await supabase
      .from("buckets")
      .update({ is_default: false })
      .eq("user_id", b.user_id);
    await supabase.from("buckets").update({ is_default: true }).eq("id", b.id);
    router.refresh();
  }

  async function remove(b: Bucket) {
    if (
      !confirm(
        `Delete "${b.name}"? Transactions tagged with it will lose the bucket tag.`
      )
    )
      return;
    const supabase = createClient();
    await supabase.from("buckets").delete().eq("id", b.id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {buckets.map((b) => (
          <li key={b.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="text-sm font-medium">{b.name}</span>
                {b.is_default && (
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-neutral-400">
                    default
                  </span>
                )}
              </div>
              <div className="flex gap-3 text-xs">
                <button
                  className="text-neutral-500 underline"
                  onClick={() => rename(b)}
                >
                  rename
                </button>
                {!b.is_default && (
                  <button
                    className="text-neutral-500 underline"
                    onClick={() => makeDefault(b)}
                  >
                    default
                  </button>
                )}
                <button
                  className="text-red-400/70 underline"
                  onClick={() => remove(b)}
                >
                  delete
                </button>
              </div>
            </div>
            <div className="mt-2 flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => changeColor(b, c)}
                  className={`h-5 w-5 rounded-full border-2 ${b.color === c ? "border-white" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={`Set color ${c}`}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="card space-y-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Add bucket
        </div>
        <input
          className="input"
          placeholder="e.g. Side project, Client A, Family"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
              style={{ background: c }}
              aria-label={`Pick color ${c}`}
              type="button"
            />
          ))}
        </div>
        <button
          className="btn-primary w-full"
          onClick={add}
          disabled={busy || !name.trim()}
        >
          Add bucket
        </button>
      </div>
    </div>
  );
}
