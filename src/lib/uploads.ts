// Image uploads: local disk (public/uploads) in development. S3-compatible storage is not configured yet;
// set UPLOAD_DRIVER=s3 only after implementing putObject below.
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { UPLOAD_MAX_BYTES, UPLOAD_TYPES } from "./constants";
import { UserError } from "./actions";

/** Validate by declared type AND magic bytes so renamed files are rejected. */
export function sniffImageType(buf: Uint8Array): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) return "image/webp";
  return null;
}

export async function saveUpload(file: File | null | undefined, folder: string): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > UPLOAD_MAX_BYTES) throw new UserError("Images must be 2 MB or smaller.");
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(buf);
  if (!type || !UPLOAD_TYPES[type]) throw new UserError("Only JPG, PNG or WebP images are allowed.");
  if ((process.env.UPLOAD_DRIVER ?? "local") !== "local") throw new UserError("Cloud storage is not configured.");
  const name = `${crypto.randomBytes(12).toString("hex")}.${UPLOAD_TYPES[type]}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder.replace(/[^a-z0-9-]/gi, ""));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return `/uploads/${path.basename(dir)}/${name}`;
}
