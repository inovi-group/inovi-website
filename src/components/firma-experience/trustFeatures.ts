import {
  Activity,
  AlarmClock,
  BadgeCheck,
  BellRing,
  CalendarClock,
  FileClock,
  FileText,
  GitCompare,
  History,
  LineChart,
  Radar,
  ScanSearch,
  Search,
  ShieldCheck,
  Target,
  TrendingDown,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

/**
 * The "everything you can trust" cards on the Firma page, after the scroll story.
 * One entry per card, shown in this order. To drop a card, set `on: false` (or delete the entry);
 * the grid reflows by itself. `pillar: true` marks the four lead messages: they get the gold top edge.
 */
export type TrustFeature = { on: boolean; pillar?: boolean; icon: LucideIcon; tag: string; title: string; text: string };

export const TRUST_FEATURES: TrustFeature[] = [
  // ---- the four pillars ----
  { on: true, pillar: true, icon: ShieldCheck, tag: "Audit", title: "A tamper-proof register",
    text: "Every score, forecast, outcome and decision sealed as it happens, in an append-only register your auditors can verify themselves." },
  { on: true, pillar: true, icon: FileText, tag: "Month end", title: "The month-end report, done for you",
    text: "Firma gathers the month from the register and writes the report: what held up, what drifted, what was decided. Sealed and ready to share." },
  { on: true, pillar: true, icon: Search, tag: "Access", title: "Anything, one search away",
    text: "Find any score, decision or record by deal, source, owner or date, with the evidence beside it. No digging through tools or exports." },
  { on: true, pillar: true, icon: Radar, tag: "Drift", title: "Drift detection",
    text: "Firma watches your scores, models and their data over time, and alerts you when something starts to move. Nothing to babysit." },

  // ---- more ways Firma keeps your systems trustworthy (keep the ones you want) ----
  { on: true, icon: Target, tag: "Calibration", title: "Predicted vs. real outcomes",
    text: "Does a 70% score win 70% of the time? Every source's calibration, measured against the deals that actually closed." },
  { on: true, icon: LineChart, tag: "Accuracy", title: "Accuracy over time",
    text: "Each source's hit rate, month on month, so you see a tool getting better or quietly getting worse." },
  { on: true, icon: Activity, tag: "Drift", title: "Model and data drift",
    text: "Shifts in a provider's score distribution or in the data feeding it, caught before they change your forecast." },
  { on: true, icon: BellRing, tag: "Alerts", title: "Source degradation alerts",
    text: "When a score source starts missing more often than it used to, you hear about it first, with the evidence attached." },
  { on: true, icon: CalendarClock, tag: "Slippage", title: "Close-date slippage",
    text: "Expected close dates against when deals really closed, by source, team and stage, so slipping deals stand out." },
  { on: true, icon: TrendingDown, tag: "Forecasts", title: "Forecast slippage vs. reality",
    text: "Your reps' forecasts and commits compared with what landed, sealed at the time they were made." },
  { on: true, icon: ScanSearch, tag: "Anomalies", title: "Anomaly and outlier detection",
    text: "Scores that jump overnight, deals that break the pattern, a source that suddenly agrees with nobody: flagged for review." },
  { on: true, icon: GitCompare, tag: "Consistency", title: "Consistency between sources",
    text: "Where your CRM, your revenue tools and your team disagree on the same deal, side by side." },
  { on: true, icon: History, tag: "History", title: "A verifiable history of changes",
    text: "Every change to a score or forecast kept as a new entry, never an overwrite. See who changed what, and when." },
  { on: true, icon: BadgeCheck, tag: "Verification", title: "Independent verification",
    text: "Open SHA3-512 hash chains in the FIRMA v2.0 format. Anyone can recompute them with the open validator; no vendor access needed." },
  { on: true, icon: Waypoints, tag: "Decisions", title: "Decisions with their evidence",
    text: "Every call is sealed with the scores and outcomes it was based on, so you can show why it was made." },
  { on: true, icon: FileClock, tag: "Point in time", title: "What did we know, and when?",
    text: "Replay the register as it stood on any date: the scores, forecasts and decisions as they were then." },
  { on: true, icon: AlarmClock, tag: "Freshness", title: "Stale-score alerts",
    text: "A source that stops updating, or a deal scored on old data, flagged before anyone relies on it." },
];
