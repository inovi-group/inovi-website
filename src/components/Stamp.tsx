import type { ReactNode } from "react";
import clsx from "clsx";
import { brand } from "./Brand";

const tones = {
  accent: { corner: "border-accent", dot: "bg-accent" },
  isale: { corner: "border-isale", dot: "bg-isale" },
  agro: { corner: "border-agro", dot: "bg-agro" },
  firma: { corner: "border-firma", dot: "bg-firma" },
} as const;

/**
 * Verification-frame eyebrow: bracket corners like a calibration mark,
 * monospace type, squared status dot. INOVI's audit identity — not a pill.
 */
export function Stamp({
  tone = "accent",
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  const t = tones[tone];
  return (
    <div className="relative inline-flex items-center gap-2.5 bg-card px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
      <span
        aria-hidden="true"
        className={clsx("absolute -left-px -top-px h-2.5 w-2.5 border-l border-t", t.corner)}
      />
      <span
        aria-hidden="true"
        className={clsx("absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r", t.corner)}
      />
      <span aria-hidden="true" className={clsx("h-1.5 w-1.5", t.dot)} />
      {brand(children)}
    </div>
  );
}
