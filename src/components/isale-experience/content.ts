import { computeHash, short, type FirmaRecord } from "./chain";

import type { Lang } from "@/i18n";

// The mechanism, in general terms: no vendors, deals, numbers or dates on screen.
// Scores are win likelihoods. The story can end either way (?outcome=lost|won, or the review toggle):
// the outcome decides which scores called it, what iSale recommends and what is sealed. Every label the scene
// draws comes from L[lang] below, so the French page shows French in the 3D scene too.
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
// "Fournisseur B" → "fournisseur B" inside a French sentence
const lc = (p: string) => p[0].toLowerCase() + p.slice(1);
const L = {
  en: {
    verdicts: {
      lost: [{ ok: false, text: "✕ OVERCONFIDENT" }, { ok: true, text: "✓ MATCHED THE OUTCOME" }, { ok: false, text: "✕ WRONG CALL" }],
      won: [{ ok: true, text: "✓ CALLED IT" }, { ok: false, text: "✕ TOO PESSIMISTIC" }, { ok: true, text: "✓ RIGHT CALL" }],
    } as Record<Outcome, Verdict[]>,
    providers: ["Provider A", "Provider B", "Reps' forecasts"],
    scores: [
      ["Provider A", "Provider A score", "From your CRM"],
      ["Provider B", "Provider B score", "From a connected tool"],
      ["Your team", "Your rep's forecast", "Set by the deal owner"],
    ],
    reality: ["At close", "Outcome", "Won, lost or slipped, as it really happened"],
    detail: "Sealed with the evidence it was based on, before the month-end report.",
    tamper: "Provider A score (edited)",
    kinds: { strategy: "Strategy", score: "Score", forecast: "Forecast", outcome: "Outcome", decision: "Decision" },
    strategy: "Strategy set by your admins",
    result: { won: "won", lost: "lost" } as Record<Outcome, string>,
    outcomeTitle: (r: string) => `Outcome: deal ${r}`,
    outcomeToken: (r: string) => `Deal ${r}`,
    decisionTitle: (p: string) => `Decision: rely on ${p}`,
    decisionToken: "Decision",
    rely: (p: string) => `Rely on ${p} for late-stage deals.`,
    drift: (p: string) => `Drift alert: review ${p}'s model.`,
    rule: "Suggested rule: check new customers that look like this month's lost deals.",
    verdictOk: "RELIABLE", verdictMixed: "MIXED", verdictBad: { won: "TOO PESSIMISTIC", lost: "OVERCONFIDENT" } as Record<Outcome, string>,
    thisDeal: "THIS DEAL", deal: (n: string) => `DEAL ${n}`,
  },
  fr: {
    verdicts: {
      lost: [{ ok: false, text: "✕ TROP OPTIMISTE" }, { ok: true, text: "✓ CONFORME AU RÉSULTAT" }, { ok: false, text: "✕ MAUVAISE PRÉVISION" }],
      won: [{ ok: true, text: "✓ BIEN VU" }, { ok: false, text: "✕ TROP PESSIMISTE" }, { ok: true, text: "✓ BONNE PRÉVISION" }],
    } as Record<Outcome, Verdict[]>,
    providers: ["Fournisseur A", "Fournisseur B", "Prévisions des commerciaux"],
    scores: [
      ["Fournisseur A", "Score du fournisseur A", "Depuis votre CRM"],
      ["Fournisseur B", "Score du fournisseur B", "Depuis un outil connecté"],
      ["Votre équipe", "Prévision du commercial", "Fixée par le responsable de l’affaire"],
    ],
    reality: ["À la clôture", "Résultat", "Gagnée, perdue ou repoussée : ce qui s’est réellement passé"],
    detail: "Scellée avec les éléments sur lesquels elle repose, avant le rapport de fin de mois.",
    tamper: "Score du fournisseur A (modifié)",
    kinds: { strategy: "Stratégie", score: "Score", forecast: "Prévision", outcome: "Résultat", decision: "Décision" },
    strategy: "Stratégie fixée par vos administrateurs",
    result: { won: "gagnée", lost: "perdue" } as Record<Outcome, string>,
    outcomeTitle: (r: string) => `Résultat : affaire ${r}`,
    outcomeToken: (r: string) => `Affaire ${r}`,
    decisionTitle: (p: string) => `Décision : s’appuyer sur le ${lc(p)}`,
    decisionToken: "Décision",
    rely: (p: string) => `S’appuyer sur le ${lc(p)} pour les affaires en phase finale.`,
    drift: (p: string) => `Alerte de dérive : revoir le modèle du ${lc(p)}.`,
    rule: "Règle suggérée : vérifier les nouveaux clients qui ressemblent aux affaires perdues ce mois-ci.",
    verdictOk: "FIABLE", verdictMixed: "MITIGÉ", verdictBad: { won: "TROP PESSIMISTE", lost: "TROP OPTIMISTE" } as Record<Outcome, string>,
    thisDeal: "CETTE AFFAIRE", deal: (n: string) => `AFFAIRE ${n}`,
  },
};
type Labels = (typeof L)["en"];
// which provider called the deal (index into providers): Provider B for a loss, Provider A for a win
const TRUSTED: Record<Outcome, number> = { lost: 1, won: 0 };

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
export type StoryData = { lang: Lang; scores: Score[]; reality: Reality; decision: Decision; records: ChainRecord[]; tamper: Tamper; month: Month };

