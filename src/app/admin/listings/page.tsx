import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDate, formatRs } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import { listingDecisionAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/forms";
import { Badge, Card, EmptyState, PageTitle, ProductTile, StatusPill, Tabs } from "@/components/ui";

export const metadata = { title: "Listing moderation" };

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab = "reported", q } = await searchParams;
  const search: Prisma.ProductWhereInput = q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { shop: { name: { contains: q, mode: "insensitive" } } }] } : {};
  const where: Prisma.ProductWhereInput =
    tab === "removed"
      ? { moderation: "REMOVED", ...search }
      : tab === "new"
        ? { moderation: "OK", createdAt: { gte: new Date(Date.now() - 14 * 86400_000) }, status: { not: "ARCHIVED" }, ...search }
        : { moderation: "OK", reports: { some: { status: "OPEN" } }, ...search };
  const [products, reportedCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { shop: { select: { name: true, status: true } }, reports: { where: tab === "reported" ? { status: "OPEN" } : {}, orderBy: { createdAt: "desc" } }, images: { take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.product.count({ where: { moderation: "OK", reports: { some: { status: "OPEN" } } } }),
  ]);
  return (
    <>
      <PageTitle title="Listing moderation" />
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-5">
        <Tabs
          active={tab}
          tabs={[
            { key: "reported", label: `Reported ${reportedCount}`, href: "/admin/listings" },
            { key: "new", label: "New listings", href: "/admin/listings?tab=new" },
            { key: "removed", label: "Removed", href: "/admin/listings?tab=removed" },
          ]}
        />
        <form className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <label htmlFor="lq" className="sr-only">
            Search listings
          </label>
          <input id="lq" name="q" defaultValue={q} placeholder="Search title or shop" className="input w-64" />
          <button className="h-10 px-4 rounded-full bg-navy text-white text-sm">Search</button>
        </form>
      </div>
      {products.length === 0 ? (
        <Card>
          <EmptyState icon="✓" title="Nothing to review" />
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col md:flex-row gap-4 md:items-center">
              <ProductTile gradient={p.gradient} imageUrl={p.images[0]?.url} label={p.title} className="size-16 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <Link href={`/product/${p.slug}`} className="font-semibold hover:text-indigo-600" target="_blank">
                  {p.title}
                </Link>
                <p className="text-sm text-muted">
                  {p.shop.name} · {formatRs(effectivePrice(p))} · listed {formatDate(p.createdAt)} · <StatusPill status={p.status} />
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.reports.slice(0, 4).map((r) => (
                    <Badge key={r.id} tone={r.status === "OPEN" ? "rose" : "gray"}>
                      {r.reason}
                    </Badge>
                  ))}
                  {p.reports.length > 4 && <Badge>+{p.reports.length - 4}</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tab === "removed" ? (
                  <ActionButton action={listingDecisionAction} fields={{ productId: p.id, decision: "restore" }} variant="secondary">
                    Restore
                  </ActionButton>
                ) : (
                  <>
                    {tab === "reported" && (
                      <ActionButton action={listingDecisionAction} fields={{ productId: p.id, decision: "keep" }} variant="emerald">
                        Keep
                      </ActionButton>
                    )}
                    <ActionButton action={listingDecisionAction} fields={{ productId: p.id, decision: "remove", reason: p.reports[0]?.reason ?? "Policy violation" }} variant="dangerSolid" confirm="Remove this listing from the marketplace?">
                      Remove
                    </ActionButton>
                    <ActionButton action={listingDecisionAction} fields={{ productId: p.id, decision: "warn", reason: p.reports[0]?.reason ?? "Please review your listing" }} variant="secondary">
                      Warn seller
                    </ActionButton>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
