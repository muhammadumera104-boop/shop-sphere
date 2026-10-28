"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted">Sort by</span>
      <select
        className="input w-auto h-9 py-0"
        value={value}
        onChange={(e) => {
          const u = new URLSearchParams(params.toString());
          u.set("sort", e.target.value);
          u.delete("page");
          router.push(`${path}?${u.toString()}`);
        }}
      >
        <option value="relevance">Best match</option>
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="rating">Top rated</option>
      </select>
    </label>
  );
}
