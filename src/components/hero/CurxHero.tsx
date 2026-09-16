"use client";

import React from "react";
import Link from "next/link";
import { GlowText } from "@/components/ui/GlowText";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ArrowRight, ShieldCheck, Cpu, Dna } from "lucide-react";

export const CurxHero: React.FC = () => {
  return (
    <section
      className="relative w-full bg-graphite overflow-hidden pt-28 pb-16 lg:py-24 px-6 lg:px-14 border-b border-white/[0.06] flex items-center min-h-[85vh]"
      id="hero"
    >
      {/* Subtle Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-curx-cyan/[0.03] rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* ================= LEFT COLUMN: HERO NARRATIVE ================= */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-6 text-left z-10">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan text-xs font-mono tracking-widest uppercase w-fit shadow-[0_0_15px_rgba(0,240,208,0.15)]">
              <span className="w-2 h-2 rounded-full bg-curx-cyan animate-pulse shadow-[0_0_6px_#00F0D0]" />
              <span>CURX · PERSONAL HEALTH INTELLIGENCE</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
              Your health is a{" "}
              <GlowText variant="cyan">connected story.</GlowText>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-xl">
              Understand how your medications, symptoms, genetics, and conditions come together with deterministic safety and clinical AI explainability.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <MagneticButton variant="primary" size="lg" href="/signup">
                <span>GET STARTED</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </MagneticButton>

              <MagneticButton variant="secondary" size="lg" href="#architecture">
                <span>EXPLORE CURX</span>
              </MagneticButton>
            </div>

            {/* Core Grounding Clinical Pillars */}
            <div className="grid grid-cols-3 gap-4 pt-6 mt-2 border-t border-white/[0.08]">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-curx-cyan uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-curx-cyan shrink-0" />
                  <span>DETERMINISTIC</span>
                </div>
                <span className="text-xs text-slate-400 leading-snug">
                  CPIC & FDA verified drug-gene logic
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-curx-amber uppercase tracking-wider mb-1">
                  <Dna className="w-3.5 h-3.5 text-curx-amber shrink-0" />
                  <span>GENOMICS</span>
                </div>
                <span className="text-xs text-slate-400 leading-snug">
                  CYP450 multi-allele metabolizer profiles
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-curx-cyan uppercase tracking-wider mb-1">
                  <Cpu className="w-3.5 h-3.5 text-curx-cyan shrink-0" />
                  <span>DIFFERENTIAL</span>
                </div>
                <span className="text-xs text-slate-400 leading-snug">
                  Adaptive symptom graph reasoning
                </span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: CINEMATIC HERO VIDEO ================= */}
          <div className="lg:col-span-6 xl:col-span-7 flex items-center justify-center relative w-full">
            {/* Ambient Background Glow behind Video */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-curx-cyan/20 via-curx-teal/10 to-transparent rounded-[32px] blur-2xl opacity-60 pointer-events-none -z-10" />

            {/* Video Container */}
            <div className="relative w-full aspect-video sm:aspect-[16/10] lg:aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-[#090D14] shadow-[0_25px_70px_rgba(0,0,0,0.7)]">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-full object-cover rounded-2xl sm:rounded-3xl"
              >
                <source src="/videos/hero-section-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
