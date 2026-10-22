import type { Metadata } from "next";
import { AgroExperience } from "@/components/agro-experience/AgroExperience";

export const metadata: Metadata = {
  title: "AGRO — Smart Irrigation for Smallholder Farmers",
  description:
    "AGRO's underground sensors read soil moisture in the root zone and dose irrigation to match. 35–50% water savings, advice on any phone, no smartphone required.",
  alternates: { canonical: "https://inovigroup.co.uk/agro" },
};

export default function AgroPage() {
  return <AgroExperience />;
}
