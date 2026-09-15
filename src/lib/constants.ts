/**
 * CURX Core Constants and Configuration
 */

export const FRAME_CONFIG = {
  // Directory where the 240 frames are located
  dir: "/curx/hero",
  prefix: "frame-",
  ext: ".jpg",
  totalFrames: 240,
  // Alternative fallback path format
  fallbackDir: "/frames",
  fallbackPrefix: "ezgif-frame-",
};

export interface HeroStage {
  id: number;
  name: string;
  eyebrow: string;
  headlineMain: string;
  headlineHighlight: string;
  description: string;
  activeNodes: string[];
  range: [number, number]; // frame range [start, end]
}

export const HERO_STAGES: HeroStage[] = [
  {
    id: 1,
    name: "01 // SEED CORE",
    eyebrow: "CURX / INTELLIGENCE ENGINE",
    headlineMain: "SEE THE",
    headlineHighlight: "WHOLE PICTURE.",
    description:
      "Medication intelligence that connects symptoms, genetics, medications, and evidence into a traceable understanding of risk.",
    activeNodes: [],
    range: [1, 48],
  },
  {
    id: 2,
    name: "02 // GENOMICS",
    eyebrow: "STAGE 01 // GENOMICS LAYER",
    headlineMain: "GENOMIC",
    headlineHighlight: "VARIANTS INGESTED.",
    description:
      "Mapping CYP2D6, CYP2C19, and HLA alleles against clinical pharmacology databases with deterministic precision.",
    activeNodes: ["GENETICS"],
    range: [49, 96],
  },
  {
    id: 3,
    name: "03 // PHARMACOLOGY",
    eyebrow: "STAGE 02 // MEDICATION GRAPH",
    headlineMain: "ACTIVE DRUGS &",
    headlineHighlight: "METABOLIC PATHS.",
    description:
      "Cross-referencing metabolic inhibition, prodrug activation pathways, and multi-regimen pharmacokinetic burdens.",
    activeNodes: ["GENETICS", "MEDICATIONS"],
    range: [97, 144],
  },
  {
    id: 4,
    name: "04 // PHENOTYPIC",
    eyebrow: "STAGE 03 // SYMPTOMS & CONDITIONS",
    headlineMain: "PHENOTYPES &",
    headlineHighlight: "CLINICAL SIGNALS.",
    description:
      "Correlating patient-reported adverse reactions with biochemical cascades and established disease contraindications.",
    activeNodes: ["GENETICS", "MEDICATIONS", "SYMPTOMS", "CONDITIONS"],
    range: [145, 192],
  },
  {
    id: 5,
    name: "05 // UNIFIED GRAPH",
    eyebrow: "STAGE 04 // EVIDENCE-LINKED SYNTHESIS",
    headlineMain: "THE COMPLETE",
    headlineHighlight: "RISK SYNTHESIS.",
    description:
      "Deterministic safety rules compute the risk envelope. The language plane articulates traceable, evidence-backed clinician insights.",
    activeNodes: ["GENETICS", "MEDICATIONS", "SYMPTOMS", "CONDITIONS", "CURX INTELLIGENCE NETWORK"],
    range: [193, 240],
  },
];

export const NAV_LINKS = [
  { label: "PRODUCT", href: "#disconnect" },
  { label: "NETWORK", href: "#network" },
  { label: "HOW IT WORKS", href: "#architecture" },
  { label: "SAFETY", href: "#safety" },
  { label: "TRUST", href: "#trust" },
];
