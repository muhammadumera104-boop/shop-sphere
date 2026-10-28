import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AuthForms } from "./AuthForms";

export const metadata = { title: "Login or register" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; tab?: string }> }) {
  const { next, tab } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : user.role === "DELIVERY" ? "/delivery" : "/");
  return (
    <main id="main" className="min-h-screen grid lg:grid-cols-2">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-8 sm:p-12 flex flex-col justify-between min-h-64">
        <div className="absolute -right-20 top-24 size-72 rounded-full bg-gold/80" aria-hidden />
        <div className="absolute left-10 -bottom-16 size-48 rounded-full bg-gold/40" aria-hidden />
        <div className="relative">
          <Logo dark />
        </div>
        <div className="relative my-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Shop. Sell. Grow.</h1>
          <ul className="mt-6 space-y-2 text-white/90">
            <li>✓ Buy from verified sellers with Cash on Delivery</li>
            <li>✓ Open your own shop in Seller Mode</li>
            <li>✓ Keep your Khata (credit book) digitally</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/60">One account for buying and selling.</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12 bg-page">
        <AuthForms next={next} initialTab={tab === "register" ? "register" : "login"} />
      </section>
    </main>
  );
}
