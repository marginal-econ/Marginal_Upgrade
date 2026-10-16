import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Flame,
  HelpCircle,
  Lightbulb,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  PenLine,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { getMe } from "@/lib/account.functions";
import {
  sendGroundedChatMessage,
  type GroundedChatReply,
} from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Cambridge AI Grounded Chat — Marginal Economics" },
      {
        name: "description",
        content:
          "Syllabus-grounded Cambridge 9708 Economics AI chat co-pilot with official mark scheme citations, voice discussion, and 1-click essay drafting.",
      },
    ],
  }),
  component: GroundedChatPage,
});

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: GroundedChatReply["sources"];
  diagramGuidance?: string;
  autoDraftPrompt?: GroundedChatReply["autoDraftPrompt"];
  usedAi?: boolean;
  costEstimate?: string;
  timestamp: Date;
}

const INITIAL_GREETING: ChatMessageItem = {
  id: "greeting",
  role: "assistant",
  content: `Hello! I am your **Cambridge 9708 Economics Chat Co-Pilot**, strictly grounded in the official Cambridge International AS & A Level syllabus and 1,400+ published mark schemes.

Ask me any economics concept, essay question, diagram requirement, or mark scheme criteria. Every answer cites official Cambridge sources.

**Tip:** You can speak via voice (tap 🎙️), toggle between **Fast Zero-Cost RAG** and **Deep AI Co-Pilot**, and generate a complete **Auto-Draft Essay** for any topic with one click!`,
  sources: [
    {
      title: "Cambridge 9708 Economics Specification (2023–2025)",
      chapter: "All 11 Syllabus Chapters",
      type: "syllabus",
    },
    {
      title: "Cambridge Master Definitions Catalogue",
      chapter: "Micro & Macro Units",
      type: "definition",
    },
  ],
  usedAi: false,
  costEstimate: "₹0.00 (Zero Token Local RAG Engine)",
  timestamp: new Date(),
};

const SUGGESTED_PROMPTS = [
  "Why is an indirect tax on cigarettes regressive?",
  "Explain the Marshall-Lerner condition & J-curve",
  "Are monopolies always allocatively inefficient?",
  "PPC movement along vs outward shift",
  "How does contractionary monetary policy curb inflation?",
  "Tariffs vs import quotas: welfare deadweight loss",
];

function GroundedChatPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const getMeFn = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30_000,
  });

  const sub = meQuery.data?.subscription;
  const isAdmin = meQuery.data?.isAdmin || meQuery.data?.role === "teacher";
  const isPaid = sub?.tier && sub.tier !== "free";
  const isUnlocked = isPaid || isAdmin;

  // Chat State
  const [messages, setMessages] = useState<ChatMessageItem[]>([INITIAL_GREETING]);
  const [inputMessage, setInputMessage] = useState(search.q || "");
  const [aiMode, setAiMode] = useState<boolean>(false); // default to Fast RAG (0 tokens / cheap)
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice Speech-to-Text State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-to-Speech State
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Auto-Draft Modal State
  const [activeDraft, setActiveDraft] = useState<GroundedChatReply["autoDraftPrompt"] | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendFn = useServerFn(sendGroundedChatMessage);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Handle URL search param prefill
  useEffect(() => {
    if (search.q && isUnlocked && messages.length === 1) {
      handleSend(search.q);
    }
  }, [search.q, isUnlocked]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Web Speech API: Voice Input
  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak your economics question.", { duration: 3000 });
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setInputMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("Microphone access was denied. Please allow microphone permissions.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setIsListening(false);
    }
  };

  // Web Speech API: Text-to-Speech Read Aloud
  const handleToggleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not supported on this device.");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown formatting for natural voice output
    const cleanSpeechText = text
      .replace(/[*_#>`~]/g, "")
      .replace(/\[Source:[^\]]+\]/g, "")
      .replace(/\[Mark Scheme[^\]]+\]/g, "")
      .replace(/\n+/g, ". ");

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || inputMessage).trim();
    if (!textToSend || isSending) return;

    if (!isUnlocked) {
      toast.error("Cambridge Grounded AI Chat is exclusively unlocked for paid students.");
      return;
    }

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      const history = messages
        .filter((m) => m.id !== "greeting")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendFn({
        data: {
          message: textToSend,
          aiMode,
          history,
        },
      });

      const assistantMsg: ChatMessageItem = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        sources: res.sources,
        diagramGuidance: res.diagramGuidance,
        autoDraftPrompt: res.autoDraftPrompt,
        usedAi: res.usedAi,
        costEstimate: res.costEstimate,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to retrieve grounded answer. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleOpenDraftModal = (prompt: GroundedChatReply["autoDraftPrompt"]) => {
    if (!prompt) return;
    setActiveDraft(prompt);
    setDraftModalOpen(true);
  };

  const handleTransferToGrader = () => {
    if (!activeDraft) return;
    try {
      sessionStorage.setItem("marginal_prefill_draft", activeDraft.essayDraft);
      sessionStorage.setItem("marginal_prefill_q", activeDraft.question);
    } catch {}
    setDraftModalOpen(false);
    toast.success("Draft transferred to Cambridge Essay Grader!");
    navigate({
      to: "/grade",
      search: {
        q: activeDraft.question,
        marks: activeDraft.marks,
      },
    });
  };

  // Locked View for Free Tier Users
  if (!meQuery.isLoading && !isUnlocked) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
        <PageHeader
          title="Cambridge AI Grounded Chat"
          description="Syllabus-grounded interactive economics discussions and instant essay drafting."
        />

        <div className="rounded-3xl border-2 border-primary/30 bg-card p-6 sm:p-10 shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Lock className="size-48 text-primary" />
          </div>

          <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-inner">
            <Lock className="size-8 animate-pulse text-amber-500" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs font-semibold">
              Exclusive Subscriber Feature
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Cambridge Grounded AI Chat is Locked
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Real-time voice discussions, syllabus-grounded mark scheme explanations, and 1-click Auto-Draft Essays are unlocked for all Cambridge Pass subscribers.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto text-left text-xs">
            <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="size-4 text-primary" /> 100% Grounded
              </span>
              <p className="text-[11px] text-muted-foreground">
                Grounded in 1,400+ published Cambridge mark schemes with exact citations.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Mic className="size-4 text-emerald-500" /> Voice Discussion
              </span>
              <p className="text-[11px] text-muted-foreground">
                Speak your questions naturally via microphone and listen to voice explanations.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <PenLine className="size-4 text-amber-500" /> Auto-Draft Essays
              </span>
              <p className="text-[11px] text-muted-foreground">
                Convert any theoretical query into a complete Cambridge essay draft in 1 click.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="default" className="w-full sm:w-auto font-bold gap-2 shadow-md">
              <Link to="/payment" search={{ tier: "foundation", cycle: "monthly" }}>
                <Zap className="size-4" /> Unlock with Foundation (₹99/mo)
              </Link>
            </Button>
            <Button asChild variant="outline" size="default" className="w-full sm:w-auto font-semibold gap-2">
              <Link to="/pricing">
                View All Revision Plans <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto px-3 sm:px-6 py-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" /> Cambridge AI Grounded Chat
            </h1>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-mono">
              Grounded &amp; Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discuss Cambridge 9708 syllabus concepts with authentic mark scheme citations.
          </p>
        </div>

        {/* AI Engine Cost Controller Switch */}
        <div className="flex items-center gap-3 bg-muted/60 px-3 py-1.5 rounded-xl border border-border/80 text-xs self-start sm:self-auto">
          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-semibold transition-colors", !aiMode ? "text-primary font-bold" : "text-muted-foreground")}>
              ⚡ Fast RAG (0 Tokens)
            </span>
            <Switch
              checked={aiMode}
              onCheckedChange={(checked) => {
                setAiMode(checked);
                toast.info(
                  checked
                    ? "Deep AI Mode ON: Powered by Gemini Flash with syllabus grounding."
                    : "Fast RAG Mode ON: Zero AI tokens consumed, instant local corpus lookup."
                );
              }}
            />
            <span className={cn("text-[11px] font-semibold transition-colors", aiMode ? "text-primary font-bold" : "text-muted-foreground")}>
              🤖 Deep AI Co-Pilot
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([INITIAL_GREETING])}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
            title="Reset conversation"
          >
            <RefreshCw className="size-3" /> Clear
          </Button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isSpeaking = speakingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-3xl rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed transition-all shadow-xs",
                  isUser
                    ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                    : "bg-card border border-border/90 text-foreground rounded-bl-xs"
                )}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5 mb-3 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-xs font-mono">
                      <Bot className="size-3.5 text-primary" /> Cambridge Principal Examiner Co-Pilot
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                      {msg.costEstimate || (msg.usedAi ? "Gemini Flash" : "Zero-Token RAG")}
                    </span>
                  </div>
                )}

                {/* Message Body */}
                <div className="prose prose-xs dark:prose-invert max-w-none space-y-2 whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Grounding Sources Citations */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      <ShieldCheck className="size-3 text-emerald-500" />
                      Verified Cambridge Sources:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-foreground border border-border/50"
                        >
                          <BookOpen className="size-2.5 text-primary" />
                          <span>{s.title}</span>
                          {s.paperCode && (
                            <span className="text-primary font-bold">({s.paperCode})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Bar for Assistant Messages */}
                {!isUser && msg.id !== "greeting" && (
                  <div className="mt-3.5 pt-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {/* Text-to-Speech Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSpeak(msg.id, msg.content)}
                        className={cn(
                          "h-7 px-2 text-[11px] gap-1 cursor-pointer",
                          isSpeaking && "text-primary font-bold bg-primary/10"
                        )}
                        title={isSpeaking ? "Stop speaking" : "Listen aloud"}
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="size-3 text-amber-500" /> Stop
                          </>
                        ) : (
                          <>
                            <Volume2 className="size-3 text-muted-foreground" /> Listen
                          </>
                        )}
                      </Button>

                      {/* Copy Text Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="size-3 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> Copy
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Auto-Draft Essay Button */}
                    {msg.autoDraftPrompt && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenDraftModal(msg.autoDraftPrompt)}
                        className="h-7 px-2.5 text-[11px] font-bold gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 cursor-pointer shadow-2xs"
                      >
                        <PenLine className="size-3" />
                        <span>Auto-Draft Essay ({msg.autoDraftPrompt.marks}m)</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <span className="text-[10px] text-muted-foreground font-mono mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start">
            <div className="rounded-2xl rounded-bl-xs border border-border bg-card p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-primary font-bold">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>
                  {aiMode
                    ? "Deep AI Examiner vectorizing query & synthesizing..."
                    : "Zero-Cost Fast RAG matching Cambridge mark schemes..."}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Grounding against 1,400+ published Cambridge mark schemes &amp; 11 chapters.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">Suggested:</span>
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p)}
              disabled={isSending}
              className="rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground px-2.5 py-0.5 text-[11px] font-medium border border-border/60 transition-colors whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="pt-2 border-t border-border shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center gap-2"
        >
          {/* Voice Microphone Input Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleVoiceInput}
            className={cn(
              "size-11 shrink-0 rounded-xl transition-all cursor-pointer",
              isListening
                ? "bg-rose-500/20 border-rose-500 text-rose-600 animate-pulse ring-2 ring-rose-500/30"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={isListening ? "Listening... click to stop" : "Speak question via voice"}
          >
            {isListening ? <Mic className="size-5 text-rose-500 animate-bounce" /> : <Mic className="size-5" />}
          </Button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isListening
                ? "Listening to voice input..."
                : "Ask anything Cambridge 9708 (e.g. explain deadweight loss from tariffs, PED tax incidence)..."
            }
            disabled={isSending}
            className="flex-1 h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
          />

          <Button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="size-11 shrink-0 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer disabled:opacity-40"
          >
            <Send className="size-4" />
          </Button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 px-1 font-mono">
          <span>
            {aiMode ? "🤖 Deep AI Mode (Gemini Flash Grounded)" : "⚡ Fast RAG Mode (0 Token Cost · Local Corpus)"}
          </span>
          <span>100% Free for Paid Students</span>
        </div>
      </div>

      {/* Auto-Draft Cambridge Essay Dialog */}
      <Dialog open={draftModalOpen} onOpenChange={setDraftModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                Auto-Draft Cambridge Essay ({activeDraft?.marks || 12} Marks)
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">Grounded in Chat</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold mt-1 text-left">
              {activeDraft?.question}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-left">
              Generated following Cambridge AO1 Knowledge, AO2 Analysis causal chains, and AO3 Evaluation criteria.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs sm:text-sm leading-relaxed text-foreground font-serif whitespace-pre-wrap select-all">
              {activeDraft?.essayDraft}
            </div>
          </div>

          <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeDraft?.essayDraft && typeof navigator !== "undefined") {
                  navigator.clipboard.writeText(activeDraft.essayDraft);
                  setCopiedDraft(true);
                  toast.success("Essay draft copied!");
                  setTimeout(() => setCopiedDraft(false), 2000);
                }
              }}
              className="w-full sm:w-auto text-xs gap-1.5 cursor-pointer"
            >
              {copiedDraft ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copiedDraft ? "Copied" : "Copy Draft"}
            </Button>

            <Button
              type="button"
              onClick={handleTransferToGrader}
              className="w-full sm:w-auto text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
            >
              <PenLine className="size-3.5" />
              <span>Transfer to Essay Grader (/grade) →</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
