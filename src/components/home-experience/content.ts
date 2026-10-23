import { FileCheck2, Lock, Scale, ShieldCheck, Sprout, TrendingUp, Zap, type LucideIcon } from "lucide-react";

export const PROOFS = [
  { label: "Open specification", value: "FIRMA v2.0", detail: "published under GPL-3.0" },
  { label: "Reference implementation", value: "16/16 tests", detail: "Python validators, public" },
  { label: "Working prototype", value: "End-to-end", detail: "traced LLM pipeline, live" },
  { label: "Company", value: "London, UK", detail: "INOVI Group Ltd" },
];

export type Product = { href: string; external: boolean; name: string; tagline: string; description: string; icon: LucideIcon; tone: "isale" | "agro" | "fides"; cta: string };
export const PRODUCTS: Product[] = [
  { href: "/fides/", external: false, name: "FIDES", tagline: "Trusted deal records", icon: FileCheck2, tone: "fides", cta: "See how it works",
    description: "A tamper-proof register of every deal score and decision, verifiable by auditors, with the month-end report done for you." },
  { href: "/agro/", external: false, name: "AGRO", tagline: "Smart irrigation", icon: Sprout, tone: "agro", cta: "See how it works",
    description: "Underground sensors in the root zone decide when and how much to irrigate. 35–50% less water, advice on any phone." },
  { href: "/isale/", external: false, name: "iSale", tagline: "Revenue intelligence", icon: TrendingUp, tone: "isale", cta: "See how it works",
    description: "Detects the hidden risks in your commercial deals before signature, from the signals already in your CRM." },
];
// also in development, shown as a single line under the products
export const ENERGY = { name: "ENERGY TS", text: "High-throughput compliance and safety guardrails for industrial energy grids.", href: "mailto:contact@inovigroup.co.uk?subject=ENERGY%20TS", icon: Zap };

export const PRINCIPLES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "Verifiable by design",
    text: "Every AI decision our systems process is hashed, signed and chained. Tampering is mathematically detectable: not policed by convention, but prevented by construction." },
  { icon: Lock, title: "Proof before promise",
    text: "We publish our specification in the open, ship reference implementations, and measure our prototypes on real cases. Claims on this site are measurable or absent." },
  { icon: Scale, title: "Built for accountability",
    text: "As AI agents take decisions with real-world consequences, capital and regulators need infrastructure that shows what happened, and proves it hasn't been rewritten." },
];
