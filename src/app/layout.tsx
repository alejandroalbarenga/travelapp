import type { Metadata, Viewport } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import { OfflineBanner, ServiceWorker } from "@/components/pwa";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: "700",
});

export const metadata: Metadata = {
  title: "Vamo",
  description: "Organizá y seguí un viaje en grupo: ciudades, tramos, pasajes y gastos compartidos.",
  appleWebApp: {
    capable: true,
    title: "Vamo",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${jakarta.variable} ${caveat.variable} h-full`}>
      <body className="min-h-full font-sans">
        {children}
        <OfflineBanner />
        <ServiceWorker />
      </body>
    </html>
  );
}
