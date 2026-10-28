import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { formatRs } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import { duplicateProductAction, productStatusAction } from "@/app/actions/seller";
import { ActionButton } from "@/components/forms";
import { Card, EmptyState, LinkButton, PageTitle, Pagination, ProductTile, StatusPill, Table, td, th } from "@/components/ui";

export const metadata = { title: "Products" };
const PER = 10;

export default async function SellerProducts({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }> }) {
  const user = await pageSeller("/seller/products");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    shopId: user.shop.id,
    ...(sp.q ? { OR: [{ title: { contains: sp.q } }, { sku: { contains: sp.q } }] } : {}),
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(sp.status === "OUT_OF_STOCK" ? {} : sp.status ? { status: sp.status } : { status: { not: "ARCHIVED" } }),
  };
  const [all, categories, total] = await Promise.all([
    prisma.product.findMany({ where, include: { variants: true, images: { take: 1 }, category: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.count({ where: { shopId: user.shop.id, status: { not: "ARCHIVED" } } }),
  ]);
  const withStock = all.map((p) => ({ ...p, stock: p.variants.reduce((s, v) => s + v.stockQuantity - v.reservedQuantity, 0) }));
  const rows = sp.status === "OUT_OF_STOCK" ? withStock.filter((p) => p.stock <= 0) : withStock;
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const shown = rows.slice((page - 1) * PER, page * PER);
  const qs = (n: number) => `/seller/products?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.category ? { category: sp.category } : {}), ...(sp.status ? { status: sp.status } : {}), page: String(n) })}`;

  return (
    <>
      <PageTitle title={`Products (${total})`} sample action={<LinkButton href="/seller/products/new">+ Add product</LinkButton>} />
      <Card>
        <form className="p-4 flex flex-wrap gap-3 border-b border-line">
          <label htmlFor="pq" className="sr-only">
            Search products
          </label>
          <input id="pq" name="q" defaultValue={sp.q} placeholder="Search by name or SKU" className="input max-w-xs" />
          <select name="category" defaultValue={sp.category ?? ""} className="input w-auto" aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className="input w-auto" aria-label="Status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="DRAFT">Draft</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button className="h-10 px-5 rounded-full bg-navy text-white text-sm">Filter</button>
        </form>
        {shown.length === 0 ? (
          <EmptyState icon="▢" title="No products found" body="Add a product or change the filters." action={<LinkButton href="/seller/products/new">+ Add product</LinkButton>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>
                  <span className="sr-only">Image</span>
                </th>
                <th className={th}>Name</th>
                <th className={th}>SKU</th>
                <th className={th}>Price</th>
                <th className={th}>Stock</th>
                <th className={th}>Status</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td className={td}>
                    <ProductTile gradient={p.gradient} imageUrl={p.images[0]?.url} label={p.title} className="size-11 rounded-lg" />
                  </td>
                  <td className={td}>
                    <Link href={`/seller/products/${p.id}`} className="font-medium hover:text-indigo-600">
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted">{p.category.name}</p>
                  </td>
                  <td className={`${td} text-muted font-mono text-xs`}>{p.sku}</td>
                  <td className={td}>
                    {formatRs(effectivePrice(p))}
                    {p.salePrice && <span className="block text-xs text-muted line-through">{formatRs(p.price)}</span>}
                  </td>
                  <td className={td}>{p.stock}</td>
                  <td className={td}>
                    <div className="flex flex-col gap-1 items-start">
                      {p.moderation === "REMOVED" ? <StatusPill status="REMOVED" label="Removed by admin" /> : p.stock <= 0 && p.status === "ACTIVE" ? <StatusPill status="OUT_OF_STOCK" label="Out of stock" /> : <StatusPill status={p.status} />}
                    </div>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1.5">
                      <Link href={`/seller/products/${p.id}`} className="h-8 px-3 rounded-full border border-line text-xs inline-flex items-center hover:bg-gray-50">
                        Edit
                      </Link>
                      <ActionButton action={duplicateProductAction} fields={{ productId: p.id }} variant="secondary">
                        Duplicate
                      </ActionButton>
                      {p.status === "ACTIVE" ? (
                        <ActionButton action={productStatusAction} fields={{ productId: p.id, status: "PAUSED" }} variant="secondary">
                          Pause
                        </ActionButton>
                      ) : p.status !== "ARCHIVED" && p.moderation !== "REMOVED" ? (
                        <ActionButton action={productStatusAction} fields={{ productId: p.id, status: "ACTIVE" }} variant="secondary">
                          Activate
                        </ActionButton>
                      ) : null}
                      {p.status !== "ARCHIVED" ? (
                        <ActionButton action={productStatusAction} fields={{ productId: p.id, status: "ARCHIVED" }} variant="danger" confirm="Archive this product? It will be hidden from buyers.">
                          Archive
                        </ActionButton>
                      ) : (
                        <ActionButton action={productStatusAction} fields={{ productId: p.id, status: "DRAFT" }} variant="secondary">
                          Restore
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Pagination page={page} pages={pages} href={qs} />
    </>
  );
}
