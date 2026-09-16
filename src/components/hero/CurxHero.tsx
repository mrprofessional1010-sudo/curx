"use client";

import React from "react";
import { GlowText } from "@/components/ui/GlowText";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ArrowRight, Sparkles, Activity, Shield } from "lucide-react";

export const CurxHero: React.FC = () => {
  return (
    <section
      className="relative w-full bg-[#06080B] overflow-hidden pt-28 pb-20 lg:py-28 px-6 lg:px-14 border-b border-white/[0.04] flex items-center min-h-[88vh]"
      id="hero"
    >
      {/* ================= ATMOSPHERIC ENVIRONMENT GLOWS ================= */}
      {/* Deep Indigo & Violet ambient back-glow behind right-side visual */}
      <div className="absolute top-1/2 right-[-5%] -translate-y-1/2 w-[700px] h-[700px] bg-indigo-900/20 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-[15%] -translate-y-1/2 w-[550px] h-[550px] bg-curx-cyan/[0.12] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-[10%] w-[500px] h-[400px] bg-violet-950/30 rounded-full blur-[150px] pointer-events-none -z-10" />
      
      {/* Subtle connecting ambient aura extending toward the left narrative */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[500px] bg-gradient-to-r from-curx-cyan/[0.04] via-indigo-500/[0.03] to-transparent rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* ================= LEFT COLUMN: HERO NARRATIVE ================= */}
          <div className="lg:col-span-5 flex flex-col gap-6 text-left">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-curx-cyan/[0.08] border border-curx-cyan/25 text-curx-cyan text-xs font-mono tracking-widest uppercase w-fit shadow-[0_0_20px_rgba(0,240,208,0.12)]">
              <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse shadow-[0_0_6px_#00F0D0]" />
              <span>CURX · PERSONAL HEALTH INTELLIGENCE</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
              Your health is a{" "}
              <GlowText variant="cyan">connected story.</GlowText>
            </h1>

            {/* Human & Accessible Supporting Description */}
            <p className="text-base sm:text-lg text-slate-300/90 leading-relaxed font-normal max-w-lg">
              Understand how your medications, symptoms, genetics, and conditions come together.
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

            {/* Connected Health Insights Pillars */}
            <div className="grid grid-cols-3 gap-4 pt-6 mt-1 border-t border-white/[0.06]">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-curx-cyan uppercase tracking-wider mb-1">
                  <Shield className="w-3.5 h-3.5 text-curx-cyan shrink-0" />
                  <span>MEDICATIONS</span>
                </div>
                <span className="text-xs text-slate-400 leading-snug">
                  Active interactions & guidance
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-curx-amber uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-curx-amber shrink-0" />
                  <span>GENETICS</span>
                </div>
                <span className="text-xs text-slate-400 leading-snug">
                  Personal pharmacogenomics
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-curx-cyan uppercase tracking-wider mb-1">
                  <Activity className="w-3.5 h-3.5 text-curx-cyan shrink-0" />
                  <span>SYMPTOMS</span>
                </div>
                <span className="text-xs text-slate-400 leading-snug">
                  Connected signal analysis
                </span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: SEAMLESS ATMOSPHERIC VIDEO VISUAL ================= */}
          <div className="lg:col-span-7 flex items-center justify-center relative w-full lg:-mr-6 xl:-mr-10">
            {/* Ambient Multi-Layer Aura behind Video blending into page */}
            <div className="absolute -inset-8 bg-gradient-to-tr from-curx-cyan/20 via-indigo-600/15 to-violet-900/20 rounded-[48px] blur-3xl opacity-70 pointer-events-none -z-10" />
            <div className="absolute -inset-16 bg-radial-gradient from-curx-teal/15 via-transparent to-transparent blur-3xl opacity-50 pointer-events-none -z-10" />

            {/* Seamless Video Container with Feathered Edge Mask & Soft Atmospheric Vignettes */}
            <div 
              className="relative w-full aspect-video sm:aspect-[16/10] lg:aspect-[16/10] overflow-hidden rounded-3xl [mask-image:radial-gradient(ellipse_at_center,black_62%,transparent_98%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_62%,transparent_98%)]"
            >
              {/* Native HTML5 Continuous Looping Video */}
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-full object-cover scale-[1.02] transform transition-transform"
              >
                <source src="/videos/hero-section-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              {/* Directional Soft Atmospheric Edge Vignettes (fading seamlessly into #06080B background) */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06080B]/90 via-transparent to-[#06080B]/70 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06080B]/80 via-transparent to-[#06080B]/75 pointer-events-none" />
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#06080B]/60 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
