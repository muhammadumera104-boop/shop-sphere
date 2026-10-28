import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { submitReviewAction } from "@/app/actions/shop";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, EmptyState, PageTitle, ProductTile, Stars, Tabs } from "@/components/ui";
import { StarPicker } from "./StarPicker";

export const metadata = { title: "My reviews" };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await pageUser("/account/reviews", ["BUYER"]);
  const { tab = "to-review" } = await searchParams;
  const [toReview, mine] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { buyerId: user.id, status: "DELIVERED" }, reviewed: false },
      include: { product: { select: { gradient: true, images: { take: 1 } } }, order: { select: { number: true } } },
    }),
    prisma.review.findMany({ where: { userId: user.id }, include: { product: { select: { title: true, gradient: true, slug: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageTitle title="Reviews" />
      <div className="mb-5">
        <Tabs
          active={tab}
          tabs={[
            { key: "to-review", label: `To review (${toReview.length})`, href: "/account/reviews" },
            { key: "mine", label: `My reviews (${mine.length})`, href: "/account/reviews?tab=mine" },
          ]}
        />
      </div>
      {tab === "mine" ? (
        mine.length === 0 ? (
          <Card>
            <EmptyState icon="★" title="No reviews yet" />
          </Card>
        ) : (
          <div className="space-y-3">
            {mine.map((r) => (
              <Card key={r.id} className="p-4 flex gap-4">
                <ProductTile gradient={r.product.gradient} className="size-14 rounded-lg shrink-0" label={r.product.title} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`/product/${r.product.slug}`} className="font-medium hover:text-indigo-600">
                      {r.product.title}
                    </a>
                    {r.verified && <Badge tone="emerald">Verified purchase</Badge>}
                  </div>
                  <Stars value={r.rating} />
                  <p className="text-sm text-gray-700 mt-1">{r.comment}</p>
                  <p className="text-xs text-muted mt-1">{formatDate(r.createdAt)}</p>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : toReview.length === 0 ? (
        <Card>
          <EmptyState icon="★" title="Nothing to review" body="Items appear here after they are delivered." />
        </Card>
      ) : (
        <div className="space-y-3">
          {toReview.map((i) => (
            <Card key={i.id} className="p-4">
              <details>
                <summary className="list-none flex items-center gap-4 cursor-pointer">
                  <ProductTile gradient={i.product.gradient} imageUrl={i.product.images[0]?.url} label={i.titleSnapshot} className="size-14 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{i.titleSnapshot}</p>
                    <p className="text-xs text-muted">Order #{i.order.number}</p>
                  </div>
                  <span className="h-9 px-4 rounded-full bg-indigo-600 text-white text-sm font-medium inline-flex items-center">Write a review</span>
                </summary>
                <ActionForm action={submitReviewAction} className="mt-5 space-y-4 border-t border-line pt-5">
                  <input type="hidden" name="orderItemId" value={i.id} />
                  <div className="flex items-center gap-3">
                    <StarPicker />
                    <Badge tone="emerald">Verified purchase</Badge>
                  </div>
                  <label htmlFor={`c-${i.id}`} className="block text-sm font-medium">
                    Your review
                  </label>
                  <textarea id={`c-${i.id}`} name="comment" rows={4} required minLength={5} className="input" placeholder="What did you like or dislike?" />
                  <label className="block rounded-xl border-2 border-dashed border-line p-4 text-sm text-muted text-center cursor-pointer hover:border-indigo-300">
                    Add a photo (optional, JPG/PNG/WebP up to 2 MB)
                    <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="block mx-auto mt-2 text-xs" />
                  </label>
                  <SubmitButton>Submit review</SubmitButton>
                </ActionForm>
              </details>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
