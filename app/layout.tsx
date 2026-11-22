import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Escalation-Bench harness",
  description: "Track B evaluation harness and results UI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="flex items-center gap-6 border-b px-6 py-3">
            <Link href="/" className="font-semibold">Escalation-Bench</Link>
            <nav className="flex flex-1 gap-4 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">Results</Link>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
