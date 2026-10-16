import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { DemoProvider } from "@/lib/store";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HealthTrack — Personal Wellness Guidance",
  description:
    "Know your normal. Notice what matters. Do ONE thing. Repeat what works. Interactive HealthTrack 1.0 demo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
