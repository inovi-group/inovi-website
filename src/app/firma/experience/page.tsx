import type { Metadata } from "next";
import { Redirect } from "@/components/Redirect";

// The deal X-ray page is now Trust Sensor, at /trust-sensor.
export const metadata: Metadata = {
  title: "Trust Sensor — Deal records you can trust",
  alternates: { canonical: "https://inovigroup.co.uk/trust-sensor" },
  robots: { index: false, follow: true },
};

export default function FirmaExperienceMoved() {
  return <Redirect to="/trust-sensor/" label="Trust Sensor" />;
}
