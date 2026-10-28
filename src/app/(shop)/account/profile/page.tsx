import { pageUser } from "@/lib/auth";
import { changePasswordAction, saveProfileAction } from "@/app/actions/shop";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Card, Field, LinkButton, PageTitle, StatusPill } from "@/components/ui";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const user = await pageUser("/account/profile", ["BUYER"]);
  return (
    <>
      <PageTitle title="My profile" />
      <div className="grid xl:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6">
          <Card className="p-6">
            <ActionForm action={saveProfileAction} className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar name={user.name} className="size-16 text-2xl" />
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted">{user.email}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name" htmlFor="name">
                  <input id="name" name="name" defaultValue={user.name} required className="input" autoComplete="name" />
                </Field>
                <Field label="Email" htmlFor="email" hint="Email cannot be changed yet.">
                  <input id="email" value={user.email} disabled className="input" readOnly />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <input id="phone" name="phone" defaultValue={user.phone ?? ""} placeholder="0300 1234567" className="input" autoComplete="tel" />
                </Field>
              </div>
              <SubmitButton>Save changes</SubmitButton>
            </ActionForm>
          </Card>
          <Card className="p-6">
            <details>
              <summary className="cursor-pointer font-semibold text-indigo-600">Change password</summary>
              <ActionForm action={changePasswordAction} resetOnSuccess className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field label="Current password" htmlFor="current">
                  <input id="current" name="current" type="password" required className="input" autoComplete="current-password" />
                </Field>
                <Field label="New password" htmlFor="password" hint="At least 8 characters.">
                  <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
                </Field>
                <div className="sm:col-span-2">
                  <SubmitButton variant="secondary">Update password</SubmitButton>
                </div>
              </ActionForm>
            </details>
          </Card>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 size-28 rounded-full bg-gold/70" aria-hidden />
          <p className="label-caps !text-white/70">Seller Mode</p>
          <h2 className="text-xl font-bold mt-1 relative">{user.shop ? user.shop.name : "Switch to Seller Mode"}</h2>
          {user.shop ? (
            <>
              <p className="text-sm text-white/80 mt-2">
                Shop status: <StatusPill status={user.shop.status} />
              </p>
              <LinkButton href="/seller" variant="gold" className="mt-5">
                Go to my shop
              </LinkButton>
            </>
          ) : (
            <>
              <p className="text-sm text-white/80 mt-2">Sell to buyers across Pakistan and keep your Khata in the same place.</p>
              <LinkButton href="/open-shop" variant="gold" className="mt-5">
                Open my shop
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </>
  );
}
