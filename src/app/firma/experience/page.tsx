import type { Metadata } from "next";
import { Experience } from "@/components/firma-experience/Experience";

export const metadata: Metadata = {
  title: "FIRMA Deal X-ray — Know which deal scores to trust",
  description:
    "One deal, the scores already on it, Firma's check against what really happened, and one decision, sealed in a FIRMA v2.0 hash chain.",
  alternates: { canonical: "https://inovigroup.co.uk/firma/experience" },
  // review build with variant toggles: keep it out of search until it replaces a live page
  robots: { index: false, follow: false },
};

export default function FirmaExperiencePage() {
  return <Experience />;
}
