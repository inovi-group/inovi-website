import { FileCheck2, Lock, Scale, ShieldCheck, Sprout, type LucideIcon } from "lucide-react";
import type { Lang } from "@/i18n";

/** The home page's words, English and French. Two products, iSale and AGRO, both built on FIRMA. No performance figures. */
type Card = { key: "isale" | "agro"; name: string; tagline: string; description: string; icon: LucideIcon; tone: "isale" | "agro"; cta: string };

const EN = {
  metaTitle: "INOVI Group: iSale and AGRO, built on FIRMA",
  metaDescription:
    "INOVI Group builds two products on one platform: iSale keeps sales teams on strategy and AGRO doses irrigation from the root zone. Both are built on FIRMA, for data analysis and tamper-proof, verifiable records. London, UK.",
  stamp: "Verifiable AI · London, UK",
  h1: ["Two products. One platform you can ", "verify."],
  lede:
    "iSale keeps sales teams aligned with your strategy. AGRO doses irrigation from what the roots need. Both are built on FIRMA, our platform for finding patterns in your data and keeping a tamper-proof record of every decision.",
  ctaPrimary: "See iSale",
  ctaDemo: "Try the FIRMA demo",
  ring: { isale: ["iSale", "Sales on strategy"], agro: ["AGRO", "Smart irrigation"] } as Record<"isale" | "agro", [string, string]>,
  carousel: "carousel", ringLabel: "INOVI products", choose: "Choose a product",
  open: (n: string) => `Open ${n}`, bring: (n: string) => `Bring ${n} to the front`, explore: (n: string) => `Explore ${n}`,
  builtOn: "The platform under both",
  proofsLabel: "Proof points",
  proofs: [
    ["Open specification", "FIRMA v2.0", "published under GPL-3.0"],
    ["Reference implementation", "Open validators", "Python, public test suite"],
    ["Working prototype", "End-to-end", "a traced AI pipeline, live"],
    ["Company", "London, UK", "INOVI Group Ltd"],
  ],
  productsIdx: "The products",
  productsTitle: "Two products. Built on FIRMA.",
  productsLede: "Each product stands on its own, and both run on the same platform: FIRMA analyses their data and keeps the verifiable record of what they see and decide.",
  cards: [
    { key: "isale", name: "iSale", tagline: "Sales on strategy", icon: FileCheck2, tone: "isale", cta: "See how it works",
      description: "Holds every deal to your strategy, warns before a likely bad customer is taken on, flags off-strategy deals before they close, and writes the reports." },
    { key: "agro", name: "AGRO", tagline: "Smart irrigation", icon: Sprout, tone: "agro", cta: "See how it works",
      description: "Underground sensors in the root zone decide when and how much to irrigate, with advice on any phone." },
  ] as Card[],
  platformLine: ["FIRMA", "The platform under both: data analysis and a tamper-proof record.", "How it works"],
  layer: "Both products write what they see and decide to FIRMA: iSale its customer checks, deal flags and decisions, AGRO its readings and doses.",
  whyTitle: "Why verifiability matters now",
  principles: [
    { icon: ShieldCheck, title: "Verifiable by design",
      text: "Every decision our systems record is hashed, signed and chained. Tampering is detectable by anyone who recomputes the chain, by construction rather than by policy." },
    { icon: Lock, title: "Proof before promise",
      text: "We publish our specification in the open and ship reference implementations. We'd rather show how something works than make claims about it." },
    { icon: Scale, title: "Built for accountability",
      text: "As AI takes part in decisions with real consequences, businesses and regulators need to see what happened, and know it hasn't been rewritten." },
  ] as { icon: LucideIcon; title: string; text: string }[],
  endTitle: "Want to see it on your own data?",
  endText: "We work with commercial teams, agritech partners and technical programmes. Try the live demo or get in touch.",
  endDemo: "Launch the live demo",
  endContact: "Get in touch",
};

