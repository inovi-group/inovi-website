import type { Metadata } from "next";
import { Experience } from "@/components/firma-experience/Experience";

export const metadata: Metadata = {
  title: "FIRMA — Deal records you can trust",
  description:
    "A tamper-proof register of every deal score, forecast and decision, verifiable by your auditors. Month-end reports written for you, every record one search away, and drift alerts.",
  alternates: { canonical: "https://inovigroup.co.uk/firma/experience" },
  // review build with variant toggles: keep it out of search until it replaces a live page
  robots: { index: false, follow: false },
};

export default function FirmaExperiencePage() {
  return <Experience />;
}
