import { prisma } from "../db";
import { khataSummary } from "./khata";

const SALE_STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(from.toISOString().slice(0, 10) + "T00:00:00Z");
  const end = new Date(to.toISOString().slice(0, 10) + "T00:00:00Z");
  while (d <= end && out.length < 400) {
    out.push(dayKey(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Seller report for a date range. Sales = goods value of non-cancelled orders (excluding delivery fees). */
export async function sellerReport(shopId: string, from: Date, to: Date) {
  const range = { gte: new Date(from.toISOString().slice(0, 10) + "T00:00:00Z"), lte: new Date(to.toISOString().slice(0, 10) + "T23:59:59Z") };
  const [orders, expenses, khata] = await Promise.all([
    prisma.order.findMany({
      where: { shopId, createdAt: range, status: { in: SALE_STATUSES } },
      include: { items: { include: { product: { include: { category: true } } } } },
    }),
    prisma.expense.findMany({ where: { shopId, date: range } }),
    khataSummary(shopId),
  ]);
  const sales = orders.reduce((s, o) => s + o.subtotal - o.discount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const days = daysBetween(range.gte, range.lte);
  const salesByDay = new Map(days.map((d) => [d, 0]));
  const expByDay = new Map(days.map((d) => [d, 0]));
  for (const o of orders) salesByDay.set(dayKey(o.createdAt), (salesByDay.get(dayKey(o.createdAt)) ?? 0) + o.subtotal - o.discount);
  for (const e of expenses) expByDay.set(dayKey(e.date), (expByDay.get(dayKey(e.date)) ?? 0) + e.amount);
  const byCategory = new Map<string, number>();
  const byProduct = new Map<string, { title: string; qty: number; revenue: number }>();
  for (const o of orders)
    for (const i of o.items) {
      byCategory.set(i.product.category.name, (byCategory.get(i.product.category.name) ?? 0) + 1);
      const p = byProduct.get(i.productId) ?? { title: i.titleSnapshot, qty: 0, revenue: 0 };
      p.qty += i.quantity;
      p.revenue += i.lineTotal;
      byProduct.set(i.productId, p);
    }
  return {
    sales,
    expenses: expenseTotal,
    receivables: khata.receivable,
    net: sales - expenseTotal,
    orderCount: orders.length,
    series: days.map((d) => ({ day: d, sales: salesByDay.get(d) ?? 0, expenses: expByDay.get(d) ?? 0 })),
    byCategory: [...byCategory.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  };
}
