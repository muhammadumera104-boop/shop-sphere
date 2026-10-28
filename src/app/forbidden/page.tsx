import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "No access" };

export default function Forbidden() {
  return (
    <main id="main" className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <Logo />
      <p className="mt-10 text-5xl font-extrabold text-rose-500">403</p>
      <h1 className="text-xl font-bold mt-2">You do not have access to this page</h1>
      <p className="text-muted mt-1 max-w-sm">This area is for a different account type. Log in with the right account to continue.</p>
      <div className="flex gap-3 mt-6">
        <Link href="/" className="h-11 px-6 rounded-full bg-indigo-600 text-white font-medium inline-flex items-center">
          Home
        </Link>
        <Link href="/login" className="h-11 px-6 rounded-full border border-line bg-white font-medium inline-flex items-center">
          Switch account
        </Link>
      </div>
    </main>
  );
}
