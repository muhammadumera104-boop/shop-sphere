import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ShopSphere: Marketplace + Digital Khata", template: "%s | ShopSphere" },
  description: "Shop from verified sellers with Cash on Delivery, and run your shop's credit book with Digital Khata.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4F46E5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white px-4 py-2 rounded-full shadow">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
