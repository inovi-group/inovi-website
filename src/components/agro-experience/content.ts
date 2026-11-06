import { Droplets, MessageSquare, Sprout, SunMedium, type LucideIcon } from "lucide-react";
import type { Lang } from "@/i18n";

export type Step = [idx: string, headline: string, what: string, why: string];

/**
 * The Agro page's words, English and French. STEPS has one entry per scene step (1–7): a big headline, what
 * happens, and why it matters. No performance figures (water savings are described, not quantified).
 */
const EN = {
  metaTitle: "AGRO: smart irrigation for smallholder farmers",
  metaDescription:
    "AGRO's underground sensors read soil moisture in the root zone and dose irrigation to match, with advice on any phone and no smartphone required. Built on FIRMA.",
  stamp: "AGRO · Smart irrigation",
  h1: ["Smart irrigation for the farmers the industry ", "forgot."],
  lede:
    "AGRO's sensors live underground, in the root zone. They read what's happening under the soil and dose exactly the water the crop needs, with advice on any phone. Because the families who grow so much of the world's food shouldn't need a data plan to save water.",
  cta: "Partner on a pilot", ctaEnd: "Start the conversation", mailSubject: "AGRO pilot partnership",
  scrollCue: "Scroll: under the surface",
  steps: [
    ["01 · Under the surface", "Sensors that live in the soil.",
      "AGRO's probes sit underground among the roots, at the depths that matter. They measure moisture where the crop actually drinks, not at the surface.",
      "What you see on top tells you little. The roots know whether the field needs water."],
    ["01 · Reading the field", "They read what you can't see.",
      "Every few minutes each sensor reports how wet the soil is at its depth. Together they map the water under the field, layer by layer.",
      "Soil moisture, weather, crop stage: AGRO turns field conditions into one clear answer."],
    ["02 · Before stress", "Dry roots, caught early.",
      "As the root zone dries out, the sensors at root depth see it first, well before the leaves show any stress.",
      "Watering on a fixed schedule wastes water. Waiting for wilting costs yield."],
    ["02 · The right dose", "Water, dosed where it's needed.",
      "AGRO opens the valve and doses water through the drip line. The sensors follow the wetting front as it moves down through the soil.",
      "Every drop accounted for: the water goes to the roots, not into the air."],
    ["02 · It stops in time", "It stops when the roots have enough.",
      "When the front reaches the bottom of the root zone, AGRO closes the valve. The deep sensor stays dry, so nothing drains away below the roots.",
      "Less water, measured in the field, while protecting yield."],
    ["03 · Any phone", "Advice on the phone you already own.",
      "Recommendations arrive as a simple text message: irrigate now, or wait. No app to install, no data plan to afford, no training course.",
      "The families who grow so much of the world's food shouldn't need a data plan to save water."],
    ["03 · Small farms", "Built for small plots.",
      "Designed with farmers for small plots, family labour and real budgets, then repeated plot by plot across a cooperative.",
      "Not a scaled-down enterprise product. Field-first from day one."],
  ] as Step[],
  stats: [
    ["Less water", "dosed to what the roots need"],
    ["No smartphone", "required to use it"],
    ["Field-first", "designed with farmers"],
    ["Underground", "sensors in the root zone"],
  ] as [string, string][],
  featIdx: "04 · Why it works",
  featTitle: "Technology that meets farmers where they are.",
  featLede: "Most agritech assumes a smartphone, a stable connection, and time to learn a dashboard. AGRO assumes none of that.",
  features: [
    ["Reads the field, not the cloud dashboard", "Soil moisture, weather patterns, crop stage: AGRO turns field conditions into one clear answer. Irrigate now, or wait."],
    ["Advice on any phone", "Recommendations arrive as simple messages on the phones farmers already own. No app to install, no data plan to afford, no training course."],
    ["Every drop accounted for", "Water is the most expensive input a smallholder has. AGRO cuts consumption while protecting yield, measured in the field, not the lab."],
    ["Built for small farms", "Not a scaled-down enterprise product. AGRO is designed for small plots, family labour and real budget constraints from day one."],
  ] as [string, string][],
  layer: "Every sensor reading, irrigation decision and dose AGRO makes is written to FIRMA, so water savings can be proven to partners, cooperatives and funders.",
  endIdx: "AGRO · Smart irrigation",
  endTitle: "Working on water, food security, or climate resilience?",
  endText: "We partner with agritech organisations, cooperatives and impact programmes to bring AGRO to the field. Pilots are designed around real farms and measured on real outcomes.",
  faq: [
    ["What is AGRO?",
      "AGRO is INOVI's smart irrigation product for small farms. Sensors buried in the root zone measure soil moisture, and AGRO tells the farmer when to irrigate and how much, or doses the water itself through a drip line."],
    ["Does a farmer need a smartphone?",
      "No. Advice arrives as a simple text message on any phone. There is no app to install and no data plan needed."],
    ["Why measure underground?",
      "The crop drinks at root depth. Measuring there shows when the roots are drying out before the leaves show stress, and when the water has gone deep enough to stop."],
    ["What is FIRMA's role in AGRO?",
      "AGRO is built on FIRMA. Every reading, irrigation decision and dose is written to FIRMA's tamper-proof record, so results can be shown to partners and funders."],
  ] as [string, string][],
  scene: { rootZone: "ROOT ZONE", sms: "SMS · 05:40", lines: ["Plot 2: roots dry", "at 30 cm.", "", "Irrigate 25 min", "after 5 pm.", "", "Deep soil is wet:", "no extra water."] },
};

