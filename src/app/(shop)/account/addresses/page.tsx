import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { deleteAddressAction, saveAddressAction } from "@/app/actions/shop";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, EmptyState, Field, LinkButton, PageTitle } from "@/components/ui";

export const metadata = { title: "My addresses" };

type A = { id?: string; label?: string; fullName?: string; phone?: string; line1?: string; city?: string; province?: string; isDefault?: boolean };

function AddressFields({ a = {} }: { a?: A }) {
  const k = a.id ?? "new";
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {a.id && <input type="hidden" name="id" value={a.id} />}
      <Field label="Label" htmlFor={`label-${k}`}>
        <select id={`label-${k}`} name="label" defaultValue={a.label ?? "Home"} className="input">
          <option>Home</option>
          <option>Work</option>
          <option>Other</option>
        </select>
      </Field>
      <Field label="Full name" htmlFor={`fn-${k}`}>
        <input id={`fn-${k}`} name="fullName" defaultValue={a.fullName} required className="input" autoComplete="name" />
      </Field>
      <Field label="Phone" htmlFor={`ph-${k}`}>
        <input id={`ph-${k}`} name="phone" defaultValue={a.phone} required className="input" autoComplete="tel" placeholder="0300 1234567" />
      </Field>
      <Field label="City" htmlFor={`city-${k}`}>
        <input id={`city-${k}`} name="city" defaultValue={a.city} required className="input" autoComplete="address-level2" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Street address" htmlFor={`l1-${k}`}>
          <input id={`l1-${k}`} name="line1" defaultValue={a.line1} required className="input" autoComplete="street-address" />
        </Field>
      </div>
      <Field label="Province" htmlFor={`pr-${k}`}>
        <input id={`pr-${k}`} name="province" defaultValue={a.province} className="input" autoComplete="address-level1" />
      </Field>
      <label className="flex items-center gap-2 text-sm self-end pb-2">
        <input type="checkbox" name="isDefault" defaultChecked={a.isDefault} className="accent-indigo-600 size-4" /> Make default
      </label>
    </div>
  );
}

export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await pageUser("/account/addresses", ["BUYER"]);
  const { next } = await searchParams;
  const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { id: "asc" }] });
  return (
    <>
      <PageTitle
        title="My addresses"
        action={
          next === "/checkout" && addresses.length > 0 ? (
            <LinkButton href="/checkout">Back to checkout</LinkButton>
          ) : (
            <a href="#new-address" className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-medium inline-flex items-center">
              Add address
            </a>
          )
        }
      />
      {addresses.length === 0 ? (
        <Card className="mb-6">
          <EmptyState icon="⌂" title="No saved addresses" body="Add one below to check out faster." />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {addresses.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{a.label}</span>
                {a.isDefault && <Badge tone="emerald">Default</Badge>}
              </div>
              <p className="mt-2 text-sm">{a.fullName}</p>
              <p className="text-sm text-muted">
                {a.line1}, {a.city}
                {a.province && `, ${a.province}`}
              </p>
              <p className="text-sm text-muted">{a.phone}</p>
              <div className="mt-3 flex items-center gap-4">
                <details className="flex-1">
                  <summary className="cursor-pointer text-sm font-medium text-indigo-600">Edit</summary>
                  <ActionForm action={saveAddressAction} className="mt-4 space-y-4">
                    <AddressFields a={a} />
                    <SubmitButton size="sm">Save address</SubmitButton>
                  </ActionForm>
                </details>
                <ActionButton action={deleteAddressAction} fields={{ id: a.id }} variant="ghost" size="sm" confirm="Delete this address?" className="self-start">
                  <span className="text-rose-600">Delete</span>
                </ActionButton>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Card className="p-6" id="new-address">
        <h2 className="font-semibold mb-4">Add new address</h2>
        <ActionForm action={saveAddressAction} resetOnSuccess className="space-y-4">
          <AddressFields />
          <SubmitButton>Save address</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
