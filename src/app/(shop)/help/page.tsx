import { getSettings } from "@/lib/settings";
import { Card, NotConfigured, PageTitle } from "@/components/ui";

export const metadata = { title: "Help" };

export default async function HelpPage() {
  const s = await getSettings();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <PageTitle title="Help centre" />
      <Card className="p-6" id="cod">
        <h2 className="font-semibold mb-2">Cash on delivery</h2>
        <p className="text-sm text-gray-700">
          All orders are paid in cash to the courier. You get a 4-digit delivery code on the order page; share it only when you receive the parcel. Online payment is <NotConfigured />.
        </p>
      </Card>
      <Card className="p-6" id="returns">
        <h2 className="font-semibold mb-2">7-day returns</h2>
        <p className="text-sm text-gray-700">Open My account → Returns within 7 days of delivery. The seller reviews the request; the refund is recorded when the item is returned.</p>
      </Card>
      <Card className="p-6" id="contact">
        <h2 className="font-semibold mb-2">Contact support</h2>
        <p className="text-sm text-gray-700">
          Use “Need help?” on any order to open a case with our team, or write to {s.supportEmail} (email delivery is <NotConfigured />).
        </p>
      </Card>
    </div>
  );
}
