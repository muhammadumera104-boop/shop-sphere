// Zod schemas for every server input.
import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  LEDGER_TYPES,
  ORDER_STATUSES,
  PARTY_TYPES,
  PRODUCT_STATUSES,
  RETURN_REASONS,
  SHIPMENT_STATUSES,
} from "./constants";

const id = z.string().min(1).max(64);
const money = z.coerce.number().int("Use whole rupees.").min(0).max(10_000_000);
const posMoney = z.coerce.number().int("Use whole rupees.").min(1, "Amount must be at least Rs. 1.").max(10_000_000);
const text = (max: number) => z.string().trim().max(max);
const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{7,16}$/, "Enter a valid phone number.");
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .transform((s) => new Date(`${s}T12:00:00`));

export const registerSchema = z.object({
  name: text(80).min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password.").max(100),
  next: z.string().optional(),
});

export const profileSchema = z.object({
  name: text(80).min(2, "Enter your full name."),
  phone: z.union([phone, z.literal("")]).optional(),
});

export const passwordSchema = z.object({
  current: z.string().min(1, "Enter your current password."),
  password: z.string().min(8, "New password must be at least 8 characters.").max(100),
});

export const addressSchema = z.object({
  id: id.optional(),
  label: text(20).min(1).default("Home"),
  fullName: text(80).min(2, "Enter the recipient's name."),
  phone,
  line1: text(200).min(5, "Enter the full street address."),
  city: text(60).min(2, "Enter the city."),
  province: text(60).optional().default(""),
  isDefault: checkbox,
});

export const cartAddSchema = z.object({
  variantId: id,
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export const cartUpdateSchema = z.object({
  itemId: id,
  quantity: z.coerce.number().int().min(0).max(20),
});

export const couponApplySchema = z.object({ code: text(30).min(2, "Enter a coupon code.").toUpperCase() });

export const checkoutSchema = z.object({
  addressId: id,
  deliveryOption: z.enum(["STANDARD", "EXPRESS"]),
  paymentMethod: z.literal("COD", { errorMap: () => ({ message: "Only Cash on Delivery is available." }) }),
});

export const shopSchema = z.object({
  name: text(60).min(3, "Shop name must be at least 3 characters."),
  description: text(500).optional().default(""),
  city: text(60).min(2, "Enter your city."),
  phone,
  pickupAddress: text(200).min(5, "Enter a pickup address."),
  cnic: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{7}-?\d$/, "Enter a valid CNIC (13 digits).")
    .optional(),
});

export const shopSettingsSchema = shopSchema.omit({ cnic: true }).extend({
  returnPolicy: text(1000).optional().default(""),
  shippingPolicy: text(1000).optional().default(""),
});

export const variantInput = z.object({
  id: id.optional(),
  name: text(40).min(1, "Variant name is required."),
  stockQuantity: z.coerce.number().int().min(0, "Stock cannot be negative.").max(100000),
});

export const productSchema = z
  .object({
    title: text(120).min(3, "Title must be at least 3 characters."),
    categoryId: id,
    brand: text(60).optional().default(""),
    condition: z.enum(["NEW", "USED", "REFURBISHED"]).default("NEW"),
    description: text(5000).optional().default(""),
    price: posMoney,
    salePrice: z.union([z.literal(""), money]).optional().transform((v) => (v === "" || v === undefined || v === 0 ? null : v)),
    sku: text(40).min(2, "SKU is required.").regex(/^[A-Za-z0-9-_]+$/, "SKU may use letters, numbers, - and _."),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]),
    lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(5),
    gradient: z.coerce.number().int().min(0).max(5).default(0),
    featured: checkbox,
    variants: z.array(variantInput).min(1, "Add at least one variant.").max(20),
    specs: z.array(z.object({ key: text(40).min(1), value: text(120).min(1) })).max(20).default([]),
  })
  .refine((p) => p.salePrice == null || p.salePrice < p.price, {
    message: "Sale price must be lower than the price.",
    path: ["salePrice"],
  });

export const productStatusSchema = z.object({ productId: id, status: z.enum(PRODUCT_STATUSES) });

export const stockAdjustSchema = z.object({
  variantId: id,
  delta: z.coerce.number().int().min(-100000).max(100000),
});

export const bulkStockSchema = z.object({
  rows: z.array(z.object({ variantId: id, stockQuantity: z.coerce.number().int().min(0).max(100000) })).max(500),
});

