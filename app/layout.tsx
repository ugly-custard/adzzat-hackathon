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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-6 py-3">
              <Link href="/" className="font-semibold tracking-tight whitespace-nowrap">Escalation-Bench</Link>
              <span className="hidden text-sm text-muted-foreground sm:inline">evaluation harness · offline fixtures</span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
