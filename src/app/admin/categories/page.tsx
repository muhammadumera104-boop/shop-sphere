import Link from "next/link";
import { prisma } from "@/lib/db";
import { saveCategoryAction } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, LinkButton, PageTitle, cx } from "@/components/ui";

export const metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const cats = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const roots = cats.filter((c) => !c.parentId);
  const childrenOf = (id: string) => cats.filter((c) => c.parentId === id);
  const selected = edit ? cats.find((c) => c.id === edit) : undefined;

  const Row = ({ c, depth }: { c: (typeof cats)[number]; depth: number }) => (
    <>
      <li>
        <Link
          href={`/admin/categories?edit=${c.id}`}
          className={cx("flex items-center gap-3 px-4 py-3 hover:bg-gray-50", c.id === edit && "bg-indigo-50")}
          style={{ paddingLeft: `${16 + depth * 28}px` }}
        >
          <span className="text-gray-300" aria-hidden>
            ⋮⋮
          </span>
          <span className="flex-1 font-medium">{c.name}</span>
          <span className="text-xs text-muted">{c._count.products} products</span>
          <Badge tone={c.isActive ? "emerald" : "gray"}>{c.isActive ? "Active" : "Hidden"}</Badge>
        </Link>
      </li>
      {childrenOf(c.id).map((k) => (
        <Row key={k.id} c={k} depth={depth + 1} />
      ))}
    </>
  );

  return (
    <>
      <PageTitle title="Categories" action={<LinkButton href="/admin/categories">+ Add category</LinkButton>} />
      <div className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
        <Card>
          <ul className="divide-y divide-gray-100">
            {roots.map((c) => (
              <Row key={c.id} c={c} depth={0} />
            ))}
          </ul>
        </Card>
        <Card className="p-5 xl:sticky xl:top-6">
          <h2 className="font-semibold mb-4">{selected ? `Edit “${selected.name}”` : "New category"}</h2>
          <ActionForm action={saveCategoryAction} key={selected?.id ?? "new"} resetOnSuccess={!selected} className="space-y-4">
            {selected && <input type="hidden" name="id" value={selected.id} />}
            <Field label="Name" htmlFor="cn">
              <input id="cn" name="name" defaultValue={selected?.name} required className="input" />
            </Field>
            <Field label="Slug" htmlFor="cs" hint="Used in the URL: /category/slug">
              <input id="cs" name="slug" defaultValue={selected?.slug} required pattern="[a-z0-9-]+" className="input font-mono" />
            </Field>
            <Field label="Parent" htmlFor="cp">
              <select id="cp" name="parentId" defaultValue={selected?.parentId ?? ""} className="input">
                <option value="">None (top level)</option>
                {cats
                  .filter((c) => c.id !== selected?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? "— " : ""}
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Sort order" htmlFor="co">
              <input id="co" name="sortOrder" type="number" min={0} defaultValue={selected?.sortOrder ?? 0} className="input" />
            </Field>
            <div className="rounded-xl border-2 border-dashed border-line p-4 text-center text-xs text-muted">Category images: storage uses product-style gradient tiles; image upload for categories is not built yet.</div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={selected?.isActive ?? true} className="accent-indigo-600 size-4" /> Active (visible to buyers)
            </label>
            <SubmitButton className="w-full">Save</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
