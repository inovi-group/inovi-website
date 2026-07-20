"use client";

import Link from "next/link";
import { useState } from "react";
import { Github, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { href: "/isale", label: "iSale" },
  { href: "/agro", label: "AGRO" },
  { href: "/firma", label: "FIRMA" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-baseline gap-1.5" onClick={() => setOpen(false)}>
          <span className="text-lg font-bold tracking-tight text-text">INOVI</span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Group
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="https://github.com/inovi-group/firma-spec"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="INOVI on GitHub"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:text-text"
          >
            <Github size={16} />
          </a>
          <ThemeToggle />
          <a
            href="mailto:contact@inovigroup.co.uk"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Contact
          </a>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center text-muted md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-ink px-5 pb-5 pt-3 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-muted hover:text-text"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-3 flex items-center gap-3">
            <ThemeToggle />
            <a
              href="mailto:contact@inovigroup.co.uk"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Contact
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
