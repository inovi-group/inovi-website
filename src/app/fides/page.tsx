import type { Metadata } from "next";
import { Redirect } from "@/components/Redirect";

// The deal-score product was called FIDES; it is Trust Sensor now, at /trust-sensor.
export const metadata: Metadata = {
  title: "Trust Sensor — Deal records you can trust",
  alternates: { canonical: "https://inovigroup.co.uk/trust-sensor" },
  robots: { index: false, follow: true },
};

export default function FidesMoved() {
  return <Redirect to="/trust-sensor/" label="Trust Sensor" />;
}
