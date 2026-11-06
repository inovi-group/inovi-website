import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono", display: "swap" });

/** Site-wide metadata, the same for both languages' root layouts (pages add their own title, canonical, hreflang). */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "INOVI Group", template: "%s · INOVI Group" },
  applicationName: "INOVI Group",
  robots: { index: true, follow: true, "max-image-preview": "large" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};
export const baseViewport: Viewport = { themeColor: "#0a0d13", colorScheme: "dark light" };

const themeScript = `(function(){try{var t=localStorage.getItem("inovi-theme");if(t==="light"){document.documentElement.classList.add("light")}}catch(e){}})()`;

/** The page shell for one language: <html lang>, header, main, footer. */
export function RootShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script adds class="light" to <html> before React hydrates (on purpose)
    <html lang={lang === "fr" ? "fr" : "en-GB"} className={`${inter.variable} ${jbmono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <a href="#main" className="skip-link">{ui(lang).skip}</a>
        <Header lang={lang} />
        <main id="main">{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
