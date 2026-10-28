export const ROLES = ["BUYER", "ADMIN", "DELIVERY"] as const;
export type Role = (typeof ROLES)[number];

export const SHOP_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderActor = "BUYER" | "SELLER" | "DELIVERY" | "ADMIN";

/** Who may move an order from one status to another. Enforced in services/orders.ts. */
export const ORDER_TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, OrderActor[]>>> = {
  PENDING: { CONFIRMED: ["SELLER", "ADMIN"], CANCELLED: ["BUYER", "SELLER", "ADMIN"] },
  CONFIRMED: { PACKED: ["SELLER", "ADMIN"], CANCELLED: ["BUYER", "SELLER", "ADMIN"] },
  PACKED: { SHIPPED: ["SELLER", "ADMIN"], CANCELLED: ["SELLER", "ADMIN"] },
  SHIPPED: { DELIVERED: ["DELIVERY", "ADMIN"] },
  DELIVERED: { RETURNED: ["SELLER", "ADMIN"] },
  CANCELLED: {},
  RETURNED: {},
};

export function canTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): boolean {
  return ORDER_TRANSITIONS[from]?.[to]?.includes(actor) ?? false;
}

export const SHIPMENT_STATUSES = ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_NEXT: Record<ShipmentStatus, ShipmentStatus[]> = {
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  FAILED: ["OUT_FOR_DELIVERY"],
  DELIVERED: [],
};

export const LEDGER_TYPES = ["CREDIT", "PAYMENT"] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export const PARTY_TYPES = ["CUSTOMER", "SUPPLIER"] as const;

export const EXPENSE_CATEGORIES = ["RENT", "SALARIES", "TRANSPORT", "UTILITIES", "OTHER"] as const;

export const RETURN_REASONS = [
  "Damaged item",
  "Wrong item received",
  "Not as described",
  "Size or fit issue",
  "Changed my mind",
] as const;

export const RETURN_WINDOW_DAYS = 7;

export const DEFAULT_SETTINGS = {
  commissionPercent: "8",
  maxDiscountPercent: "50",
  deliveryStandard: "150",
  deliveryExpress: "300",
  freeDeliveryThreshold: "5000",
  codEnabled: "true",
  onlinePaymentEnabled: "false",
  platformName: "ShopSphere",
  supportEmail: "support@shopsphere.pk",
  campaignEligibilityMinRating: "4",
} as const;
export type SettingKey = keyof typeof DEFAULT_SETTINGS;

/** Gradient tiles used instead of product photos (matches design reference). */
export const GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-amber-300 to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-sky-400 to-indigo-500",
  "from-violet-500 to-fuchsia-500",
] as const;

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
