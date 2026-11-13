import Link from "next/link";
import { prisma } from "@/lib/db";
import { Listing, parseSearch, type RawParams } from "@/components/Listing";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const p = parseSearch(raw);
  const related = p.q
    ? await prisma.category.findMany({ where: { isActive: true, OR: p.q.split(/\s+/).map((w) => ({ name: { contains: w, mode: "insensitive" } })) }, take: 5 })
    : await prisma.category.findMany({ where: { isActive: true, parentId: null }, take: 6, orderBy: { sortOrder: "asc" } });
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {related.length > 0 && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-none">
          <span className="text-xs text-muted whitespace-nowrap">{p.q ? "Related:" : "Browse:"}</span>
          {related.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="h-8 px-3 rounded-full bg-violet-50 text-violet-700 text-xs font-medium inline-flex items-center whitespace-nowrap">
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <Listing base="/search" raw={raw} params={p} title={p.q ? <>Results for &ldquo;{p.q}&rdquo;</> : "All products"} />
    </div>
  );
}
