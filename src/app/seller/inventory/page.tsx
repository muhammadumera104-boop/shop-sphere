import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { adjustStockAction, bulkStockAction } from "@/app/actions/seller";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, EmptyState, KpiCard, PageTitle, Progress, Tabs, Table, td, th } from "@/components/ui";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string; bulk?: string }> }) {
  const user = await pageSeller("/seller/inventory");
  const { filter = "all", bulk } = await searchParams;
  const variants = await prisma.productVariant.findMany({
    where: { product: { shopId: user.shop.id, status: { not: "ARCHIVED" } } },
    include: { product: { select: { title: true, sku: true, lowStockThreshold: true } } },
    orderBy: [{ product: { title: "asc" } }, { name: "asc" }],
  });
  const rows = variants.map((v) => {
    const available = v.stockQuantity - v.reservedQuantity;
    return { ...v, available, low: available > 0 && available <= v.product.lowStockThreshold, out: available <= 0 };
  });
  const inStock = rows.reduce((s, r) => s + Math.max(0, r.available), 0);
  const low = rows.filter((r) => r.low).length;
  const out = rows.filter((r) => r.out).length;
  const shown = filter === "low" ? rows.filter((r) => r.low || r.out) : filter === "out" ? rows.filter((r) => r.out) : rows;
  const max = Math.max(1, ...rows.map((r) => r.stockQuantity));

  return (
    <>
      <PageTitle
        title="Inventory"
        sample
        action={
          <a href={bulk ? "/seller/inventory" : "/seller/inventory?bulk=1"} className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-medium inline-flex items-center">
            {bulk ? "Done" : "Bulk update"}
          </a>
        }
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="In stock (units)" value={inStock} tone="emerald" />
        <KpiCard label="Low stock" value={low} tone="rose" />
        <KpiCard label="Out of stock" value={out} tone="gold" />
      </div>
      <div className="mb-4">
        <Tabs
          active={filter}
          tabs={[
            { key: "all", label: "All", href: "/seller/inventory" },
            { key: "low", label: "Low & out", href: "/seller/inventory?filter=low" },
            { key: "out", label: "Out of stock", href: "/seller/inventory?filter=out" },
          ]}
        />
      </div>
      <Card>
        {shown.length === 0 ? (
          <EmptyState title="Nothing here" body="All your variants are well stocked." />
        ) : bulk ? (
          <ActionForm action={bulkStockAction} className="p-0" messageClassName="px-4 pb-4">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Reserved</th>
                  <th className={th}>Stock on hand</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>
                      {r.product.title}
                      {r.name !== "Default" && <span className="text-muted"> · {r.name}</span>}
                    </td>
                    <td className={td}>{r.reservedQuantity}</td>
                    <td className={td}>
                      <label className="sr-only" htmlFor={`b-${r.id}`}>
                        Stock for {r.product.title} {r.name}
                      </label>
                      <input id={`b-${r.id}`} name={`stock:${r.id}`} type="number" min={r.reservedQuantity} defaultValue={r.stockQuantity} className="input w-28" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="p-4">
              <SubmitButton>Save all</SubmitButton>
            </div>
          </ActionForm>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>SKU</th>
                <th className={th}>Available</th>
                <th className={th}>Reserved</th>
                <th className={th}>Low-stock at</th>
                <th className={th}>Quick adjust</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className={td}>
                    <span className="font-medium">{r.product.title}</span>
                    {r.name !== "Default" && <span className="text-muted"> · {r.name}</span>}
                    {r.out ? (
                      <Badge tone="rose" className="ml-2">
                        Out
                      </Badge>
                    ) : r.low ? (
                      <Badge tone="rose" className="ml-2">
                        Low
                      </Badge>
                    ) : null}
                  </td>
                  <td className={`${td} font-mono text-xs text-muted`}>{r.product.sku}</td>
                  <td className={`${td} min-w-36`}>
                    <div className="flex items-center gap-2">
                      <span className="w-8 font-medium">{r.available}</span>
                      <div className="flex-1">
                        <Progress value={r.available} max={max} tone={r.out || r.low ? "rose" : "emerald"} />
                      </div>
                    </div>
                  </td>
                  <td className={td}>{r.reservedQuantity}</td>
                  <td className={td}>{r.product.lowStockThreshold}</td>
                  <td className={td}>
                    <div className="flex gap-1">
                      <ActionButton action={adjustStockAction} fields={{ variantId: r.id, delta: "-1" }} variant="secondary">
                        <span aria-label="Decrease stock by 1">−1</span>
                      </ActionButton>
                      <ActionButton action={adjustStockAction} fields={{ variantId: r.id, delta: "1" }} variant="secondary">
                        <span aria-label="Increase stock by 1">+1</span>
                      </ActionButton>
                      <ActionButton action={adjustStockAction} fields={{ variantId: r.id, delta: "10" }} variant="secondary">
                        <span aria-label="Increase stock by 10">+10</span>
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
