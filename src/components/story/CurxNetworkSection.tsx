"use client";

import React, { useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowText } from "@/components/ui/GlowText";
import { Network, Dna, Pill, HeartPulse, Stethoscope, GitMerge, FileText, CheckCircle2 } from "lucide-react";

interface NetworkNode {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  color: "cyan" | "amber" | "orange" | "slate";
  connectedTo: string[];
  explanation: string;
  coords: { x: number; y: number }; // percentage coords in spatial container
}

export const CurxNetworkSection: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes: NetworkNode[] = [
    {
      id: "genetics",
      name: "GENETICS",
      category: "Pharmacogenomics",
      icon: <Dna className="w-4 h-4" />,
      color: "cyan",
      connectedTo: ["medications", "interactions", "evidence"],
      explanation: "Identifies hepatic enzyme variants (CYP450 family) altering clearance or bioactivation kinetics.",
      coords: { x: 20, y: 25 },
    },
    {
      id: "medications",
      name: "MEDICATIONS",
      category: "Regimen & Dosing",
      icon: <Pill className="w-4 h-4" />,
      color: "amber",
      connectedTo: ["genetics", "symptoms", "interactions", "conditions"],
      explanation: "Tracks active regimens, parent compounds, active metabolites, and receptor affinities.",
      coords: { x: 80, y: 25 },
    },
    {
      id: "symptoms",
      name: "SYMPTOMS",
      category: "Phenotypic Feedback",
      icon: <HeartPulse className="w-4 h-4" />,
      color: "orange",
      connectedTo: ["medications", "conditions", "evidence"],
      explanation: "Maps patient-reported side effects to pharmacological mechanisms and receptor over-stimulation.",
      coords: { x: 20, y: 75 },
    },
    {
      id: "conditions",
      name: "CONDITIONS",
      category: "Comorbidities",
      icon: <Stethoscope className="w-4 h-4" />,
      color: "slate",
      connectedTo: ["medications", "symptoms", "interactions"],
      explanation: "Evaluates organ clearance impairment (renal eGFR, hepatic Child-Pugh) and physiological contraindications.",
      coords: { x: 80, y: 75 },
    },
    {
      id: "interactions",
      name: "INTERACTIONS",
      category: "Multimodal Cascades",
      icon: <GitMerge className="w-4 h-4" />,
      color: "amber",
      connectedTo: ["genetics", "medications", "evidence"],
      explanation: "Synthesizes multi-factor drug-drug and gene-drug cross-talk beyond pairwise alerts.",
      coords: { x: 50, y: 15 },
    },
    {
      id: "evidence",
      name: "EVIDENCE",
      category: "CPIC & Clinical Guidelines",
      icon: <FileText className="w-4 h-4" />,
      color: "cyan",
      connectedTo: ["genetics", "medications", "interactions"],
      explanation: "Anchors every computed risk finding to published peer-reviewed guidelines and FDA label annotations.",
      coords: { x: 50, y: 85 },
    },
  ];

  const activeExplanation = hoveredNode
    ? nodes.find((n) => n.id === hoveredNode)?.explanation
    : "Hover or select any node in the network to trace its multimodal clinical connections and deterministic rules.";

  return (
    <section id="network" className="relative py-28 px-6 lg:px-14 border-b border-white/[0.06] bg-[#070A0F]">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          badge="SECTION 03 // THE CURX CONNECTION"
          badgeColor="cyan"
          title={
            <>
              Every factor connected into <br />
              <GlowText variant="cyan">one unified picture.</GlowText>
            </>
          }
          subtitle="Curx brings pharmacogenomics, multi-drug regimens, symptoms, and guidelines into an explainable graph network. Trace the entire clinical path."
        />

        {/* Network Spatial Container */}
        <div className="relative glass-panel rounded-2xl p-6 sm:p-12 border border-white/10 overflow-hidden min-h-[500px] flex flex-col justify-between">
          {/* Spatial Node Map */}
          <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl border border-white/[0.05] bg-black/40 overflow-hidden flex items-center justify-center">
            {/* SVG Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {nodes.map((node) =>
                node.connectedTo.map((targetId) => {
                  const targetNode = nodes.find((n) => n.id === targetId);
                  if (!targetNode) return null;

                  const isHighlighted =
                    hoveredNode === node.id || hoveredNode === targetId;
                  const isCurxConnected = !hoveredNode || isHighlighted;

                  return (
                    <line
                      key={`${node.id}-${targetId}`}
                      x1={`${node.coords.x}%`}
                      y1={`${node.coords.y}%`}
                      x2={`${targetNode.coords.x}%`}
                      y2={`${targetNode.coords.y}%`}
                      stroke={isHighlighted ? "#00F0D0" : "rgba(255, 255, 255, 0.08)"}
                      strokeWidth={isHighlighted ? "2" : "1"}
                      strokeDasharray={isHighlighted ? "none" : "4 4"}
                      className="transition-all duration-300"
                    />
                  );
                })
              )}

              {/* Lines connecting each node to CURX Center */}
              {nodes.map((node) => {
                const isHighlighted = hoveredNode === node.id || !hoveredNode;
                return (
                  <line
                    key={`curx-${node.id}`}
                    x1="50%"
                    y1="50%"
                    x2={`${node.coords.x}%`}
                    y2={`${node.coords.y}%`}
                    stroke={isHighlighted ? "rgba(0, 240, 208, 0.4)" : "rgba(255, 255, 255, 0.05)"}
                    strokeWidth={isHighlighted ? "1.5" : "1"}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {/* Center CURX Core */}
            <div className="relative z-20 flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#061118] border-2 border-curx-cyan shadow-[0_0_40px_rgba(0,240,208,0.3)] transition-all duration-300">
              <span className="w-2.5 h-2.5 rounded-full bg-curx-cyan animate-pulse mb-1" />
              <span className="font-display font-bold text-sm sm:text-base text-white tracking-widest">
                CURX
              </span>
              <span className="text-[9px] font-mono text-curx-cyan tracking-wider uppercase">
                ENGINE
              </span>
            </div>

            {/* Surrounding Interactive Nodes */}
            {nodes.map((node) => {
              const isHovered = hoveredNode === node.id;
              const isConnected =
                hoveredNode &&
                (node.id === hoveredNode ||
                  nodes.find((n) => n.id === hoveredNode)?.connectedTo.includes(node.id));

              const isDimmed = hoveredNode && !isConnected && !isHovered;

              return (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    left: `${node.coords.x}%`,
                    top: `${node.coords.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`absolute z-20 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border backdrop-blur-xl transition-all duration-300 cursor-pointer select-none flex items-center gap-2 ${
                    isHovered
                      ? "bg-[#091A24] border-curx-cyan shadow-[0_0_25px_rgba(0,240,208,0.3)] scale-110"
                      : isDimmed
                      ? "bg-black/60 border-white/[0.04] opacity-35"
                      : "bg-[#0A0F15]/90 border-white/10 hover:border-curx-cyan/50"
                  }`}
                >
                  <div className="text-curx-cyan">{node.icon}</div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-mono text-slate-400 uppercase leading-tight">
                      {node.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-white tracking-wider">
                      {node.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Explanation Drawer */}
          <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-sans">
            <CheckCircle2 className="w-5 h-5 text-curx-cyan shrink-0" />
            <p className="leading-relaxed">{activeExplanation}</p>
          </div>

          {/* Live Ingestion Layer Metrics */}
          <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-base font-mono font-bold text-curx-cyan">2,036</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">HGNC Genes</div>
            </div>
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-base font-mono font-bold text-curx-amber">1,500</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">RxNorm Drugs</div>
            </div>
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-base font-mono font-bold text-curx-orange">318</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Symptom Links</div>
            </div>
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-base font-mono font-bold text-white">9</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Evidence Sources</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
