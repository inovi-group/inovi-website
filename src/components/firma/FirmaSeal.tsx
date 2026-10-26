import Link from "next/link";

// FIRMA's wax seal, drawn small: the same crimson as the seals on the Trust Sensor envelopes, a gold ring, the F.
function SealMark({ size = 30 }: { size?: number }) {
  const blob = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2, r = 14 + Math.sin(t * 9) * 0.6 + Math.sin(t * 5 + 1) * 0.4;
    return `${(16 + Math.cos(t) * r).toFixed(2)},${(16 + Math.sin(t) * r).toFixed(2)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <polygon points={blob} fill="#8f1d2c" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#d9a34a" strokeOpacity="0.7" strokeWidth="1" />
      <text x="16" y="20.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#f3e2b8" fontFamily="var(--font-inter), system-ui, sans-serif">F</text>
    </svg>
  );
}

/** "Secured by FIRMA": a small seal under each product's hero, linking to the trust layer's page. */
export function FirmaSeal({ className = "" }: { className?: string }) {
  return (
    <Link href="/firma/" className={`group inline-flex items-center gap-2.5 rounded-full border border-line bg-ink/70 py-1 pl-1 pr-3.5 backdrop-blur-sm transition-colors hover:border-firma ${className}`}>
      <SealMark />
      <span className="font-mono text-[10.5px] uppercase leading-tight tracking-[0.14em] text-dim">
        Secured by <b className="font-semibold text-text group-hover:text-firma">FIRMA</b>
      </span>
    </Link>
  );
}

export { SealMark };
