import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Эрсдэлийн зураглал — ОБЕГ",
  description:
    "Монгол Улсын сумдын аюулт үзэгдлийн эмзэг байдал ба өртөх байдлын вэб карт",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
