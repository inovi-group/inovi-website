import { Droplets, MessageSquare, Sprout, SunMedium, type LucideIcon } from "lucide-react";

// The scroll story, one step per scene step (1–7): a big headline, what happens, and why it matters.
export const STEPS: [idx: string, headline: string, what: string, why: string][] = [
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
    "35–50% less water, measured in the field, while protecting yield."],
  ["03 · Any phone", "Advice on the phone you already own.",
    "Recommendations arrive as a simple text message: irrigate now, or wait. No app to install, no data plan to afford, no training course.",
    "The families who grow a third of the world's food shouldn't need a data plan to save water."],
  ["03 · Small farms", "Built for one-hectare plots.",
    "Designed with farmers for small plots, family labour and real budgets, then repeated plot by plot across a cooperative.",
    "Not a scaled-down enterprise product. Field-first from day one."],
];

export const STATS = [
  { value: "35–50%", label: "water savings" },
  { value: "No smartphone", label: "required to use it" },
  { value: "Field-first", label: "designed with farmers" },
  { value: "Underground", label: "sensors in the root zone" },
];

export const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: SunMedium, title: "Reads the field, not the cloud dashboard",
    text: "Soil moisture, weather patterns, crop stage: AGRO turns field conditions into one clear answer. Irrigate now, or wait." },
  { icon: MessageSquare, title: "Advice on any phone",
    text: "Recommendations arrive as simple messages on the phones farmers already own. No app to install, no data plan to afford, no training course." },
  { icon: Droplets, title: "Every drop accounted for",
    text: "Water is the most expensive input a smallholder has. AGRO cuts consumption by 35–50% while protecting yield, measured in the field, not the lab." },
  { icon: Sprout, title: "Built for small farms",
    text: "Not a scaled-down enterprise product. AGRO is designed for one-hectare plots, family labour and real budget constraints from day one." },
];
