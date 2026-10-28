import { pageSeller } from "@/lib/auth";
import { ProductForm } from "../ProductForm";
import { categoryOptions } from "../categories";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  await pageSeller("/seller/products/new");
  return (
    <ProductForm
      categories={await categoryOptions()}
      initial={{ title: "", categoryId: "", brand: "", condition: "NEW", description: "", price: "", salePrice: "", sku: "", status: "ACTIVE", lowStockThreshold: 5, gradient: 0, featured: false, variants: [], specs: [], images: [] }}
    />
  );
}
