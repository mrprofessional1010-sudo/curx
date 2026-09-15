"use client";

import React from "react";
import { HERO_STAGES } from "@/lib/constants";
import { GlowText } from "@/lib/../components/ui/GlowText";
import { MagneticButton } from "@/lib/../components/ui/MagneticButton";
import { ArrowRight, ChevronDown, Activity, Dna, Pill, HeartPulse, Network } from "lucide-react";

interface HeroNarrativeProps {
  progress: number;
  currentFrame: number;
  activeStageIndex: number;
}

export const HeroNarrative: React.FC<HeroNarrativeProps> = ({
  progress,
  currentFrame,
  activeStageIndex,
}) => {
  const currentStage = HERO_STAGES[activeStageIndex] || HERO_STAGES[0];
  const pct = Math.round(progress * 100);

  return (
    <div className="relative z-20 flex flex-col justify-between h-full w-full pointer-events-none">
      {/* Top Telemetry Ribbon */}
      <div className="w-full flex items-center justify-between border-b border-white/[0.06] pb-3 text-[11px] font-mono text-slate-400 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-curx-cyan font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
            CORE SIMULATION
          </span>
          <span className="text-slate-600">/</span>
          <span className="tracking-widest text-slate-300 font-semibold">
            FRAME {String(currentFrame).padStart(3, "0")} / 240
          </span>
        </div>

        {/* Scrub Progress Bar */}
        <div className="hidden sm:flex items-center gap-3 w-64 lg:w-80">
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-curx-cyan transition-all duration-75"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-mono w-9 text-right">
            {pct}%
          </span>
        </div>

        {/* Stage Indicator Badge */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-block text-[10px] uppercase text-slate-400 tracking-wider">
            SYNTHESIS STATE:
          </span>
          <span className="px-2.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-curx-cyan font-mono text-[10px] font-semibold tracking-wider">
            {currentStage.name}
          </span>
        </div>
      </div>

      {/* Center Layout: Left Copy + Floating Visual Frame Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-6">
        {/* Left Column: Hero Narrative Copy */}
        <div className="lg:col-span-5 flex flex-col gap-6 text-left pointer-events-auto">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan text-[11px] font-mono tracking-widest uppercase w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
            <span>{currentStage.eyebrow}</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.05] min-h-[120px] transition-all duration-300">
            {currentStage.headlineMain} <br />
            <GlowText variant="white">{currentStage.headlineHighlight}</GlowText>
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-lg min-h-[60px] transition-opacity duration-300">
            {currentStage.description}
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <MagneticButton variant="primary" size="md" href="/signup">
              <span>EXPLORE CURX</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </MagneticButton>

            <MagneticButton variant="secondary" size="md" href="#architecture">
              <span>SEE HOW IT WORKS</span>
            </MagneticButton>
          </div>

          {/* Core Grounding Pillars */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/[0.08]">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-curx-cyan uppercase tracking-wider">
                DETERMINISTIC
              </span>
              <span className="text-[11px] text-slate-400 font-sans leading-tight mt-0.5">
                Rule-driven clinical risk
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-curx-amber uppercase tracking-wider">
                EXPLAINABLE
              </span>
              <span className="text-[11px] text-slate-400 font-sans leading-tight mt-0.5">
                Traceable contributing factors
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                GROUNDED
              </span>
              <span className="text-[11px] text-slate-400 font-sans leading-tight mt-0.5">
                Source-linked evidence base
              </span>
            </div>
          </div>
        </div>

        {/* Right Space placeholder (Canvas will be rendered in center/right background of stage) */}
        <div className="lg:col-span-7 relative h-[380px] sm:h-[480px] lg:h-[560px] pointer-events-none flex items-center justify-center">
          {/* Dynamic contextual labels that fade in gently without obscuring artwork */}
          <div
            className={`absolute top-6 left-6 px-3.5 py-1.5 rounded-lg bg-[#071118]/80 backdrop-blur-md border border-curx-cyan/40 text-curx-cyan font-mono text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,208,0.2)] transition-all duration-500 ${
              currentStage.activeNodes.includes("GENETICS")
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2"
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span className="font-semibold">GENETICS: CYP2D6 *4/*41</span>
          </div>

          <div
            className={`absolute top-6 right-6 px-3.5 py-1.5 rounded-lg bg-[#181107]/80 backdrop-blur-md border border-curx-amber/40 text-curx-amber font-mono text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(255,176,32,0.2)] transition-all duration-500 ${
              currentStage.activeNodes.includes("MEDICATIONS")
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2"
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span className="font-semibold">MEDICATIONS: Tamoxifen + Fluoxetine</span>
          </div>

          <div
            className={`absolute bottom-6 left-6 px-3.5 py-1.5 rounded-lg bg-[#180907]/80 backdrop-blur-md border border-curx-orange/40 text-curx-orange font-mono text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(255,107,0,0.2)] transition-all duration-500 ${
              currentStage.activeNodes.includes("SYMPTOMS")
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span className="font-semibold">SYMPTOMS: Vasomotor Episodes</span>
          </div>

          <div
            className={`absolute bottom-6 right-6 px-3.5 py-1.5 rounded-lg bg-[#071118]/90 backdrop-blur-md border border-curx-cyan text-white font-mono text-xs flex items-center gap-2 shadow-[0_0_30px_rgba(0,240,208,0.35)] transition-all duration-500 ${
              currentStage.activeNodes.includes("CURX INTELLIGENCE NETWORK")
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95"
            }`}
          >
            <Network className="w-4 h-4 text-curx-cyan" />
            <span className="font-bold tracking-wider text-curx-cyan">CURX INTELLIGENCE NETWORK</span>
          </div>
        </div>
      </div>

      {/* Bottom Stage Timeline & Scroll Hint */}
      <div className="w-full flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] font-mono text-slate-400 pointer-events-auto">
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            STAGES:
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {HERO_STAGES.map((s, idx) => (
              <span
                key={s.id}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === activeStageIndex
                    ? "bg-curx-cyan scale-125 shadow-[0_0_10px_#00F0D0]"
                    : idx < activeStageIndex
                    ? "bg-curx-cyan/40"
                    : "bg-white/10"
                }`}
                title={s.name}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 animate-bounce">
          <span className="text-[10px] tracking-widest uppercase">
            Scroll to synthesize
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-curx-cyan" />
        </div>
      </div>
    </div>
  );
};
