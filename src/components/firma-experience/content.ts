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

export type StoryData = { scores: Score[]; reality: Reality; decision: Decision; records: ChainRecord[]; tamper: Tamper };

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
    decision: { title: "", detail: "In your month-end report, with the evidence it was based on." },
    records: chainFor(scores, outcome),
    tamper: { index: TAMPER, title: "Provider A score (edited)", hash: "" },
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
}

// The story, one step per scene step (1–8): a big headline, what happens, and why it matters.
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
  ["02 · Month end", "Firma checks every score against reality.",
    "Each sealed score is compared with what really happened. Which source called it, which was overconfident, which was only ever a default.",
    "Trust is earned on outcomes, tested on the record, not on a vendor's claims or anyone's memory."],
  ["03 · Decisions", "It tells you which scores to trust.",
    "Your month-end report makes a clear call, such as trusting one provider on late-stage deals, with the evidence behind it. The decision is sealed as the next link.",
    "You act on the number that has been right, and you can show why you chose it."],
  ["03 · Verify", "Anyone can check it.",
    "Each record carries a SHA3-512 hash of its contents and points to the hash of the one before. Recompute them and follow the links back to the first record.",
    "Integrity is a property you verify yourself, not a claim you have to trust."],
  ["Can't be quietly rewritten", "Change a sealed score and the chain shows it.",
    "Edit any record after the fact and its hash changes. The next record still points to the old one, so the link breaks and the seal cracks.",
    "History can't be rewritten in secret, by a vendor, a rep or anyone else."],
];
