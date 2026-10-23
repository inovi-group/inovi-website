import { Clock, Gauge, TrendingDown, Users, type LucideIcon } from "lucide-react";

// The scroll story, one step per scene step (1–3): connect, analyze, act.
export const STEPS: [idx: string, headline: string, what: string, why: string][] = [
  ["01 · Connect", "Plugs into the CRM you already use.",
    "Plug iSale into your existing CRM. No migration, no new workflow for your reps: your deals flow in exactly as they are.",
    "Nothing changes for your team, so iSale is scoring your pipeline from day one."],
  ["02 · Analyze", "Every deal, scored on what's observable.",
    "iSale reads the signals in every open deal: stage history, discount patterns, stakeholder coverage. Each deal gets a risk score built from evidence, not gut feel.",
    "Your forecast stops being a wish list."],
  ["03 · Act", "The risky deals stand out before signature.",
    "Risk alerts land where your team already works. The deal stalling in negotiation with no champion is flagged while there is still time to act.",
    "Kill bad deals early and double down on real ones: 15–30% fewer bad deals, with measurable ROI in 30 days."],
];

export const STATS = [
  { value: "15–30%", label: "reduction in bad deals" },
  { value: "30 days", label: "to measurable ROI" },
  { value: "CRM-native", label: "works with your pipeline" },
  { value: "Observable", label: "signals, not gut feel" },
];

export const SIGNALS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Clock, title: "Stage-duration drift",
    text: "A deal stuck 45 days in Negotiation is telling you something. iSale flags stagnation patterns before they cost you the quarter." },
  { icon: TrendingDown, title: "Discount pressure",
    text: "Rising discount requests correlate with weak positioning. iSale tracks concession patterns across your pipeline." },
  { icon: Users, title: "Champion mapping",
    text: "No identified champion means no internal advocate. iSale surfaces deals that are flying blind before you commit resources." },
  { icon: Gauge, title: "Reality scoring",
    text: "Every deal gets a risk score built from observable signals, not gut feel. Your forecast stops being a wish list." },
];