const FR: typeof EN = {
  metaTitle: "AGRO : l’irrigation intelligente pour les petits exploitants",
  metaDescription:
    "Les capteurs enterrés d’AGRO mesurent l’humidité du sol dans la zone racinaire et dosent l’irrigation en conséquence, avec des conseils sur n’importe quel téléphone, sans smartphone. Construit sur FIRMA.",
  stamp: "AGRO · Irrigation intelligente",
  h1: ["L’irrigation intelligente pour les agriculteurs que l’industrie a ", "oubliés."],
  lede:
    "Les capteurs d’AGRO vivent sous terre, dans la zone racinaire. Ils mesurent ce qui se passe sous la surface et dosent exactement l’eau dont la culture a besoin, avec des conseils sur n’importe quel téléphone. Parce que les familles qui produisent une si grande part de la nourriture mondiale ne devraient pas avoir besoin d’un forfait data pour économiser l’eau.",
  cta: "Monter un pilote ensemble", ctaEnd: "Engager la conversation", mailSubject: "Partenariat pilote AGRO",
  scrollCue: "Faites défiler : sous la surface",
  steps: [
    ["01 · Sous la surface", "Des capteurs qui vivent dans le sol.",
      "Les sondes d’AGRO sont enterrées parmi les racines, aux profondeurs qui comptent. Elles mesurent l’humidité là où la culture boit vraiment, pas en surface.",
      "Ce que l’on voit en surface en dit peu. Ce sont les racines qui savent si le champ a besoin d’eau."],
    ["01 · Lire le champ", "Ils voient ce que vous ne voyez pas.",
      "Toutes les quelques minutes, chaque capteur indique l’humidité du sol à sa profondeur. Ensemble, ils cartographient l’eau sous le champ, couche par couche.",
      "Humidité du sol, météo, stade de la culture : AGRO transforme les conditions du champ en une réponse claire."],
    ["02 · Avant le stress", "Des racines sèches, repérées tôt.",
      "Quand la zone racinaire s’assèche, les capteurs placés à la profondeur des racines le voient en premier, bien avant que les feuilles ne montrent le moindre stress.",
      "Arroser à heure fixe gaspille l’eau. Attendre le flétrissement coûte du rendement."],
    ["02 · La juste dose", "L’eau, dosée là où il faut.",
      "AGRO ouvre la vanne et dose l’eau par la ligne de goutte-à-goutte. Les capteurs suivent le front d’humidité qui descend dans le sol.",
      "Chaque goutte compte : l’eau va aux racines, pas dans l’air."],
    ["02 · Il s’arrête à temps", "Il s’arrête quand les racines en ont assez.",
      "Quand le front atteint le bas de la zone racinaire, AGRO ferme la vanne. Le capteur profond reste sec : rien ne se perd sous les racines.",
      "Moins d’eau, mesurée au champ, sans sacrifier le rendement."],
    ["03 · N’importe quel téléphone", "Des conseils sur le téléphone que vous avez déjà.",
      "Les recommandations arrivent par simple SMS : irriguer maintenant, ou attendre. Pas d’application à installer, pas de forfait data à payer, pas de formation.",
      "Les familles qui produisent une si grande part de la nourriture mondiale ne devraient pas avoir besoin d’un forfait data pour économiser l’eau."],
    ["03 · Petites exploitations", "Conçu pour les petites parcelles.",
      "Conçu avec les agriculteurs pour de petites parcelles, une main-d’œuvre familiale et des budgets réels, puis déployé parcelle après parcelle au sein d’une coopérative.",
      "Pas une version allégée d’un produit pour grandes entreprises. Pensé pour le terrain dès le premier jour."],
  ],
  stats: [
    ["Moins d’eau", "dosée selon les besoins des racines"],
    ["Sans smartphone", "pour l’utiliser"],
    ["Terrain d’abord", "conçu avec les agriculteurs"],
    ["Sous terre", "capteurs dans la zone racinaire"],
  ],
  featIdx: "04 · Pourquoi ça marche",
  featTitle: "Une technologie qui va à la rencontre des agriculteurs.",
  featLede: "La plupart des solutions agritech supposent un smartphone, une connexion stable et du temps pour apprendre un tableau de bord. AGRO ne suppose rien de tout cela.",
  features: [
    ["Il lit le champ, pas un tableau de bord", "Humidité du sol, météo, stade de la culture : AGRO transforme les conditions du champ en une réponse claire. Irriguer maintenant, ou attendre."],
    ["Des conseils sur n’importe quel téléphone", "Les recommandations arrivent par simple message sur les téléphones que les agriculteurs possèdent déjà. Pas d’application, pas de forfait data, pas de formation."],
    ["Chaque goutte compte", "L’eau est l’intrant le plus coûteux pour un petit exploitant. AGRO réduit la consommation sans sacrifier le rendement, mesuré au champ, pas en laboratoire."],
    ["Conçu pour les petites exploitations", "Pas une version allégée d’un produit pour grandes entreprises. AGRO est pensé dès le départ pour de petites parcelles, une main-d’œuvre familiale et des budgets serrés."],
  ],
  layer: "Chaque relevé de capteur, chaque décision d’irrigation et chaque dose d’AGRO est inscrit dans FIRMA : les économies d’eau peuvent être prouvées aux partenaires, aux coopératives et aux financeurs.",
  endIdx: "AGRO · Irrigation intelligente",
  endTitle: "Vous travaillez sur l’eau, la sécurité alimentaire ou la résilience climatique ?",
  endText: "Nous nous associons à des acteurs de l’agritech, des coopératives et des programmes à impact pour amener AGRO sur le terrain. Les pilotes sont conçus autour de vraies exploitations et évalués sur des résultats réels.",
  faq: [
    ["Qu’est-ce qu’AGRO ?",
      "AGRO est le produit d’irrigation intelligente d’INOVI pour les petites exploitations. Des capteurs enterrés dans la zone racinaire mesurent l’humidité du sol, et AGRO indique à l’agriculteur quand irriguer et combien, ou dose lui-même l’eau par goutte-à-goutte."],
    ["Faut-il un smartphone ?",
      "Non. Les conseils arrivent par simple SMS, sur n’importe quel téléphone. Aucune application à installer, aucun forfait data nécessaire."],
    ["Pourquoi mesurer sous terre ?",
      "La culture boit à la profondeur des racines. Mesurer à cet endroit montre quand les racines s’assèchent, avant que les feuilles ne souffrent, et quand l’eau est descendue assez profond pour arrêter."],
    ["Quel est le rôle de FIRMA dans AGRO ?",
      "AGRO est construit sur FIRMA. Chaque relevé, chaque décision d’irrigation et chaque dose est inscrit dans le registre infalsifiable de FIRMA : les résultats peuvent être présentés aux partenaires et aux financeurs."],
  ],
  scene: { rootZone: "ZONE RACINAIRE", sms: "SMS · 05:40", lines: ["Parcelle 2 :", "racines sèches.", "", "Arroser 25 min", "après 17 h.", "", "Sol profond", "humide : stop."] },
};

export const agroCopy = (lang: Lang) => (lang === "fr" ? FR : EN);
export const STEP_COUNT = 7;
export const FEATURE_ICONS: LucideIcon[] = [SunMedium, MessageSquare, Droplets, Sprout];

/** What the soil scene draws into its canvases; AgroExperience sets it for the page's language before the scene mounts. */
export const AGRO_SCENE_TEXT = { ...EN.scene };
export const setAgroSceneLang = (lang: Lang) => Object.assign(AGRO_SCENE_TEXT, agroCopy(lang).scene);
