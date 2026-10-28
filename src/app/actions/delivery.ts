"use server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { actionError, formObject, type ActionState } from "@/lib/actions";
import { saveUpload } from "@/lib/uploads";
import { confirmDelivery, updateShipment } from "@/lib/services/delivery";
import { deliveryConfirmSchema, shipmentUpdateSchema } from "@/lib/validation";

export async function shipmentStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireRole(["DELIVERY"]);
    const input = shipmentUpdateSchema.parse(formObject(fd));
    await updateShipment(user, input.shipmentId, input.status, input.note);
    return { ok: true, message: "Status updated." };
  } catch (e) {
    return actionError(e);
  }
}

export async function confirmDeliveryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireRole(["DELIVERY"]);
    const input = deliveryConfirmSchema.parse(formObject(fd));
    const photoUrl = await saveUpload(fd.get("photo") as File | null, "deliveries");
    await confirmDelivery(user, { ...input, photoUrl });
  } catch (e) {
    return actionError(e);
  }
  redirect("/delivery?done=1");
}
