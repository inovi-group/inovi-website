"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Github, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { href, MAIL, pageOf, ROUTES, SPEC, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";

/** The other language's version of this page (its home page if this one has no counterpart). */
function otherLangHref(pathname: string, lang: Lang) {
  const other: Lang = lang === "en" ? "fr" : "en";
  const page = pageOf(pathname);
  return page ? ROUTES[page.key][other] : ROUTES.home[other];
}

export function Header({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const t = ui(lang);
  // the two products, then the platform under them
  const nav = [
    { href: href(lang, "isale"), label: t.nav.isale },
    { href: href(lang, "agro"), label: t.nav.agro },
    { href: href(lang, "firma"), label: t.nav.firma, platform: true },
    { href: href(lang, "about"), label: t.nav.about },
  ];
  const here = (h: string) => (pathname.endsWith("/") ? pathname : `${pathname}/`) === h;
  const switchHref = otherLangHref(pathname, lang);
  const other = lang === "en" ? "fr" : "en";
  const LangSwitch = ({ className }: { className: string }) => (
    <a href={switchHref} hrefLang={other} lang={other} aria-label={t.switchLabel} className={className}>
      {other.toUpperCase()}
    </a>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href={href(lang, "home")} className="flex items-baseline gap-1.5" onClick={() => setOpen(false)}>
          <span className="text-lg font-bold tracking-tight text-text">INOVI</span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Group</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label={lang === "fr" ? "Navigation principale" : "Main"}>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} aria-current={here(item.href) ? "page" : undefined}
              className={`text-sm transition-colors hover:text-text ${here(item.href) ? "text-text" : "text-muted"} ${item.platform ? "border-l border-line pl-7" : ""}`}>
              {item.label}
              {item.platform && <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{t.navPlatform}</span>}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LangSwitch className="flex h-9 items-center rounded-lg border border-line px-2.5 font-mono text-xs font-semibold text-muted transition-colors hover:text-text" />
          <a href={SPEC} target="_blank" rel="noopener noreferrer" aria-label={t.github}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:text-text">
            <Github size={16} />
          </a>
          <ThemeToggle labels={[t.themeDark, t.themeLight]} />
          <a href={`mailto:${MAIL}`} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            {t.contact}
          </a>
        </div>

        <button className="flex h-9 w-9 items-center justify-center text-muted md:hidden" onClick={() => setOpen(!open)}
          aria-label={t.menu} aria-expanded={open} aria-controls="mobile-nav">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-line bg-ink px-5 pb-5 pt-3 md:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={here(item.href) ? "page" : undefined}
              className="block py-2.5 text-sm text-muted hover:text-text">
              {item.label}
              {item.platform && <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{t.navPlatform}</span>}
            </Link>
          ))}
          <div className="mt-3 flex items-center gap-3">
            <LangSwitch className="flex h-9 items-center rounded-lg border border-line px-2.5 font-mono text-xs font-semibold text-muted" />
            <ThemeToggle labels={[t.themeDark, t.themeLight]} />
            <a href={`mailto:${MAIL}`} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">{t.contact}</a>
          </div>
        </nav>
      )}
    </header>
  );
}
