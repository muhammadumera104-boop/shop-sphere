import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <Logo />
      <p className="mt-10 text-6xl font-extrabold text-indigo-600">404</p>
      <h1 className="text-xl font-bold mt-2">Page not found</h1>
      <p className="text-muted mt-1 max-w-sm">The page you are looking for does not exist, or you do not have access to it.</p>
      <Link href="/" className="mt-6 h-11 px-6 rounded-full bg-indigo-600 text-white font-medium inline-flex items-center">
        Back to home
      </Link>
    </main>
  );
}
