import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pageUser } from "@/lib/auth";
import { formatRs } from "@/lib/format";
import { loadShipment } from "@/lib/services/delivery";
import { confirmDeliveryAction } from "@/app/actions/delivery";
import { ActionForm, SubmitButton } from "@/components/forms";
import { CheckIcon, UploadIcon } from "@/components/icons";

export const metadata = { title: "Confirm delivery" };

export default async function ConfirmPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await pageUser("/delivery", ["DELIVERY"]);
  const { number } = await params;
  const s = await loadShipment(user.id, number);
  if (!s) notFound();
  if (s.status !== "OUT_FOR_DELIVERY") redirect(`/delivery/${number}`);
  return (
    <div className="p-4">
      <Link href={`/delivery/${number}`} className="text-sm text-muted">
        ← Order #{number}
      </Link>
      <div className="text-center mt-6 mb-6">
        <span className="mx-auto size-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <CheckIcon className="size-10" />
        </span>
        <h1 className="text-2xl font-bold mt-4">Confirm delivery</h1>
        <p className="text-sm text-muted">
          Order #{number} · {s.order.addressName}
        </p>
      </div>
      <ActionForm action={confirmDeliveryAction} className="space-y-4">
        <input type="hidden" name="shipmentId" value={s.id} />
        <div className="space-y-1.5">
          <label htmlFor="code" className="text-sm font-medium">
            Enter customer code
          </label>
          <input id="code" name="code" inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="one-time-code" className="input h-14 text-center text-2xl tracking-[0.5em] font-bold" placeholder="••••" />
          <p className="text-xs text-muted">The buyer sees this 4-digit code on their order page.</p>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <span className="text-sm text-muted">Cash to collect</span>
          <span className="text-2xl font-extrabold">{formatRs(s.order.total)}</span>
        </div>
        <label className="flex items-center gap-3 card p-4 text-sm font-medium">
          <input type="checkbox" name="cashCollected" required className="accent-emerald-600 size-5" />I collected {formatRs(s.order.total)} in cash
        </label>
        <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-white p-5 text-sm text-muted text-center cursor-pointer">
          <UploadIcon className="size-6 text-emerald-600" />
          Delivery photo (optional)
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="environment" className="text-xs max-w-full" />
        </label>
        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} className="input" placeholder="e.g. Handed to the guard" />
        </div>
        <SubmitButton variant="emerald" size="lg" className="w-full" pendingText="Confirming…">
          Confirm delivered
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
