import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { parseJson } from "@/lib/format";
import { ProductForm } from "../ProductForm";
import { categoryOptions } from "../categories";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await pageSeller("/seller/products");
  const { id } = await params;
  const { saved } = await searchParams;
  const p = await prisma.product.findUnique({ where: { id }, include: { variants: { orderBy: { id: "asc" } }, images: { orderBy: { sortOrder: "asc" } } } });
  // Ownership: a seller can only open their own products.
  if (!p || p.shopId !== user.shop.id) notFound();
  return (
    <>
      {saved && (
        <div role="status" className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm flex flex-wrap gap-3 justify-between">
          <span>Product saved.</span>
          <Link href={`/product/${p.slug}`} className="underline font-medium">
            View product page
          </Link>
        </div>
      )}
      <ProductForm
        key={p.updatedAt.toISOString()}
        categories={await categoryOptions()}
        initial={{
          id: p.id,
          title: p.title,
          categoryId: p.categoryId,
          brand: p.brand,
          condition: p.condition,
          description: p.description,
          price: p.price,
          salePrice: p.salePrice ?? "",
          sku: p.sku,
          status: p.status,
          lowStockThreshold: p.lowStockThreshold,
          gradient: p.gradient,
          featured: p.featured,
          variants: p.variants.map((v) => ({ id: v.id, name: v.name, stock: v.stockQuantity, reserved: v.reservedQuantity })),
          specs: parseJson(p.specs, []),
          images: p.images.map((i) => ({ id: i.id, url: i.url })),
          moderation: p.moderation,
        }}
      />
    </>
  );
}
