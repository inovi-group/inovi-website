import type { Lang } from "@/i18n";

/**
 * The FIRMA page's words, English and French. FIRMA is the platform under iSale and AGRO, not a product of its own:
 * it does data science on the customer's own data (patterns behind good and bad outcomes, strategy checks) and
 * keeps the tamper-proof, verifiable record. Careful wording: analysis proposes, people decide; no performance figures.
 */
const EN = {
  metaTitle: "FIRMA: the platform under iSale and AGRO",
  metaDescription:
    "FIRMA is the platform iSale and AGRO are built on. It analyses data on the customer's own systems to find patterns, checks decisions against rules, and keeps a tamper-proof record anyone can verify (open specification v2.0: SHA3-512 hash chains, Ed25519 signatures, GPL-3.0).",
  stamp: "FIRMA · The platform",
  h1: "The platform under iSale and AGRO.",
  lede:
    "FIRMA is what iSale and AGRO are built on. It looks for patterns in the data they work with, checks what they see against the rules you set, and keeps a tamper-proof record of every reading, signal and decision. The record follows an open specification, so integrity is something you verify rather than take on trust.",
  ctaSpec: "Read the spec",
  ctaDemo: "Live demo",
  facts: [
    ["Specification", "v2.0", "stable, GPL-3.0"],
    ["Hash algorithm", "SHA3-512", "128-character digests"],
    ["Signatures", "Ed25519", "per-record signing"],
    ["Reference validator", "Open source", "Python, public tests"],
  ],
  doesTitle: "What FIRMA does",
  doesLede: "Four jobs, shared by both products.",
  does: [
    ["Finds patterns in your data",
      "Data science on the customer's own systems: which customers tend to go bad, which deals drift from the strategy, which field conditions call for water. The analysis runs on your data, and its findings are suggestions for people to review."],
    ["Checks against your rules",
      "The rules come from you: a sales strategy set by administrators, or irrigation limits for a plot. FIRMA checks what the products see against them and raises what doesn't fit, with the reason."],
    ["Keeps the record",
      "Every reading, score, flag, outcome and decision is sealed as it is written: hashed, signed, timestamped and chained to the record before it. Entries are only ever added."],
    ["Proves it to anyone",
      "Verification needs only the records and the published algorithm. Auditors, partners and funders can check the record themselves with the open validator, without vendor access."],
  ] as [string, string][],
  productsTitle: "Built into both products",
  productsLede: "Each product hands its data to FIRMA and gets back patterns, checks and a record that can be verified later.",
  products: {
    isale: ["Sales on strategy", "iSale", "Finds the patterns behind bad customers and off-strategy deals in your sales history, checks every deal against your strategy, and keeps every flag, outcome and decision on the record.", "Visit iSale"],
    agro: ["Smart irrigation", "AGRO", "Turns soil readings into irrigation decisions, and keeps every reading and dose on the record, so water savings can be proven to partners and funders.", "Visit AGRO"],
  } as Record<"isale" | "agro", [string, string, string, string]>,
  formulaTitle: "One formula, verifiable by anyone",
  formulaLede: "Each record's hash commits to its content, its metadata, and the hash of the record before it (specification §4):",
  properties: [
    ["Append-only by construction", "Each record embeds the hash of its predecessor. Altering any historical record invalidates every later hash, so falsification is detectable by recomputation, without trusting the storage layer."],
    ["Independently verifiable", "Verification requires only the record set and the published algorithm. No proprietary tooling, no vendor account, no network access. The reference validator is open source."],
    ["Storage-agnostic", "The specification defines record structure, canonical serialization and hash computation. It runs on PostgreSQL with write-once triggers today, and is portable to any append-capable store."],
    ["Suggestions, not autopilot", "Patterns FIRMA finds are offered with the evidence behind them. People decide what becomes a rule, and that decision goes on the record too."],
  ] as [string, string][],
  publicTitle: "Everything is public",
  resources: [
    ["Read the specification", "FIRMA v2.0: record types, hash computation, signature scheme, chain verification.", "github.com/inovi-group/firma-spec"],
    ["Try the live demo", "Interactive hash-chain demonstration: create records, tamper with them, watch verification fail.", "Launch demo"],
    ["Run the validators", "Python reference implementation with its test suite. Validate any FIRMA chain yourself.", "View source"],
  ] as [string, string, string][],
  faq: [
    ["What is FIRMA?",
      "FIRMA is INOVI's platform. iSale and AGRO are built on it. It analyses data to find patterns, checks what the products see against rules, and keeps a tamper-proof record that anyone can verify."],
    ["Is FIRMA a product I buy separately?",
      "FIRMA comes inside iSale and AGRO. Its record format is also an open specification under GPL-3.0, with a reference implementation anyone can run. For a technical pilot, get in touch."],
    ["Where does the analysis run?",
      "On the customer's own data and systems. FIRMA looks for patterns there, such as the profile of customers that went bad, and presents them as suggestions with their evidence. People decide what to act on."],
    ["How can someone check the record?",
      "Each record carries a SHA3-512 hash of its content and of the record before it, and an Ed25519 signature. Recomputing the hashes with the open validator shows whether anything was changed, removed or reordered."],
  ] as [string, string][],
  pilotTitle: "Technical pilot",
  pilotText: "We run scoped technical pilots for organisations evaluating FIRMA: a defined dataset, clear acceptance criteria, and full access to the running system.",
  pilotCta: "Discuss a pilot",
  pilotSubject: "FIRMA technical pilot",
};

