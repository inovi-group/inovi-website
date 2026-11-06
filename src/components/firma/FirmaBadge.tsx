import Link from "next/link";
import { href, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";

/**
 * FIRMA's mark, drawn small: three blocks on a chain in fine gold lines, the last one just added (filled softly).
 * The same look as FIRMA's item on the home ring and the diagram on the FIRMA page.
 */
export function ChainMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0" fill="none">
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="#10141c" stroke="#cfa761" strokeOpacity="0.35" />
      <g stroke="#cfa761" strokeWidth="1.1">
        <rect x="4" y="12.5" width="6" height="7" rx="1" />
        <rect x="13" y="12.5" width="6" height="7" rx="1" />
        <rect x="22" y="12.5" width="6" height="7" rx="1" fill="#cfa761" fillOpacity="0.35" />
        <path d="M10 16h3M19 16h3" />
      </g>
    </svg>
  );
}

/** "Built on FIRMA": a small badge under each product's hero, linking to the platform's page. */
export function FirmaBadge({ className = "", lang = "en" }: { className?: string; lang?: Lang }) {
  const [pre, name] = ui(lang).seal;
  return (
    <Link href={href(lang, "firma")} className={`group inline-flex items-center gap-2.5 rounded-full border border-line bg-ink/70 py-1 pl-1 pr-3.5 backdrop-blur-sm transition-colors hover:border-firma ${className}`}>
      <ChainMark size={28} />
      <span className="font-mono text-[10.5px] uppercase leading-tight tracking-[0.14em] text-dim">
        {pre} <b className="font-semibold text-text group-hover:text-firma">{name}</b>
      </span>
    </Link>
  );
}
