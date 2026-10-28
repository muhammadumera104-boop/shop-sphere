import { Tabs } from "@/components/ui";

export function KhataTabs({ active }: { active: "customers" | "suppliers" | "expenses" }) {
  return (
    <Tabs
      active={active}
      tabs={[
        { key: "customers", label: "Customers", href: "/seller/khata/customers" },
        { key: "suppliers", label: "Suppliers", href: "/seller/khata/customers?type=SUPPLIER" },
        { key: "expenses", label: "Expenses", href: "/seller/khata/expenses" },
      ]}
    />
  );
}
