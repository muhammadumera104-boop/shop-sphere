import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="area">
      <Header />
      <main id="main" className="min-h-[60vh] page-enter">
        {children}
      </main>
      <Footer />
    </div>
  );
}
