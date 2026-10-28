import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Listing, parseSearch, type RawParams } from "@/components/Listing";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await prisma.category.findUnique({ where: { slug } });
  return { title: c?.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> }) {
  const { slug } = await params;
  const raw = await searchParams;
  const category = await prisma.category.findUnique({ where: { slug }, include: { parent: true, children: { where: { isActive: true } } } });
  if (!category || !category.isActive) notFound();
  const p = parseSearch(raw);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-indigo-600">
          Home
        </Link>
        {category.parent && (
          <>
            {" > "}
            <Link href={`/category/${category.parent.slug}`} className="hover:text-indigo-600">
              {category.parent.name}
            </Link>
          </>
        )}
        {" > "}
        <span className="text-ink" aria-current="page">
          {category.name}
        </span>
      </nav>
      {category.children.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
          {category.children.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="h-8 px-4 rounded-full bg-white border border-line text-xs font-medium inline-flex items-center">
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <Listing base={`/category/${slug}`} raw={raw} params={{ ...p, categorySlug: slug }} title={category.name} fixedCategory={slug} />
    </div>
  );
}
