import { Navbar } from "@/components/navigation/Navbar";
import { CurxHero } from "@/components/hero/CurxHero";
import { DisconnectSection } from "@/components/story/DisconnectSection";
import { CurxNetworkSection } from "@/components/story/CurxNetworkSection";
import { ArchitectureSection } from "@/components/story/ArchitectureSection";
import { MedicationSection } from "@/components/story/MedicationSection";
import { SymptomSection } from "@/components/story/SymptomSection";
import { ExplainabilitySection } from "@/components/story/ExplainabilitySection";
import { SafetySection } from "@/components/story/SafetySection";
import { NearbyCareSection } from "@/components/story/NearbyCareSection";
import { TrustSection } from "@/components/story/TrustSection";
import { FinalCtaSection } from "@/components/story/FinalCtaSection";
import { Footer } from "@/components/footer/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-graphite text-[#EDF2F7] flex flex-col selection:bg-curx-cyan/30 selection:text-curx-cyan">
      {/* Sticky Navigation */}
      <Navbar />

      {/* SECTION 01: Direct Looped Cinematic Video Hero */}
      <CurxHero />

      {/* SECTION 02: The Disconnect */}
      <DisconnectSection />

      {/* SECTION 03: The Curx Connection */}
      <CurxNetworkSection />

      {/* SECTION 04: How Curx Thinks (Dual-Plane Engine) */}
      <ArchitectureSection />

      {/* SECTION 05: Multimodal Medication Intelligence */}
      <MedicationSection />

      {/* SECTION 06: Adaptive Symptom Reasoning */}
      <SymptomSection />

      {/* SECTION 07: Auditable Explainability & Evidence */}
      <ExplainabilitySection />

      {/* SECTION 08: Emergency Safety & Quiet Stillness */}
      <SafetySection />

      {/* SECTION 09: Nearby Care Facility Continuity */}
      <NearbyCareSection />

      {/* SECTION 10: Clinical Trust Principles */}
      <TrustSection />

      {/* SECTION 11: Final Cinematic CTA Loop */}
      <FinalCtaSection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
