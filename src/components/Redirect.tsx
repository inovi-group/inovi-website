"use client";

import Link from "next/link";
import { useEffect } from "react";

// Static export has no server redirects: a moved page sends visitors on with a meta refresh (no script needed)
// and a client-side replace, and shows a link in case both are blocked.
export function Redirect({ to, label }: { to: string; label: string }) {
  useEffect(() => { window.location.replace(to + window.location.search + window.location.hash); }, [to]);
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <p className="mx-auto max-w-6xl px-5 py-24 text-muted">
        This page has moved to <Link href={to} className="text-text underline">{label}</Link>.
      </p>
    </>
  );
}
