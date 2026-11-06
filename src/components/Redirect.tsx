"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";

// Static export has no server redirects: a moved page sends visitors on with a meta refresh (no script needed)
// and a client-side replace, and shows a link in case both are blocked. Hosts that support it also get real
// 301s from public/_redirects and vercel.json.
export function Redirect({ to, label, lang = "en" }: { to: string; label: string; lang?: Lang }) {
  useEffect(() => { window.location.replace(to + window.location.search + window.location.hash); }, [to]);
  const [pre, post] = ui(lang).moved;
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <p className="mx-auto max-w-6xl px-5 py-24 text-muted">
        {pre} <Link href={to} className="text-text underline">{label}</Link>{post}
      </p>
    </>
  );
}
