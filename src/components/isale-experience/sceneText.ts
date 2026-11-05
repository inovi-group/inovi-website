import type { Lang } from "@/i18n";

/**
 * Words the iSale scene draws into its canvas textures (the box, the chain, the month-end report). The scene
 * reads S; createCheck calls setSceneLang(data.lang) before drawing, so /fr/isale/ shows them in French.
 */
const EN = {
  reality: "REALITY",
  dealResult: (r: string) => `Deal ${r}`,
  closed: { won: "✓ CLOSED WON", lost: "✕ CLOSED LOST" },
  stamp: { won: "WON", lost: "LOST" },
  decisionHead: "DECISION · SEALED BY FIRMA",
  hash: "hash", prev: "prev", hashOf: "hash of",
  state: { sealed: "SEALED", verified: "VERIFIED", forged: "EDITED", broken: "LINK BROKEN" },
  register: "tamper-proof register",
  dealSide: "YOUR DEAL SCORES",
  product: "iSale",
  report: "MONTH-END REPORT",
  cover: ["Your month", "end, done", "for you."],
  coverSealed: "Sealed. Ready for audit.",
  coverCount: (deals: number, scored: number) => `${deals} deals · ${scored} scores checked`,
  auditReady: "AUDIT-READY FOR",
  supports: ["Supports your record-keeping and audit", "obligations under"],
  supportsOne: "Supports your record-keeping and audit obligations under",
  summaryHead: "iSale · MONTH-END REPORT",
  summaryTitle: "This month, checked.",
  matched: "scores matched reality",
  openLine: (deals: number, closed: number, open: number) => `${deals} deals · ${closed} closed · ${open} still open`,
  closedLine: (closed: number) => `${closed} deals closed this month, won or lost`,
  reliability: "SOURCE RELIABILITY",
  decisions: "DECISIONS",
  sealedLine: (records: number) => `SEALED · ${records} records + this report`,
  reportHash: (h: string) => `report hash ${h} · FIRMA v2.0`,
};
const FR: typeof EN = {
  reality: "RÉALITÉ",
  dealResult: (r: string) => `Affaire ${({ won: "gagnée", lost: "perdue" } as Record<string, string>)[r] ?? r}`,
  closed: { won: "✓ CLÔTURÉE GAGNÉE", lost: "✕ CLÔTURÉE PERDUE" },
  stamp: { won: "GAGNÉE", lost: "PERDUE" },
  decisionHead: "DÉCISION · SCELLÉE PAR FIRMA",
  hash: "hash", prev: "préc.", hashOf: "hash de",
  state: { sealed: "SCELLÉ", verified: "VÉRIFIÉ", forged: "MODIFIÉ", broken: "LIEN ROMPU" },
  register: "registre infalsifiable",
  dealSide: "LES SCORES DE L’AFFAIRE",
  product: "iSale",
  report: "RAPPORT DE FIN DE MOIS",
  cover: ["Votre clôture", "mensuelle,", "c’est fait."],
  coverSealed: "Scellé. Prêt pour l’audit.",
  coverCount: (deals: number, scored: number) => `${deals} affaires · ${scored} scores vérifiés`,
  auditReady: "PRÊT POUR L’AUDIT",
  supports: ["Vous aide à respecter vos obligations", "de conservation et d’audit :"],
  supportsOne: "Vous aide à respecter vos obligations de conservation et d’audit :",
  summaryHead: "iSale · RAPPORT DE FIN DE MOIS",
  summaryTitle: "Ce mois-ci, vérifié.",
  matched: "scores conformes à la réalité",
  openLine: (deals: number, closed: number, open: number) => `${deals} affaires · ${closed} clôturées · ${open} encore ouvertes`,
  closedLine: (closed: number) => `${closed} affaires clôturées ce mois-ci, gagnées ou perdues`,
  reliability: "FIABILITÉ DES SOURCES",
  decisions: "DÉCISIONS",
  sealedLine: (records: number) => `SCELLÉ · ${records} enregistrements + ce rapport`,
  reportHash: (h: string) => `hash du rapport ${h} · FIRMA v2.0`,
};

export const S: typeof EN = { ...EN };
export function setSceneLang(lang: Lang) { Object.assign(S, lang === "fr" ? FR : EN); }
