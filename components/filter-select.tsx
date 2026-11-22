"use client";

import { useRouter } from "next/navigation";

/** URL-driven picker: the page stays a server component and every view is linkable. */
export function FilterSelect({ label, name, value, options, params }: {
  label: string; name: string; value: string; options: { value: string; label: string }[]; params: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams({ ...params, [name]: e.target.value });
          q.delete("cat");
          q.delete("dom");
          router.push(`/?${q}`);
        }}
        className="h-8 rounded-md border bg-background px-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
