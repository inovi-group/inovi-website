import { computeHash, short, type FirmaRecord } from "./chain";

// The mechanism, in general terms: no vendors, deals, numbers or dates on screen.
// Scores are win likelihoods. The story can end either way (?outcome=lost|won, or the toggle):
// the outcome decides which scores called it, what Firma recommends and what is sealed.
export type Outcome = "lost" | "won";
export type Verdict = { ok: boolean; text: string };
export type Score = { kicker: string; label: string; level: number; color: string; source: string; token: string; check: Verdict };
export type Reality = { kicker: string; label: string; note: string; result: Outcome };
export type Decision = { title: string; detail: string };
export type ChainRecord = {
  type: string; kind: string; title: string; content: Record<string, unknown>; token: string;
  n: number; date: string; hash: string; prev: string; rec: FirmaRecord;
};
export type Tamper = { index: number; title: string; hash: string };

const HIGH = "#46b876", LOW = "#ef5a4c";
const VERDICTS: Record<Outcome, Verdict[]> = {
  lost: [{ ok: false, text: "✕ OVERCONFIDENT" }, { ok: true, text: "✓ MATCHED THE OUTCOME" }, { ok: false, text: "✕ WRONG CALL" }],
  won: [{ ok: true, text: "✓ CALLED IT" }, { ok: false, text: "✕ TOO PESSIMISTIC" }, { ok: true, text: "✓ RIGHT CALL" }],
};
const TRUSTED: Record<Outcome, string> = { lost: "Provider B", won: "Provider A" };

// FIRMA v2.0 records (SHA3-512, linked by predecessor_hash).
const ACTOR = "f1a7e0c2-5d3b-4e8a-9c61-2b7d4e9a0f13";
// Someone changes a sealed score after the fact: its recomputed hash no longer matches the next link.
const TAMPER = 1;

// Month end: the story's deal is one of a month's pipeline; every deal is checked the same way and the
// results are gathered into one sealed report. Generic deals, no names or amounts.
export type MonthDeal = { label: string; main: boolean; result: Outcome | "open"; levels: number[]; right: boolean[] | null; seals: number };
export type ProviderLine = { name: string; right: number; total: number; verdict: string; tone: "ok" | "bad" | "mixed" };
export type Month = {
  deals: MonthDeal[]; closed: number; open: number; matched: number; scored: number;
  providers: ProviderLine[]; decisions: string[]; records: number; hash: string;
};
export type StoryData = { scores: Score[]; reality: Reality; decision: Decision; records: ChainRecord[]; tamper: Tamper; month: Month };

export const MONTH_MAIN = 5; // the story's deal sits in the middle row of the month grid
// The rest of the month's closed deals for the "lost" story: [Provider A, Provider B, rep] win likelihoods and the result.
// For the "won" story Provider A and B swap, so the month backs whichever provider called this deal.
const OTHERS: [number[], Outcome | "open"][] = [
  [[0.74, 0.66, 0.8], "won"], [[0.71, 0.22, 0.7], "lost"], [[0.62, 0.31, 0.4], "lost"], [[0.35, 0.72, 0.85], "won"],
  [[0.8, 0.19, 0.75], "lost"], [[0.68, 0.41, 0.6], "won"], [[0.44, 0.26, 0.55], "lost"], [[0.77, 0.58, 0.65], "lost"],
  [[0.58, 0.81, 0.7], "won"], [[0.7, 0.35, 0.8], "won"], [[0.3, 0.62, 0.5], "won"],
];

