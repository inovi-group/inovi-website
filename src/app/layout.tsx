import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://inovigroup.co.uk"),
  title: {
    default: "INOVI Group — Trust Infrastructure for the AI Economy",
    template: "%s — INOVI Group",
  },
  description:
    "INOVI builds verifiable AI systems: cryptographic audit trails, revenue intelligence, and applied field products. London, UK.",
  openGraph: {
    siteName: "INOVI Group",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const themeScript = `(function(){try{var t=localStorage.getItem("inovi-theme");if(t==="light"){document.documentElement.classList.add("light")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jbmono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
