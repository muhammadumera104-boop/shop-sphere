// Pure pricing rules. The server always recomputes totals with these functions;
// nothing here trusts amounts coming from the browser.

export type PriceSource = { price: number; salePrice: number | null };

export function effectivePrice(p: PriceSource): number {
  return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
}

export function discountPercent(p: PriceSource): number {
  const eff = effectivePrice(p);
  return eff < p.price ? Math.round(((p.price - eff) / p.price) * 100) : 0;
}

export type CouponRule = {
  code: string;
  shopId: string;
  type: string; // PERCENT | FIXED
  value: number;
  minSpend: number;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  productIds: string[]; // empty = whole shop
};

export type PricedLine = {
  shopId: string;
  productId: string;
  variantId: string;
  unitPrice: number;
  quantity: number;
};

export type CouponResult = { ok: true; discount: number } | { ok: false; error: string };

export function evaluateCoupon(coupon: CouponRule, lines: PricedLine[], now = new Date()): CouponResult {
  if (!coupon.isActive) return { ok: false, error: "This coupon is not active." };
  if (now < coupon.startsAt) return { ok: false, error: "This coupon has not started yet." };
  if (now > coupon.endsAt) return { ok: false, error: "This coupon has expired." };
  if (coupon.usedCount >= coupon.usageLimit) return { ok: false, error: "This coupon has reached its usage limit." };
  const eligible = lines.filter(
    (l) => l.shopId === coupon.shopId && (coupon.productIds.length === 0 || coupon.productIds.includes(l.productId)),
  );
  if (eligible.length === 0) return { ok: false, error: "No items in your cart are eligible for this coupon." };
  const base = eligible.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  if (base < coupon.minSpend) return { ok: false, error: `Minimum spend for this coupon is Rs. ${coupon.minSpend.toLocaleString("en-PK")}.` };
  const raw = coupon.type === "PERCENT" ? Math.floor((base * coupon.value) / 100) : coupon.value;
  return { ok: true, discount: Math.max(0, Math.min(raw, base)) };
}

export type DeliveryOption = "STANDARD" | "EXPRESS";
export type FeeConfig = { standard: number; express: number; freeThreshold: number };

export function deliveryFeeFor(subtotalAfterDiscount: number, option: DeliveryOption, fees: FeeConfig): number {
  if (option === "EXPRESS") return fees.express;
  return fees.freeThreshold > 0 && subtotalAfterDiscount >= fees.freeThreshold ? 0 : fees.standard;
}

export type ShopTotals = { shopId: string; subtotal: number; discount: number; deliveryFee: number; total: number };
export type Totals = {
  shops: ShopTotals[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponError?: string;
};

/** Totals for a whole cart, split per shop (one order per shop). */
export function computeTotals(
  lines: PricedLine[],
  opts: { coupon?: CouponRule | null; option: DeliveryOption; fees: FeeConfig; now?: Date },
): Totals {
  const shopIds = [...new Set(lines.map((l) => l.shopId))];
  let couponDiscount = 0;
  let couponError: string | undefined;
  if (opts.coupon) {
    const r = evaluateCoupon(opts.coupon, lines, opts.now);
    if (r.ok) couponDiscount = r.discount;
    else couponError = r.error;
  }
  const shops = shopIds.map((shopId) => {
    const subtotal = lines.filter((l) => l.shopId === shopId).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const discount = opts.coupon && opts.coupon.shopId === shopId ? couponDiscount : 0;
    const deliveryFee = deliveryFeeFor(subtotal - discount, opts.option, opts.fees);
    return { shopId, subtotal, discount, deliveryFee, total: subtotal - discount + deliveryFee };
  });
  const sum = (k: keyof Omit<ShopTotals, "shopId">) => shops.reduce((s, x) => s + x[k], 0);
  return {
    shops,
    subtotal: sum("subtotal"),
    discount: sum("discount"),
    deliveryFee: sum("deliveryFee"),
    total: sum("total"),
    couponError,
  };
}
