"use client";
import { useSearchParams, usePathname } from "next/navigation";
import { SearchIcon } from "./icons";

/** Search box that keeps the current query visible on the results page. */
export function HeaderSearch({ mobile }: { mobile?: boolean }) {
  const params = useSearchParams();
  const path = usePathname();
  const q = path === "/search" ? (params.get("q") ?? "") : "";
  const id = mobile ? "header-search-m" : "header-search";
  return (
    <form action="/search" role="search" className={mobile ? "md:hidden px-4 pb-3" : "hidden md:flex flex-1 max-w-2xl"}>
      <label htmlFor={id} className="sr-only">
        Search products, shops, brands
      </label>
      <div className="relative w-full">
        <SearchIcon className="size-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          key={q}
          id={id}
          name="q"
          defaultValue={q}
          placeholder="Search products, shops, brands..."
          className="w-full h-11 rounded-full bg-page border border-line pl-11 pr-24 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
        />
        <button className="absolute right-1.5 top-1.5 h-8 px-4 rounded-full bg-indigo-600 text-white text-xs font-medium">Search</button>
      </div>
    </form>
  );
}