const FR: typeof EN = {
  metaTitle: "FIRMA : la plateforme d’iSale et d’AGRO",
  metaDescription:
    "FIRMA est la plateforme sur laquelle reposent iSale et AGRO. Elle analyse les données sur les systèmes du client pour y repérer des tendances, confronte les décisions à des règles et tient un registre infalsifiable que chacun peut vérifier (spécification ouverte v2.0 : chaînes de hachage SHA3-512, signatures Ed25519, GPL-3.0).",
  stamp: "FIRMA · La plateforme",
  h1: "La plateforme d’iSale et d’AGRO.",
  lede:
    "FIRMA est le socle d’iSale et d’AGRO. Elle cherche des tendances dans les données qu’ils traitent, confronte ce qu’ils observent aux règles que vous fixez, et tient un registre infalsifiable de chaque relevé, signal et décision. Ce registre suit une spécification ouverte : son intégrité se vérifie, elle ne se croit pas sur parole.",
  ctaSpec: "Lire la spécification",
  ctaDemo: "Démo en ligne",
  facts: [
    ["Spécification", "v2.0", "stable, GPL-3.0"],
    ["Algorithme de hachage", "SHA3-512", "empreintes de 128 caractères"],
    ["Signatures", "Ed25519", "signature de chaque enregistrement"],
    ["Validateur de référence", "Open source", "Python, tests publics"],
  ],
  doesTitle: "Ce que fait FIRMA",
  doesLede: "Quatre missions, communes aux deux produits.",
  does: [
    ["Repérer des tendances dans vos données",
      "De la science des données sur les systèmes du client : quels clients tournent mal, quelles affaires s’écartent de la stratégie, quelles conditions du champ appellent de l’eau. L’analyse porte sur vos données, et ses conclusions sont des suggestions soumises à vos équipes."],
    ["Confronter aux règles que vous fixez",
      "Les règles viennent de vous : une stratégie commerciale définie par les administrateurs, ou des limites d’irrigation pour une parcelle. FIRMA y confronte ce que les produits observent et signale ce qui ne colle pas, motif à l’appui."],
    ["Tenir le registre",
      "Chaque relevé, score, alerte, résultat et décision est scellé dès son écriture : haché, signé, horodaté et chaîné à l’enregistrement précédent. On ne fait jamais qu’ajouter des entrées."],
    ["Le prouver à quiconque",
      "La vérification ne demande que les enregistrements et l’algorithme publié. Auditeurs, partenaires et financeurs contrôlent le registre eux-mêmes avec le validateur ouvert, sans accès fournisseur."],
  ],
  productsTitle: "Intégrée aux deux produits",
  productsLede: "Chaque produit confie ses données à FIRMA et en retire des tendances, des vérifications et un registre vérifiable par la suite.",
  products: {
    isale: ["La vente alignée", "iSale", "Repère dans votre historique de ventes ce qui caractérise les mauvais clients et les affaires hors stratégie, confronte chaque affaire à votre stratégie, et inscrit au registre chaque alerte, résultat et décision.", "Découvrir iSale"],
    agro: ["Irrigation intelligente", "AGRO", "Transforme les relevés du sol en décisions d’irrigation et inscrit au registre chaque relevé et chaque dose : les économies d’eau peuvent être prouvées aux partenaires et aux financeurs.", "Découvrir AGRO"],
  },
  formulaTitle: "Une formule, vérifiable par tous",
  formulaLede: "Le hachage de chaque enregistrement engage son contenu, ses métadonnées et le hachage de l’enregistrement précédent (spécification §4) :",
  properties: [
    ["Ajout seul, par construction", "Chaque enregistrement contient le hachage de son prédécesseur. Modifier un enregistrement passé invalide tous les hachages suivants : la falsification se détecte en recalculant, sans faire confiance au stockage."],
    ["Vérifiable de façon indépendante", "La vérification ne demande que les enregistrements et l’algorithme publié. Pas d’outil propriétaire, pas de compte fournisseur, pas d’accès réseau. Le validateur de référence est open source."],
    ["Indépendant du stockage", "La spécification définit la structure des enregistrements, leur sérialisation canonique et le calcul des hachages. Elle fonctionne aujourd’hui sur PostgreSQL avec des déclencheurs en écriture unique, et se transpose à tout stockage qui permet l’ajout."],
    ["Des suggestions, pas un pilote automatique", "Les tendances repérées par FIRMA sont présentées avec leurs justificatifs. Ce sont vos équipes qui décident de ce qui devient une règle, et cette décision est elle aussi inscrite au registre."],
  ],
  publicTitle: "Tout est public",
  resources: [
    ["Lire la spécification", "FIRMA v2.0 : types d’enregistrements, calcul des hachages, schéma de signature, vérification de la chaîne.", "github.com/inovi-group/firma-spec"],
    ["Essayer la démo en ligne", "Démonstration interactive de chaîne de hachage : créez des enregistrements, falsifiez-les, regardez la vérification échouer.", "Lancer la démo"],
    ["Exécuter les validateurs", "Implémentation de référence en Python avec sa suite de tests. Validez vous-même n’importe quelle chaîne FIRMA.", "Voir le code"],
  ],
  faq: [
    ["Qu’est-ce que FIRMA ?",
      "FIRMA est la plateforme d’INOVI, sur laquelle reposent iSale et AGRO. Elle analyse les données pour y repérer des tendances, confronte ce que les produits observent à des règles, et tient un registre infalsifiable que chacun peut vérifier."],
    ["FIRMA s’achète-t-elle séparément ?",
      "FIRMA est intégrée à iSale et à AGRO. Son format de registre est aussi une spécification ouverte sous licence GPL-3.0, avec une implémentation de référence que chacun peut exécuter. Pour un pilote technique, contactez-nous."],
    ["Où l’analyse a-t-elle lieu ?",
      "Sur les données et les systèmes du client. FIRMA y cherche des tendances, par exemple le profil des clients qui ont mal tourné, et les présente comme des suggestions avec leurs justificatifs. Vos équipes décident de la suite."],
    ["Comment vérifier le registre ?",
      "Chaque enregistrement porte un hachage SHA3-512 de son contenu et de l’enregistrement précédent, ainsi qu’une signature Ed25519. Recalculer les hachages avec le validateur ouvert montre si quoi que ce soit a été modifié, supprimé ou réordonné."],
  ],
  pilotTitle: "Pilote technique",
  pilotText: "Nous menons des pilotes techniques cadrés pour les organisations qui évaluent FIRMA : un jeu de données défini, des critères d’acceptation clairs et un accès complet au système en fonctionnement.",
  pilotCta: "Parler d’un pilote",
  pilotSubject: "Pilote technique FIRMA",
};

export const firmaCopy = (lang: Lang) => (lang === "fr" ? FR : EN);
