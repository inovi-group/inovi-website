import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { HomeExperience } from "@/components/home-experience/HomeExperience";

export const metadata: Metadata = {
  title: "INOVI Group — System-First AI Governance",
  description:
    "Zero-latency (<50ms) inline governance proxy for real-time model verification and EU AI Act compliance. One verifiable layer under iSale, AGRO and FIRMA. London, UK.",
  alternates: { canonical: "https://inovigroup.co.uk" },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "INOVI Group Ltd",
  url: "https://inovigroup.co.uk",
  location: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" } },
  sameAs: ["https://github.com/inovi-group"],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={orgSchema} />
      <HomeExperience />
    </>
  );
}
