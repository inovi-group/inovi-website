import { Inter } from "next/font/google";
import { ui } from "@/i18n/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = { title: { absolute: "Page not found · INOVI Group" }, robots: { index: false } };

// The site has two root layouts (EN and FR), so the 404 is a whole page of its own (experimental.globalNotFound).
// Static export ships it as 404.html for every unknown URL: English, with a line and link in French.
export default function GlobalNotFound() {
  const en = ui("en").notFound, fr = ui("fr").notFound;
  return (
    <html lang="en-GB" className={inter.variable}>
      <body className="font-sans">
    <section className="mx-auto max-w-3xl px-5 py-28">
      <p className="font-mono text-sm text-dim">404</p>
      <h1 className="mt-3 text-3xl font-bold text-text">{en.title}</h1>
      <p className="mt-3 text-muted">{en.text}</p>
      <a href="/" className="mt-6 inline-block text-accent underline">{en.home}</a>
      <p lang="fr" className="mt-10 text-sm text-muted">{fr.text} <a href="/fr/" className="text-accent underline">{fr.home}</a></p>
    </section>
      </body>
    </html>
  );
}
