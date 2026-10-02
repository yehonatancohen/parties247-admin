import type { Metadata, Viewport } from "next";
import "../styles/tailwind.css";
import { Rubik } from "next/font/google";
import Providers from "./providers";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "Parties 24/7 — Admin",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
