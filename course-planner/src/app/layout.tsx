import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NTUST Course Planner",
  description: "台科大課程查詢與學業規劃平台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
