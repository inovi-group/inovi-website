import type { Lang } from "@/i18n";

const TX = {
  en: { label: "A record fingerprinted and chained by FIRMA", record: "Record", file: "contract_v3.pdf", prev: "prev", anchored: "✓  ANCHORED · CHAIN INTACT" },
  fr: { label: "Un enregistrement haché et chaîné par FIRMA", record: "Enregistrement", file: "contrat_v3.pdf", prev: "préc.", anchored: "✓  ANCRÉ · CHAÎNE INTACTE" },
};
const BLOCKS = [
  { n: 1039, prev: "0000…0000", hash: "b1e4…77a2" },
  { n: 1040, prev: "b1e4…77a2", hash: "4c0d…19fe" },
  { n: 1041, prev: "4c0d…19fe", hash: "e83b…a610" },
  { n: 1042, prev: "e83b…a610", hash: "9f3a…5d84" },
];

/**
 * FIRMA's chain, drawn still for the FIRMA page: a document, its SHA3-512 fingerprint, the dashed path into a new
 * block, four linked blocks and the anchored state. Same look as FIRMA's item on the home ring: fine gold lines,
 * mono snippets, a muted palette. Colours come from the site's theme tokens, so it works in light mode too.
 */
export function ChainDiagram({ lang, className = "" }: { lang: Lang; className?: string }) {
  const t = TX[lang];
  const gold = "var(--color-firma)", text = "var(--color-text)", muted = "var(--color-muted)", card = "var(--color-card)", line = "var(--color-line)";
  const mono = "var(--font-jbmono), ui-monospace, monospace";
  return (
    <svg viewBox="0 0 460 330" role="img" aria-label={t.label} className={className} fill="none">
      {/* the document */}
      <rect x="18" y="14" width="120" height="152" rx="4" fill={card} stroke={gold} strokeOpacity="0.6" />
      <rect x="30" y="28" width="7" height="7" fill={gold} />
      <text x="43" y="35" fill={text} fontSize="11" fontWeight="600">{t.record}</text>
      {[0.8, 0.62, 0.72, 0.5, 0.78, 0.6].map((w, i) => (
        <rect key={i} x="30" y={52 + i * 15} width={96 * w} height="3" rx="1.5" fill={muted} fillOpacity="0.35" />
      ))}
      <text x="30" y="154" fill={muted} fontSize="8.5" fontFamily={mono}>{t.file}</text>
      {/* the fingerprint */}
      <text x="162" y="36" fill={muted} fontSize="9.5" fontWeight="600" fontFamily={mono} letterSpacing="0.06em">SHA3-512</text>
      <text x="162" y="60" fill={text} fontSize="13" fontFamily={mono}>9f3a c27e 41d0 b8e5</text>
      <text x="162" y="80" fill={text} fontSize="13" fontFamily={mono}>07aa 3c19 e26f 5d84</text>
      <text x="162" y="98" fill={muted} fontSize="10" fontFamily={mono}>…</text>
      {/* the dashed path into the new block */}
      <path d="M232 110 V150 H398 V204" stroke={gold} strokeOpacity="0.75" strokeDasharray="4 4" />
      <path d="M394 199 L398 205 L402 199" stroke={gold} strokeOpacity="0.75" />
      {/* the chain */}
      {BLOCKS.map((b, i) => {
        const x = 14 + i * 112, isNew = i === 3;
        return (
          <g key={b.n}>
            <rect x={x} y="208" width="96" height="70" rx="4" fill={card} stroke={gold} strokeOpacity={isNew ? 0.95 : 0.55} />
            {isNew && <rect x={x} y="208" width="96" height="70" rx="4" fill={gold} fillOpacity="0.08" />}
            <text x={x + 9} y="226" fill={gold} fontSize="11" fontWeight="600" fontFamily={mono}>#{b.n}</text>
            <text x={x + 9} y="246" fill={muted} fontSize="8.5" fontFamily={mono}>{t.prev} {b.prev}</text>
            <text x={x + 9} y="260" fill={text} fontSize="8.5" fontFamily={mono}>hash {b.hash}</text>
            <text x={x + 9} y="272" fill={muted} fillOpacity="0.7" fontSize="7.5" fontFamily={mono}>ed25519 ✓</text>
            {i < 3 && <path d={`M${x + 96} 243 H${x + 112}`} stroke={gold} strokeOpacity="0.75" />}
          </g>
        );
      })}
      <line x1="14" y1="296" x2="446" y2="296" stroke={line} />
      <text x="230" y="318" fill={gold} fontSize="11" fontWeight="600" fontFamily={mono} textAnchor="middle" letterSpacing="0.04em">{t.anchored}</text>
    </svg>
  );
}
