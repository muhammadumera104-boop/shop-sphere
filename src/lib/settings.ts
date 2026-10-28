import { prisma } from "./db";
import { DEFAULT_SETTINGS, type SettingKey } from "./constants";
import type { FeeConfig } from "./pricing";

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.platformSetting.findMany();
  const out: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) out[r.key] = r.value;
  return out as Record<SettingKey, string>;
}

export async function getFeeConfig(): Promise<FeeConfig> {
  const s = await getSettings();
  return {
    standard: Number(s.deliveryStandard) || 0,
    express: Number(s.deliveryExpress) || 0,
    freeThreshold: Number(s.freeDeliveryThreshold) || 0,
  };
}
