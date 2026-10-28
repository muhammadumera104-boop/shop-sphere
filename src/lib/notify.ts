import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof prisma;

/** In-app notification. SMS / email delivery is NOT configured; only the in-app inbox is used. */
export async function notify(
  userId: string,
  n: { kind?: "ORDER" | "OFFER" | "ACCOUNT"; title: string; body: string; link?: string },
  tx: Tx = prisma,
) {
  await tx.notification.create({ data: { userId, kind: n.kind ?? "ORDER", title: n.title, body: n.body, link: n.link } });
}

export const EXTERNAL_CHANNELS = {
  sms: { configured: false, label: "SMS gateway" },
  email: { configured: false, label: "Email provider" },
  whatsapp: { configured: false, label: "WhatsApp Business API" },
};
