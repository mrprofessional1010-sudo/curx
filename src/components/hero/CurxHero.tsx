"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { FrameSequenceHero } from "./FrameSequenceHero";
import { HeroNarrative } from "./HeroNarrative";
import { HERO_STAGES } from "@/lib/constants";

export const CurxHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  const lastFrameRef = useRef(1);
  const lastStageRef = useRef(0);
  const tickingRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;

    const rawProgress = Math.max(0, Math.min(1, scrolled / totalScrollable));
    const calculatedFrame = Math.max(1, Math.min(240, Math.floor(rawProgress * 239) + 1));

    // Determine narrative stage
    let stageIdx = 0;
    for (let i = 0; i < HERO_STAGES.length; i++) {
      const [start, end] = HERO_STAGES[i].range;
      if (calculatedFrame >= start && calculatedFrame <= end) {
        stageIdx = i;
        break;
      }
    }

    // Only update state when changed to avoid unnecessary re-renders
    if (calculatedFrame !== lastFrameRef.current || stageIdx !== lastStageRef.current) {
      lastFrameRef.current = calculatedFrame;
      lastStageRef.current = stageIdx;
      setScrollProgress(rawProgress);
      setCurrentFrame(calculatedFrame);
      setActiveStageIndex(stageIdx);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!tickingRef.current) {
        requestAnimationFrame(() => {
          handleScroll();
          tickingRef.current = false;
        });
        tickingRef.current = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  return (
    <section
      ref={containerRef}
      className="relative h-[800vh] w-full bg-graphite"
      id="hero-track"
    >
      {/* Sticky Full-Viewport Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between pt-16 pb-6 px-6 lg:px-14 border-b border-white/[0.06]">
        {/* Visual Frame Canvas Layer (Placed prominently in center/right on desktop) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
          <div className="w-full max-w-5xl h-[70vh] sm:h-[80vh] flex items-center justify-center opacity-90 transition-opacity">
            <FrameSequenceHero currentFrame={currentFrame} />
          </div>
        </div>

        {/* Dynamic Foreground Narrative Layer */}
        <HeroNarrative
          progress={scrollProgress}
          currentFrame={currentFrame}
          activeStageIndex={activeStageIndex}
        />
      </div>
    </section>
  );
};
