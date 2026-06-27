import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ToastProvider from "@/components/Toast";

/* Redaction — base for body text */
const redaction = localFont({
  src: [
    { path: "./fonts/Redaction-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Redaction-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-redaction",
  display: "swap",
});

/* Redaction 20 — lightly degraded, for section headings */
const redaction20 = localFont({
  src: "./fonts/Redaction_20-Regular.woff2",
  variable: "--font-redaction-20",
  display: "swap",
});

/* Redaction 35 — more degraded, for large titles (letterpress feel) */
const redaction35 = localFont({
  src: "./fonts/Redaction_35-Regular.woff2",
  variable: "--font-redaction-35",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Proove",
  description: "A simple personal recipe app",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Proove",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1714" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${redaction.variable} ${redaction20.variable} ${redaction35.variable}`}
    >
      <body>
        <ToastProvider>
          <main className="max-w-5xl mx-auto p-5">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