function chainFor(scores: Score[], outcome: Outcome): ChainRecord[] {
  const drafts = [
    { type: "CR", kind: "Policy", title: "Seal every score as it lands", content: { rule: "snapshot_score_sources" }, token: "" },
    ...scores.map((s, i) => ({ type: "CPR", kind: i === 2 ? "Forecast" : "Score", title: s.label, content: { source: s.kicker, kind: "score" }, token: s.token })),
    { type: "CPR", kind: "Outcome", title: `Outcome: deal ${outcome}`, content: { kind: "outcome", result: outcome }, token: `Deal ${outcome}` },
    { type: "DR", kind: "Decision", title: `Decision: trust ${TRUSTED[outcome]}`, content: { decision: "prefer_source", prefer: TRUSTED[outcome] }, token: "Decision" },
  ];
  let prev: string | null = null;
  return drafts.map((r, k) => {
    const rec: FirmaRecord = {
      firma_id: `00000000-0000-4000-8000-00000000000${k + 1}`, record_type: r.type, version: "2.0.0", actor_id: ACTOR,
      content: r.content, timestamp_utc: `2026-01-01T00:00:0${k}Z`, predecessor_hash: prev,
    };
    rec.record_hash = computeHash(rec);
    prev = rec.record_hash;
    return { ...r, n: k + 1, date: r.kind, hash: short(rec.record_hash), prev: rec.predecessor_hash ? short(rec.predecessor_hash) : "genesis", rec };
  });
}

// The scene keeps references to these objects, so switching the outcome rewrites them in place.
export function createStoryData(outcome: Outcome): StoryData {
  const blank = { ok: true, text: "" };
  const scores: Score[] = [
    { kicker: "Provider A", label: "Provider A score", level: 0.82, color: HIGH, source: "From your CRM", token: "Provider A score", check: blank },
    { kicker: "Provider B", label: "Provider B score", level: 0.28, color: LOW, source: "From a connected tool", token: "Provider B score", check: blank },
    { kicker: "Your team", label: "Your rep's forecast", level: 0.9, color: "#94a0b4", source: "Set by the deal owner", token: "Your rep's forecast", check: blank },
  ];
  const data: StoryData = {
    scores,
    reality: { kicker: "At close", label: "Outcome", note: "Won, lost or slipped, as it really happened", result: outcome },
    decision: { title: "", detail: "Sealed with the evidence it was based on, before the month-end report." },
    records: chainFor(scores, outcome),
    tamper: { index: TAMPER, title: "Provider A score (edited)", hash: "" },
    month: { deals: [], closed: 0, open: 0, matched: 0, scored: 0, providers: [], decisions: [], records: 0, hash: "" },
  };
  applyOutcome(data, outcome);
  return data;
}

export function applyOutcome(d: StoryData, outcome: Outcome) {
  d.scores.forEach((s, i) => { s.check = VERDICTS[outcome][i]; });
  d.reality.result = outcome;
  d.decision.title = `Trust ${TRUSTED[outcome]} on late-stage deals.`;
  chainFor(d.scores, outcome).forEach((r, k) => Object.assign(d.records[k], r));
  const forged = structuredClone(d.records[TAMPER].rec);
  forged.content.edited = true;
  d.tamper.hash = short(computeHash(forged));
  Object.assign(d.month, monthFor(d, outcome));
}

function monthFor(d: StoryData, outcome: Outcome): Month {
  const swap = outcome === "won";
  const others = OTHERS.map(([l, result]) => ({ levels: swap ? [l[1], l[0], l[2]] : l, result }));
  const main = { levels: d.scores.map((s) => s.level), result: outcome as Outcome | "open" };
  const list = [...others.slice(0, MONTH_MAIN), main, ...others.slice(MONTH_MAIN)];
  let n = 0;
  const deals: MonthDeal[] = list.map((x, i) => {
    const isMain = i === MONTH_MAIN;
    const closed = x.result !== "open";
    // a score called it when it leaned the way the deal went
    const right = closed ? x.levels.map((v) => (v >= 0.5) === (x.result === "won")) : null;
    return { label: isMain ? "THIS DEAL" : `DEAL ${String(++n).padStart(2, "0")}`, main: isMain, result: x.result, levels: x.levels, right, seals: closed ? 5 : 4 };
  });
  const closed = deals.filter((x) => x.right);
  const rightOf = (k: number) => closed.filter((x) => x.right![k]).length;
  const trusted = TRUSTED[outcome], other = TRUSTED[outcome === "won" ? "lost" : "won"];
  const names = ["Provider A", "Provider B", "Reps' forecasts"];
  const providers: ProviderLine[] = names.map((name, k) => ({
    name, right: rightOf(k), total: closed.length,
    ...(name === trusted ? { verdict: "TRUST", tone: "ok" as const }
      : name === other ? { verdict: outcome === "won" ? "TOO PESSIMISTIC" : "OVERCONFIDENT", tone: "bad" as const }
      : { verdict: "MIXED", tone: "mixed" as const }),
  }));
  const decisions = [
    `Trust ${trusted} on late-stage deals.`,
    `Treat ${other}'s scores as unconfirmed.`,
    `Ask reps to re-forecast deals ${trusted} flags.`,
  ];
  const matched = providers.reduce((a, p) => a + p.right, 0);
  const records = deals.reduce((a, x) => a + x.seals, 0);
  // the report itself is a FIRMA record, chained after this deal's decision
  const rec: FirmaRecord = {
    firma_id: "00000000-0000-4000-8000-000000000007", record_type: "DR", version: "2.0.0", actor_id: ACTOR,
    content: { kind: "month_end_report", deals: deals.length, closed: closed.length, scores_checked: closed.length * 3, matched, trust: trusted, decisions },
    timestamp_utc: "2026-01-01T00:00:06Z", predecessor_hash: d.records[d.records.length - 1].rec.record_hash ?? null,
  };
  return {
    deals, closed: closed.length, open: deals.length - closed.length, matched, scored: closed.length * 3,
    providers, decisions, records, hash: short(computeHash(rec)),
  };
}