export const orderStatusSchema = z.object({
  orderId: id,
  status: z.enum(ORDER_STATUSES),
  note: text(200).optional().default(""),
});

export const couponSchema = z
  .object({
    code: text(20)
      .min(3, "Code must be at least 3 characters.")
      .regex(/^[A-Za-z0-9]+$/, "Use letters and numbers only.")
      .toUpperCase(),
    type: z.enum(["PERCENT", "FIXED"]),
    value: posMoney,
    startsAt: dateStr,
    endsAt: dateStr,
    usageLimit: z.coerce.number().int().min(1).max(100000),
    minSpend: money.default(0),
    productIds: z.array(id).max(100).default([]),
  })
  .refine((c) => c.endsAt >= c.startsAt, { message: "End date must be after start date.", path: ["endsAt"] })
  .refine((c) => c.type !== "PERCENT" || c.value <= 100, { message: "Percentage cannot exceed 100.", path: ["value"] });

export const shipmentUpdateSchema = z.object({
  shipmentId: id,
  status: z.enum(SHIPMENT_STATUSES),
  note: text(300).optional().default(""),
});

export const deliveryConfirmSchema = z.object({
  shipmentId: id,
  code: z.string().trim().regex(/^\d{4}$/, "Enter the 4-digit customer code."),
  cashCollected: checkbox,
  notes: text(300).optional().default(""),
});

export const partySchema = z.object({
  id: id.optional(),
  type: z.enum(PARTY_TYPES),
  name: text(80).min(2, "Enter a name."),
  phone: z.union([phone, z.literal("")]).optional().default(""),
  notes: text(300).optional().default(""),
  reminderConsent: checkbox,
});

export const ledgerEntrySchema = z.object({
  partyId: id,
  type: z.enum(LEDGER_TYPES),
  amount: posMoney,
  date: dateStr,
  note: text(200).optional().default(""),
});

export const ledgerEditSchema = z.object({
  entryId: id,
  amount: posMoney,
  date: dateStr,
  note: text(200).optional().default(""),
});

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: posMoney,
  date: dateStr,
  note: text(200).optional().default(""),
});

export const dateRangeSchema = z.object({
  from: dateStr.optional(),
  to: dateStr.optional(),
});

export const reviewSchema = z.object({
  orderItemId: id,
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  comment: text(1000).min(5, "Write at least a few words."),
});

export const returnSchema = z.object({
  orderItemId: id,
  reason: z.enum(RETURN_REASONS),
  description: text(1000).optional().default(""),
});

export const ticketSchema = z.object({
  orderId: id,
  issue: text(80).min(3, "Describe the issue."),
  message: text(1000).min(5, "Add a short message."),
});

export const reportListingSchema = z.object({ productId: id, reason: text(120).min(3, "Choose a reason.") });

export const categorySchema = z.object({
  id: id.optional(),
  name: text(60).min(2, "Enter a name."),
  slug: text(60)
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug may use lowercase letters, numbers and -."),
  parentId: z.union([id, z.literal("")]).optional().transform((v) => v || null),
  isActive: checkbox,
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const campaignSchema = z
  .object({
    name: text(80).min(3, "Enter a campaign name."),
    description: text(300).optional().default(""),
    startsAt: dateStr,
    endsAt: dateStr,
    maxDiscount: z.coerce.number().int().min(1).max(90),
    isFlashSale: checkbox,
  })
  .refine((c) => c.endsAt >= c.startsAt, { message: "End date must be after start date.", path: ["endsAt"] });

export const settingsSchema = z.object({
  commissionPercent: z.coerce.number().min(0).max(50),
  maxDiscountPercent: z.coerce.number().int().min(1).max(90),
  deliveryStandard: money,
  deliveryExpress: money,
  freeDeliveryThreshold: money,
  codEnabled: checkbox,
  platformName: text(40).min(2),
  supportEmail: z.string().email(),
  campaignEligibilityMinRating: z.coerce.number().min(0).max(5),
});

export const searchSchema = z.object({
  q: text(100).optional(),
  category: text(60).optional(),
  min: z.coerce.number().int().min(0).optional().catch(undefined),
  max: z.coerce.number().int().min(0).optional().catch(undefined),
  rating: z.coerce.number().min(0).max(5).optional().catch(undefined),
  brand: z.union([z.string(), z.array(z.string())]).optional(),
  inStock: z.string().optional(),
  onSale: z.string().optional(),
  freeDelivery: z.string().optional(),
  discount: z.coerce.number().int().min(0).max(90).optional().catch(undefined),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "rating"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});
