import type { Metadata } from "next";
import { IsaleExperience } from "@/components/isale-experience/IsaleExperience";

export const metadata: Metadata = {
  title: "iSale — Detect Hidden Deal Risks Before Signature",
  description:
    "iSale detects the hidden risks in your commercial deals before signature. CRM-native risk scoring, ROI in 30 days, 15–30% reduction in bad deals. Secured by FIRMA.",
  alternates: { canonical: "https://inovigroup.co.uk/isale" },
};

export default function ISalePage() {
  return <IsaleExperience />;
}
