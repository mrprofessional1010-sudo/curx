"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dna, Pill, HeartPulse, Stethoscope, FileText, Lock, Sparkles, Activity } from "lucide-react";

export interface IntelligenceFieldProps {
  activeField?: "email" | "password" | "name" | "role" | null;
  mode?: "login" | "signup";
}

export const CurxIntelligenceField: React.FC<IntelligenceFieldProps> = ({
  activeField = null,
  mode = "login",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pulseActive, setPulseActive] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Lightweight ambient particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.offsetWidth || 400);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
    }> = [];

    for (let i = 0; i < 32; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.8,
        alpha: Math.random() * 0.4 + 0.15,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Connect close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 85) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 240, 208, ${0.14 * (1 - dist / 85)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Draw points
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 208, ${p.alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isEmailActive = activeField === "email";
  const isPasswordActive = activeField === "password";

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden select-none bg-[#070A0E] border-r border-white/[0.08]">
      {/* Background Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0"
      />

      {/* Top Telemetry Status Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#0C141C] border border-curx-cyan/40 shadow-[0_0_15px_rgba(0,240,208,0.15)]">
            <span className="w-2.5 h-2.5 rounded-full bg-curx-cyan shadow-[0_0_10px_#00F0D0]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-base font-bold tracking-wider text-white leading-none">
              CURX
            </span>
            <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase mt-0.5">
              Intelligence Field
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-curx-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-curx-cyan" />
          </span>
          <span className="font-mono text-[10px] text-slate-300 uppercase tracking-wider">
            Sync: Live Active
          </span>
        </div>
      </div>

      {/* Center Scientific Core & Interactive Constellation */}
      <div className="relative w-full max-w-[420px] aspect-square mx-auto my-auto py-4 flex items-center justify-center z-10">
        {/* Sonar Luminescence Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-32 h-32 rounded-full border border-curx-cyan/30 ${
              isPasswordActive ? "scale-125 border-curx-cyan/60" : "animate-ping opacity-25"
            } transition-all duration-700`}
            style={{ animationDuration: "3.5s" }}
          />
          <div
            className="w-48 h-48 rounded-full border border-curx-cyan/15 animate-ping opacity-15"
            style={{ animationDuration: "4.5s" }}
          />
        </div>

        {/* SVG Vector Connectors and Energy Beams */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          fill="none"
          viewBox="0 0 400 400"
        >
          {/* Concentric Orbit Circles */}
          <circle
            cx="200"
            cy="200"
            r={mode === "signup" ? "168" : "158"}
            stroke="#1F2A38"
            strokeDasharray="3 4"
            strokeOpacity={isEmailActive ? "0.8" : "0.4"}
            className="transition-all duration-700"
          />
          <circle
            cx="200"
            cy="200"
            r="112"
            stroke="#1F2A38"
            strokeOpacity={isPasswordActive ? "0.8" : "0.45"}
            className="transition-all duration-700"
          />
          <circle
            cx="200"
            cy="200"
            r="64"
            stroke={isPasswordActive ? "#00F0D0" : "rgba(0, 240, 208, 0.3)"}
            strokeDasharray="8 6"
            strokeWidth={isPasswordActive ? "1.5" : "1"}
            className="animate-[spin_40s_linear_infinite]"
          />

          {/* Ray Lines between Core (200,200) and Satellite Nodes */}
          {/* Genetics (100, 88) */}
          <line
            x1="200"
            y1="200"
            x2="100"
            y2="88"
            stroke={isEmailActive || hoveredNode === "genetics" ? "#00F0D0" : "#243242"}
            strokeWidth={isEmailActive ? "1.8" : "1.2"}
            strokeOpacity={isEmailActive ? "1" : "0.6"}
            className="transition-all duration-300"
          />
          {/* Medications (305, 85) */}
          <line
            x1="200"
            y1="200"
            x2="305"
            y2="85"
            stroke={hoveredNode === "medications" ? "#FFB020" : "#243242"}
            strokeWidth="1.2"
            strokeOpacity="0.6"
            className="transition-all duration-300"
          />
          {/* Symptoms (325, 235) */}
          <line
            x1="200"
            y1="200"
            x2="325"
            y2="235"
            stroke={hoveredNode === "symptoms" ? "#FF6B00" : "#243242"}
            strokeWidth="1.2"
            strokeOpacity="0.6"
            className="transition-all duration-300"
          />
          {/* Conditions (95, 290) */}
          <line
            x1="200"
            y1="200"
            x2="95"
            y2="290"
            stroke={hoveredNode === "conditions" ? "#CBD5E1" : "#243242"}
            strokeWidth="1.2"
            strokeOpacity="0.6"
            className="transition-all duration-300"
          />
          {/* Evidence (220, 335) */}
          <line
            x1="200"
            y1="200"
            x2="220"
            y2="335"
            stroke={isEmailActive || hoveredNode === "evidence" ? "#00F0D0" : "#243242"}
            strokeWidth={isEmailActive ? "1.8" : "1.2"}
            strokeOpacity={isEmailActive ? "1" : "0.6"}
            className="transition-all duration-300"
          />

          {/* Traveling Photons on Vector Lines */}
          <circle
            cx="150"
            cy="144"
            r={isEmailActive ? "3.5" : "2.5"}
            fill="#00F0D0"
            opacity="0.85"
            className="animate-ping"
            style={{ animationDuration: isEmailActive ? "1.4s" : "2.8s" }}
          />
          <circle
            cx="252"
            cy="142"
            r="2.5"
            fill="#FFB020"
            opacity="0.8"
            className="animate-ping"
            style={{ animationDuration: "3.2s" }}
          />
          <circle
            cx="210"
            cy="268"
            r={isEmailActive ? "3.5" : "2.5"}
            fill="#00F0D0"
            opacity="0.85"
            className="animate-ping"
            style={{ animationDuration: "2.4s" }}
          />
        </svg>

        {/* Central Core Node */}
        <div
          onClick={() => {
            setPulseActive(true);
            setTimeout(() => setPulseActive(false), 800);
          }}
          className={`relative z-20 w-28 h-28 rounded-full flex flex-col items-center justify-center bg-[#0C141E]/95 border border-white/20 shadow-[0_0_35px_rgba(0,240,208,0.25)] hover:shadow-[0_0_50px_rgba(0,240,208,0.5)] cursor-pointer backdrop-blur-xl transition-all duration-500 group ${
            pulseActive ? "scale-110 shadow-[0_0_60px_rgba(0,240,208,0.8)]" : ""
          }`}
        >
          {/* Cryptographic Security Ring (activated on Password Focus) */}
          <div
            className={`absolute -inset-2.5 rounded-full border-2 border-dashed transition-all duration-500 pointer-events-none ${
              isPasswordActive
                ? "border-curx-cyan opacity-100 animate-[spin_20s_linear_infinite]"
                : "border-curx-cyan/0 opacity-0"
            }`}
          />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,240,208,0.25)_0%,transparent_70%)] animate-pulse" />

          {isPasswordActive ? (
            <Lock className="w-7 h-7 text-curx-cyan animate-pulse transition-transform" />
          ) : (
            <Sparkles className="w-7 h-7 text-curx-cyan group-hover:scale-110 transition-transform" />
          )}
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-300 mt-1 group-hover:text-curx-cyan transition-colors">
            CURX CORE
          </span>
        </div>

        {/* Satellite Node 1: GENETICS */}
        <div
          onMouseEnter={() => setHoveredNode("genetics")}
          onMouseLeave={() => setHoveredNode(null)}
          className={`absolute top-2 left-1 z-20 p-2.5 rounded-lg bg-[#0C131A]/90 border transition-all duration-300 cursor-pointer shadow-lg group ${
            isEmailActive || hoveredNode === "genetics"
              ? "border-curx-cyan shadow-[0_0_20px_rgba(0,240,208,0.35)] scale-105"
              : "border-white/10 hover:border-curx-cyan/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-curx-cyan" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                GENETICS
              </div>
              <div className="font-mono text-xs font-semibold text-white">Pharmacogenomics</div>
            </div>
          </div>
        </div>

        {/* Satellite Node 2: MEDICATIONS */}
        <div
          onMouseEnter={() => setHoveredNode("medications")}
          onMouseLeave={() => setHoveredNode(null)}
          className={`absolute top-2 right-1 z-20 p-2.5 rounded-lg bg-[#14120C]/90 border transition-all duration-300 cursor-pointer shadow-lg group ${
            hoveredNode === "medications"
              ? "border-curx-amber shadow-[0_0_20px_rgba(255,176,32,0.35)] scale-105"
              : "border-white/10 hover:border-curx-amber/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-curx-amber" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                MEDICATIONS
              </div>
              <div className="font-mono text-xs font-semibold text-white">Regimen & Dosing</div>
            </div>
          </div>
        </div>

        {/* Satellite Node 3: SYMPTOMS */}
        <div
          onMouseEnter={() => setHoveredNode("symptoms")}
          onMouseLeave={() => setHoveredNode(null)}
          className={`absolute top-1/2 -right-3 transform -translate-y-1/2 z-20 p-2.5 rounded-lg bg-[#140C0A]/90 border transition-all duration-300 cursor-pointer shadow-lg group ${
            hoveredNode === "symptoms"
              ? "border-curx-orange shadow-[0_0_20px_rgba(255,107,0,0.35)] scale-105"
              : "border-white/10 hover:border-curx-orange/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-curx-orange" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                SYMPTOMS
              </div>
              <div className="font-mono text-xs font-semibold text-white">Phenotypic Signals</div>
            </div>
          </div>
        </div>

        {/* Satellite Node 4: CONDITIONS */}
        <div
          onMouseEnter={() => setHoveredNode("conditions")}
          onMouseLeave={() => setHoveredNode(null)}
          className={`absolute bottom-6 left-1 z-20 p-2.5 rounded-lg bg-[#0C1218]/90 border transition-all duration-300 cursor-pointer shadow-lg group ${
            hoveredNode === "conditions"
              ? "border-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105"
              : "border-white/10 hover:border-white/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                CONDITIONS
              </div>
              <div className="font-mono text-xs font-semibold text-white">Comorbidities</div>
            </div>
          </div>
        </div>

        {/* Satellite Node 5: EVIDENCE */}
        <div
          onMouseEnter={() => setHoveredNode("evidence")}
          onMouseLeave={() => setHoveredNode(null)}
          className={`absolute -bottom-1 right-10 z-20 p-2.5 rounded-lg bg-[#0C131A]/90 border transition-all duration-300 cursor-pointer shadow-lg group ${
            isEmailActive || hoveredNode === "evidence"
              ? "border-curx-cyan shadow-[0_0_20px_rgba(0,240,208,0.35)] scale-105"
              : "border-white/10 hover:border-curx-cyan/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-curx-cyan" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                EVIDENCE
              </div>
              <div className="font-mono text-xs font-semibold text-curx-cyan">Clinical Guidelines</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Editorial Statement */}
      <div className="relative z-10 flex flex-col gap-2 mt-auto pt-6 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-curx-cyan">
            DECISION TELEMETRY
          </span>
          <span className="w-10 h-[1px] bg-gradient-to-r from-curx-cyan/60 to-transparent" />
        </div>
        <h2 className="font-display text-2xl lg:text-3xl text-white font-bold tracking-tight">
          SEE THE WHOLE PICTURE.
        </h2>
        <p className="font-sans text-xs text-slate-400 max-w-sm leading-relaxed">
          Connected intelligence for a clearer, unified understanding of patient medication risk and therapeutic response.
        </p>
      </div>
    </div>
  );
};
