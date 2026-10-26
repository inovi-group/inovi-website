import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-text">INOVI</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Group
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Trust infrastructure for the AI economy. Verifiable systems, measurable
            outcomes.
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-dim">
            Products
          </div>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li><Link href="/isale" className="text-muted hover:text-text">iSale — Revenue intelligence</Link></li>
            <li><Link href="/agro" className="text-muted hover:text-text">AGRO — Smart irrigation</Link></li>
            <li><Link href="/trust-sensor" className="text-muted hover:text-text">Trust Sensor — Trusted deal records</Link></li>
            <li><Link href="/firma" className="text-muted hover:text-text">FIRMA — The trust layer</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-dim">
            Open source
          </div>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li>
              <a
                href="https://github.com/inovi-group/firma-spec"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-text"
              >
                FIRMA specification
              </a>
            </li>
            <li>
              <a
                href="https://inovi-group.github.io/firma-spec/demo/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-text"
              >
                Live demo
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-dim">
            Company
          </div>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li><Link href="/about" className="text-muted hover:text-text">About</Link></li>
            <li>
              <a href="mailto:contact@inovigroup.co.uk" className="text-muted hover:text-text">
                contact@inovigroup.co.uk
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 INOVI Group Ltd — London, United Kingdom</span>
          <span>FIRMA specification released under GPL-3.0</span>
        </div>
      </div>
    </footer>
  );
}
