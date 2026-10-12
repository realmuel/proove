import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ToastProvider from "@/components/Toast";

/* Michelangelus — used for all text */
const michelangelus = localFont({
  src: [
    { path: "./fonts/Michelangelus-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Michelangelus-Italic.ttf", weight: "400", style: "italic" },
    { path: "./fonts/Michelangelus-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Michelangelus-BoldItalic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-michelangelus",
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
      className={`${michelangelus.variable}`}
    >
      <body>
        <ToastProvider>
          <main className="max-w-5xl mx-auto p-5">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
