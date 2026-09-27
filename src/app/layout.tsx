import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grab the Moon | 今晚的月亮，可以吃。",
  description: "The moon was too far away. So I made one you can grab. A tiny Mid-Autumn experiment.",
  openGraph: {
    title: "I turned the moon into a mooncake.",
    description: "A tiny Mid-Autumn experiment. Drag, pinch, and make your mooncake.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#080c13", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