export const MONTH_MAIN = 5; // the story's deal sits in the middle row of the month grid
// The rest of the month's closed deals for the "lost" story: [Provider A, Provider B, rep] win likelihoods and the result.
// For the "won" story Provider A and B swap, so the month backs whichever provider called this deal.
const OTHERS: [number[], Outcome | "open"][] = [
  [[0.74, 0.66, 0.8], "won"], [[0.71, 0.22, 0.7], "lost"], [[0.62, 0.31, 0.4], "lost"], [[0.35, 0.72, 0.85], "won"],
  [[0.8, 0.19, 0.75], "lost"], [[0.68, 0.41, 0.6], "won"], [[0.44, 0.26, 0.55], "lost"], [[0.77, 0.58, 0.65], "lost"],
  [[0.58, 0.81, 0.7], "won"], [[0.7, 0.35, 0.8], "won"], [[0.3, 0.62, 0.5], "won"],
];

function chainFor(scores: Score[], outcome: Outcome, t: Labels): ChainRecord[] {
  const trusted = t.providers[TRUSTED[outcome]], r = t.result[outcome];
  const drafts = [
    { type: "CR", kind: t.kinds.strategy, title: t.strategy, content: { rule: "global_sales_strategy" }, token: "" },
    ...scores.map((s, i) => ({ type: "CPR", kind: i === 2 ? t.kinds.forecast : t.kinds.score, title: s.label, content: { source: s.kicker, kind: "score" }, token: s.token })),
    { type: "CPR", kind: t.kinds.outcome, title: t.outcomeTitle(r), content: { kind: "outcome", result: outcome }, token: t.outcomeToken(r) },
    { type: "DR", kind: t.kinds.decision, title: t.decisionTitle(trusted), content: { decision: "prefer_source", prefer: trusted }, token: t.decisionToken },
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
export function createStoryData(outcome: Outcome, lang: Lang = "en"): StoryData {
  const blank = { ok: true, text: "" }, t = L[lang];
  const levels = [[0.82, HIGH], [0.28, LOW], [0.9, "#94a0b4"]] as const;
  const scores: Score[] = t.scores.map(([kicker, label, source], i) => ({ kicker, label, level: levels[i][0], color: levels[i][1], source, token: label, check: blank }));
  const [rk, rl, rn] = t.reality;
  const data: StoryData = {
    lang,
    scores,
    reality: { kicker: rk, label: rl, note: rn, result: outcome },
    decision: { title: "", detail: t.detail },
    records: chainFor(scores, outcome, t),
    tamper: { index: TAMPER, title: t.tamper, hash: "" },
    month: { deals: [], closed: 0, open: 0, matched: 0, scored: 0, providers: [], decisions: [], records: 0, hash: "" },
  };
  applyOutcome(data, outcome);
  return data;
}

export function applyOutcome(d: StoryData, outcome: Outcome) {
  const t = L[d.lang];
  d.scores.forEach((s, i) => { s.check = t.verdicts[outcome][i]; });
  d.reality.result = outcome;
  d.decision.title = t.rely(t.providers[TRUSTED[outcome]]);
  chainFor(d.scores, outcome, t).forEach((r, k) => Object.assign(d.records[k], r));
  const forged = structuredClone(d.records[TAMPER].rec);
  forged.content.edited = true;
  d.tamper.hash = short(computeHash(forged));
  Object.assign(d.month, monthFor(d, outcome));
}

function monthFor(d: StoryData, outcome: Outcome): Month {
  const t = L[d.lang];
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
    return { label: isMain ? t.thisDeal : t.deal(String(++n).padStart(2, "0")), main: isMain, result: x.result, levels: x.levels, right, seals: closed ? 5 : 4 };
  });
  const closed = deals.filter((x) => x.right);
  const rightOf = (k: number) => closed.filter((x) => x.right![k]).length;
  const ti = TRUSTED[outcome], oi = TRUSTED[outcome === "won" ? "lost" : "won"];
  const providers: ProviderLine[] = t.providers.map((name, k) => ({
    name, right: rightOf(k), total: closed.length,
    ...(k === ti ? { verdict: t.verdictOk, tone: "ok" as const }
      : k === oi ? { verdict: t.verdictBad[outcome], tone: "bad" as const }
      : { verdict: t.verdictMixed, tone: "mixed" as const }),
  }));
  // the third one is iSale's own suggestion from the month's patterns: a strategy rule for the admins to approve
  const decisions = [t.rely(t.providers[ti]), t.drift(t.providers[oi]), t.rule];
  const matched = providers.reduce((a, p) => a + p.right, 0);
  const records = deals.reduce((a, x) => a + x.seals, 0);
  // the report itself is a FIRMA record, chained after this deal's decision
  const rec: FirmaRecord = {
    firma_id: "00000000-0000-4000-8000-000000000007", record_type: "DR", version: "2.0.0", actor_id: ACTOR,
    content: { kind: "month_end_report", deals: deals.length, closed: closed.length, scores_checked: closed.length * 3, matched, trust: t.providers[ti], decisions },
    timestamp_utc: "2026-01-01T00:00:06Z", predecessor_hash: d.records[d.records.length - 1].rec.record_hash ?? null,
  };
  return {
    deals, closed: closed.length, open: deals.length - closed.length, matched, scored: closed.length * 3,
    providers, decisions, records, hash: short(computeHash(rec)),
  };
}

