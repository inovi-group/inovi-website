import type { Metadata } from "next";
import { Experience } from "@/components/firma-experience/Experience";

export const metadata: Metadata = {
  title: "Trust Sensor — Deal records you can trust",
  description:
    "Trust Sensor keeps a tamper-proof register of every deal score, forecast and decision, verifiable by your auditors and secured by FIRMA. Month-end reports written for you, every record one search away, and drift alerts.",
  alternates: { canonical: "https://inovigroup.co.uk/trust-sensor" },
};

// Trust Sensor, Inovi's deal-score product (formerly FIDES). The page's components still live in firma-experience/.
export default function TrustSensorPage() {
  return <Experience />;
}