const FR: typeof EN = {
  metaTitle: "INOVI Group : iSale et AGRO, construits sur FIRMA",
  metaDescription:
    "INOVI Group conçoit deux produits sur une même plateforme : iSale aligne les équipes commerciales sur la stratégie, AGRO dose l’irrigation au niveau des racines. Tous deux reposent sur FIRMA, pour l’analyse des données et un registre infalsifiable et vérifiable. Londres, Royaume-Uni.",
  stamp: "IA vérifiable · Londres, Royaume-Uni",
  h1: ["Deux produits. Une plateforme que vous pouvez ", "vérifier."],
  lede:
    "iSale aligne vos équipes commerciales sur votre stratégie. AGRO dose l’irrigation selon les besoins réels des racines. Tous deux sont construits sur FIRMA, notre plateforme qui repère les tendances dans vos données et tient un registre infalsifiable de chaque décision.",
  ctaPrimary: "Découvrir iSale",
  ctaDemo: "Essayer la démo FIRMA",
  ring: { isale: ["iSale", "La vente alignée"], agro: ["AGRO", "Irrigation intelligente"] },
  carousel: "carrousel", ringLabel: "Produits INOVI", choose: "Choisir un produit",
  open: (n: string) => `Ouvrir ${n}`, bring: (n: string) => `Mettre ${n} au premier plan`, explore: (n: string) => `Découvrir ${n}`,
  builtOn: "La plateforme des deux",
  proofsLabel: "Éléments de preuve",
  proofs: [
    ["Spécification ouverte", "FIRMA v2.0", "publiée sous licence GPL-3.0"],
    ["Implémentation de référence", "Validateurs ouverts", "Python, tests publics"],
    ["Prototype opérationnel", "De bout en bout", "une chaîne d’IA tracée, en ligne"],
    ["Société", "Londres", "INOVI Group Ltd"],
  ],
  productsIdx: "Les produits",
  productsTitle: "Deux produits. Construits sur FIRMA.",
  productsLede: "Chaque produit a sa propre utilité, et tous deux reposent sur la même plateforme : FIRMA analyse leurs données et tient le registre vérifiable de ce qu’ils observent et décident.",
  cards: [
    { key: "isale", name: "iSale", tagline: "La vente alignée", icon: FileCheck2, tone: "isale", cta: "Voir comment ça marche",
      description: "Confronte chaque affaire à votre stratégie, prévient avant l’engagement avec un client probablement à risque, signale avant la clôture les affaires hors stratégie et rédige les rapports." },
    { key: "agro", name: "AGRO", tagline: "Irrigation intelligente", icon: Sprout, tone: "agro", cta: "Voir comment ça marche",
      description: "Des capteurs enterrés dans la zone racinaire décident quand et combien irriguer, avec des conseils sur n’importe quel téléphone." },
  ],
  platformLine: ["FIRMA", "La plateforme des deux : analyse des données et registre infalsifiable.", "Comment ça marche"],
  layer: "Les deux produits inscrivent dans FIRMA ce qu’ils observent et décident : iSale ses vérifications de clients, ses alertes et ses décisions, AGRO ses relevés et ses doses d’irrigation.",
  whyTitle: "Pourquoi la vérifiabilité compte aujourd’hui",
  principles: [
    { icon: ShieldCheck, title: "Vérifiable par conception",
      text: "Chaque décision enregistrée par nos systèmes est hachée, signée et chaînée. Toute falsification est détectable par quiconque recalcule la chaîne : c’est la construction qui le garantit, pas une règle interne." },
    { icon: Lock, title: "La preuve avant la promesse",
      text: "Nous publions notre spécification en accès libre et livrons des implémentations de référence. Nous préférons montrer comment les choses fonctionnent plutôt que d’affirmer." },
    { icon: Scale, title: "Conçu pour rendre des comptes",
      text: "À mesure que l’IA participe à des décisions aux conséquences réelles, entreprises et régulateurs doivent pouvoir constater ce qui s’est passé, et savoir que rien n’a été réécrit." },
  ],
  endTitle: "Envie de le voir sur vos propres données ?",
  endText: "Nous travaillons avec des équipes commerciales, des partenaires agritech et des programmes techniques. Essayez la démo en ligne ou contactez-nous.",
  endDemo: "Lancer la démo en ligne",
  endContact: "Nous contacter",
};

export const homeCopy = (lang: Lang) => (lang === "fr" ? FR : EN);
