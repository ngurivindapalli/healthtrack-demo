import type { Metadata } from "next";
import { DemoProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthTrack — Personal Wellness Guidance",
  description:
    "Know your normal. Notice what matters. Do ONE thing. Repeat what works. Interactive HealthTrack 1.0 demo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
