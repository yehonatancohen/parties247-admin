import type { Metadata } from "next";
import "../styles/tailwind.css";
import { Assistant } from "next/font/google";
import Providers from "./providers";

const assistant = Assistant({
  subsets: ["latin", "hebrew"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-assistant",
});

export const metadata: Metadata = {
  title: "Parties 24/7 — Admin",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={assistant.variable}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
