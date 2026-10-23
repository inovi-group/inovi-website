import type { Metadata } from "next";
import { Redirect } from "@/components/Redirect";

// The deal X-ray page is now FIDES, at /fides.
export const metadata: Metadata = {
  title: "FIDES — Deal records you can trust",
  alternates: { canonical: "https://inovigroup.co.uk/fides" },
  robots: { index: false, follow: true },
};

export default function FirmaExperienceMoved() {
  return <Redirect to="/fides/" label="FIDES" />;
}