// The story, one step per scene step (1–10): a big headline, what happens, and why it matters.
export const STEPS: [idx: string, headline: string, what: string, why: string][] = [
  ["01 · A score lands", "A score lands. Firma seals it.",
    "A revenue tool or your CRM puts a risk score on the deal. The moment it arrives, Firma takes a snapshot and seals it into a tamper-proof record beside the deal.",
    "Scores get overwritten every night. The sealed copy is what the provider actually said, when it said it."],
  ["01 · Every source", "Every score, from every source.",
    "A second provider scores the same deal and disagrees. Its score is sealed too, and linked to the record before it, so the order can't be changed.",
    "Every opinion stays side by side, not just whichever tool you happened to open last."],
  ["01 · Your team", "Your reps' forecasts too.",
    "The deal owner's own call goes on the record the same way: exactly as it was given, at the time it was given.",
    "Nobody can argue later about what was said, or quietly adjust a forecast after the fact."],
  ["02 · Reality", "Then the deal closes.",
    "Won, lost or slipped: Firma reads the real outcome from your CRM and seals it into the same chain as the scores.",
    "Every score now has a verdict to be measured against, and the verdict is on the record too."],
  ["02 · The check", "Firma checks every score against reality.",
    "Each sealed score is compared with what really happened. Which source called it, which was overconfident, which was only ever a default.",
    "Trust is earned on outcomes, tested on the record, not on a vendor's claims or anyone's memory."],
  ["03 · Decision", "It tells you which score to trust.",
    "Firma makes a clear call from the evidence, such as trusting the provider that called it on late-stage deals, and seals that decision as the next link in the chain.",
    "You act on the number that has been right, and you can show why you chose it."],
  ["03 · Verify", "Anyone can check it.",
    "Each record carries a SHA3-512 hash of its contents and points to the hash of the one before. Recompute them and follow the links back to the first record.",
    "Integrity is a property you verify yourself, not a claim you have to trust."],
  ["03 · Can't be quietly rewritten", "Change a sealed score and the chain shows it.",
    "Edit any record after the fact and its hash changes. The next record still points to the old one, so the link breaks and the seal cracks.",
    "History can't be rewritten in secret, by a vendor, a rep or anyone else."],
  ["04 · The whole month", "Then the whole month.",
    "Zoom out and this deal is one of many. At month end Firma collects every deal that closed, won or lost, to check the month's scores against them.",
    "One deal is an anecdote. A whole month of outcomes is evidence."],
  ["04 · The report", "One report tells you who to trust.",
    "Every closed deal goes into a single month-end report, sealed like everything else. It opens on one clean page: how many scores matched reality, which providers to trust, and the decisions to take.",
    "One place to look, instead of a dozen dashboards that disagree."],
];
