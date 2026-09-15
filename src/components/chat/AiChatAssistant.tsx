"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  X,
  Plus,
  BookOpen,
  Dna,
  Pill,
  Building2,
  User,
  CheckCircle2,
} from "lucide-react";
import { GlowText } from "@/components/ui/GlowText";
import { RiskBadge } from "@/components/ui/RiskBadge";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  metadata?: {
    model?: string;
    riskTier?: string;
    riskScore?: number;
    evidence?: Array<{
      sourceName: string;
      title?: string;
      url?: string;
      relevantDetail?: string;
    }>;
    emergencyAlert?: string | null;
    hasProfile?: boolean;
    blocked?: boolean;
  };
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface AiChatAssistantProps {
  patientData?: any;
  riskResult?: any;
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  "Why is my medication risk high?",
  "What factors are contributing to my risk?",
  "Explain my genetic findings.",
  "What evidence supports this result?",
  "What symptoms have I reported?",
  "Where can I get nearby care?",
];

export function AiChatAssistant({
  patientData,
  riskResult,
  isOpen,
  onClose,
}: AiChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  // Load conversation list when opened
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.warn("Failed to load conversation history:", err);
    }
  };

  const selectConversation = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat?conversationId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(id);
        setMessages(data.messages || []);
        setShowHistory(false);
      }
    } catch (err) {
      setError("Failed to load conversation messages.");
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage("");
    setError(null);

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to get AI response.`);
      }

      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        loadConversations();
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        created_at: new Date().toISOString(),
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err?.message || "Failed to reach CURX AI Assistant.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-[#06080B]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col font-sans text-slate-200 transition-all duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-white/[0.08] bg-[#090D13]/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-curx-cyan/10 border border-curx-cyan/40 text-curx-cyan">
            <Sparkles className="w-4 h-4 text-curx-cyan animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold tracking-wider text-white">
                CURX AI ASSISTANT
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan uppercase">
                GEMINI FLASH
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Deterministic Clinical Explanation Layer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-lg border border-white/10 hover:border-curx-cyan/40 hover:bg-curx-cyan/10 text-slate-300 hover:text-curx-cyan transition-colors"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showHistory
                ? "border-curx-cyan bg-curx-cyan/20 text-curx-cyan"
                : "border-white/10 hover:border-white/30 text-slate-300"
            }`}
            title="Conversation History"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 hover:border-curx-red/40 hover:bg-curx-red/10 text-slate-300 hover:text-curx-red transition-colors"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Slide-down Drawer */}
      {showHistory && (
        <div className="bg-[#0C1219] border-b border-white/10 p-3 max-h-48 overflow-y-auto space-y-1.5 no-scrollbar">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-2 mb-1">
            Past Clinical Consultations
          </div>
          {conversations.length === 0 ? (
            <div className="text-xs font-mono text-slate-500 px-2 py-1">
              No previous conversations recorded.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono truncate transition-colors flex items-center justify-between ${
                  conv.id === conversationId
                    ? "bg-curx-cyan/20 border border-curx-cyan/40 text-curx-cyan"
                    : "bg-white/[0.02] border border-white/5 text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <span className="truncate">{conv.title || "Clinical Query"}</span>
                <span className="text-[9px] text-slate-500 shrink-0 ml-2">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Clinical Persona Info Strip */}
      <div className="bg-[#0A0E15] px-4 py-2 border-b border-white/[0.05] flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <User className="w-3 h-3 text-curx-cyan" />
          <span className="text-white font-semibold">
            {patientData?.fullName || "Current User"}
          </span>
          <span>({patientData?.city || "San Francisco"})</span>
        </div>
        {riskResult && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">RISK:</span>
            <RiskBadge
              level={riskResult.riskTier?.toLowerCase() || "low"}
              label={riskResult.riskTier || "LOW"}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-curx-cyan/10 border border-curx-cyan/30 flex items-center justify-center text-curx-cyan">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-display text-base font-bold text-white mb-1">
                CURX AI Clinical Assistant
              </h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Ask questions about your personalized medication risks, genetic variants, drug-drug interactions, and evidence guidelines.
              </p>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="w-full space-y-2 pt-2 text-left">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-1">
                Suggested Clinical Inquiries
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-curx-cyan/50 hover:bg-curx-cyan/[0.05] text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <Sparkles className="w-3 h-3 text-curx-cyan/40 group-hover:text-curx-cyan transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[92%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-curx-cyan/[0.12] border border-curx-cyan/40 text-white rounded-br-none"
                    : "glass-panel border border-white/10 text-slate-200 rounded-bl-none shadow-lg"
                }`}
              >
                {/* Assistant Model Header */}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/[0.08]">
                    <Sparkles className="w-3.5 h-3.5 text-curx-cyan" />
                    <span className="font-mono text-[10px] font-bold text-curx-cyan tracking-wider">
                      CURX INTELLIGENCE
                    </span>
                    {msg.metadata?.riskTier && (
                      <span className="ml-auto">
                        <RiskBadge
                          level={
                            ["low", "moderate", "high", "severe"].includes(
                              msg.metadata.riskTier.toLowerCase()
                            )
                              ? (msg.metadata.riskTier.toLowerCase() as any)
                              : "low"
                          }
                          label={msg.metadata.riskTier}
                          size="sm"
                        />
                      </span>
                    )}
                  </div>
                )}

                {/* Emergency Alert Box */}
                {msg.metadata?.emergencyAlert && (
                  <div className="mb-3 p-2.5 rounded-xl bg-curx-red/15 border border-curx-red/40 text-curx-red flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-[11px] font-mono leading-tight">
                      {msg.metadata.emergencyAlert}
                    </div>
                  </div>
                )}

                {/* Message Body (Markdown rendered) */}
                <div className="whitespace-pre-wrap font-sans text-slate-100">
                  {msg.content}
                </div>

                {/* Grounded Evidence Citation Chips */}
                {msg.metadata?.evidence && msg.metadata.evidence.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/[0.08] space-y-1.5">
                    <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-curx-cyan" />
                      <span>CITED EVIDENCE SOURCES:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.metadata.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/15 text-[10px] font-mono text-curx-cyan hover:border-curx-cyan transition-colors"
                          title={ev.relevantDetail || ev.title}
                        >
                          <span className="font-bold">{ev.sourceName}</span>
                          {ev.url && (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-white"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
                {msg.role === "user" ? "You" : "CURX Gemini"} •{" "}
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
              </span>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-start space-y-1">
            <div className="glass-panel border border-curx-cyan/30 rounded-2xl rounded-bl-none p-3.5 flex items-center gap-2.5 text-curx-cyan text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-curx-cyan" />
              <span>CONSULTING DETERMINISTIC REASONING & GEMINI...</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-curx-red/10 border border-curx-red/40 text-curx-red text-xs font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="text-[10px] underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <div className="p-4 border-t border-white/[0.08] bg-[#090D13]/90">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative"
        >
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about medications, genetic findings, risk factors..."
            rows={2}
            maxLength={2000}
            disabled={loading}
            className="w-full bg-[#06080B] border border-white/15 focus:border-curx-cyan rounded-xl p-3 pr-12 text-xs font-sans text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-curx-cyan resize-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-curx-cyan text-graphite font-bold hover:bg-white transition-all disabled:opacity-30 disabled:hover:bg-curx-cyan"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>AI outputs are explanatory; not a substitute for licensed medical judgment.</span>
          <span>{inputMessage.length}/2000</span>
        </div>
      </div>
    </div>
  );
}
