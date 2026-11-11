import { useState } from "react";
import {
  MessageSquarePlus,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  ThumbsUp,
} from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  submitFeedback,
  FEEDBACK_CATEGORIES,
  CATEGORY_DISPLAY_LABELS,
  type FeedbackCategory,
} from "@/lib/feedback.functions";
import { InteractiveBoyMascot } from "@/components/feedback/interactive-boy-mascot";
import { cn } from "@/lib/utils";

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
  defaultCategory?: FeedbackCategory;
  defaultSubject?: string;
  className?: string;
}

const CATEGORY_SHORT_LABELS: Record<FeedbackCategory, string> = {
  feedback: "Feedback",
  bug: "Bug Report",
  feature_request: "Feature",
  grading_question: "Grading",
  general: "General",
};

function CategoryIcon({
  category,
  className,
}: {
  category: FeedbackCategory;
  className?: string;
}) {
  switch (category) {
    case "bug":
      return <Bug className={className} />;
    case "feature_request":
      return <Lightbulb className={className} />;
    case "grading_question":
      return <HelpCircle className={className} />;
    case "feedback":
      return <Sparkles className={className} />;
    case "general":
    default:
      return <MessageSquarePlus className={className} />;
  }
}

export function FeedbackDialog({
  trigger,
  defaultCategory = "feedback",
  defaultSubject = "",
  className,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Interactive Mascot interaction state
  const [isTyping, setIsTyping] = useState(false);
  const [isHoveringSend, setIsHoveringSend] = useState(false);
  const [activeField, setActiveField] = useState<
    "category" | "subject" | "message" | "name" | "email" | null
  >(null);

  const sendFeedback = useServerFn(submitFeedback);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please provide a subject line.");
      return;
    }
    if (message.trim().length < 5) {
      toast.error("Please write a short message (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const pageUrl = typeof window !== "undefined" ? window.location.href : "";
      const res = await sendFeedback({
        data: {
          category,
          subject: subject.trim(),
          message: message.trim(),
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          pageUrl,
        },
      });

      if (res.ok) {
        toast.success("Thank you! Your message was sent directly to our team.");
        setMessage("");
        setSubject("");
        setOpen(false);
      } else {
        toast.error("Could not send feedback. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={
              className ||
              "h-8 gap-1.5 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-xs font-semibold text-foreground transition-all shadow-2xs hover:border-primary/50 whitespace-nowrap shrink-0"
            }
          >
            <MessageSquarePlus className="size-3.5 text-primary" />
            <span>Send Feedback</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px] md:max-w-[800px] p-0 overflow-hidden border border-border/80 shadow-2xl">
        <style>{`
          @keyframes dialogBugFlight {
            0% { transform: translate(0px, 0px) rotate(0deg); }
            20% { transform: translate(220px, -60px) rotate(35deg); }
            40% { transform: translate(160px, 160px) rotate(-20deg); }
            60% { transform: translate(-100px, 120px) rotate(45deg); }
            80% { transform: translate(-60px, -40px) rotate(-30deg); }
            100% { transform: translate(0px, 0px) rotate(0deg); }
          }
        `}</style>

        {/* ── Flying Bug over the entire dialog when 'bug' is selected ────── */}
        {category === "bug" && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div
              className="pointer-events-auto absolute z-40 cursor-pointer"
              style={{
                animation: "dialogBugFlight 12s infinite ease-in-out",
                top: "22%",
                left: "32%",
              }}
              onClick={() => {
                toast.success("🎯 You caught the bug! Describe what went wrong below.");
              }}
              title="Catch the bug!"
            >
              <div className="relative flex items-center justify-center p-2 group hover:scale-125 transition-transform">
                <div
                  className="absolute -top-1 left-1.5 h-3.5 w-2 rounded-full border border-sky-400/40 bg-sky-200/80 shadow-xs origin-bottom"
                  style={{ animation: "flutterLeft 0.08s infinite ease-in-out" }}
                />
                <div
                  className="absolute -top-1 right-1.5 h-3.5 w-2 rounded-full border border-sky-400/40 bg-sky-200/80 shadow-xs origin-bottom"
                  style={{ animation: "flutterRight 0.08s infinite ease-in-out" }}
                />
                <div className="relative flex h-5 w-4 items-center justify-center rounded-full border-2 border-emerald-950 bg-emerald-600 shadow-md">
                  <div className="size-1 rounded-full bg-yellow-300 animate-ping opacity-75" />
                </div>
                <div className="absolute -top-2 flex gap-1">
                  <div className="h-2 w-0.5 -rotate-25 rounded-full bg-emerald-900" />
                  <div className="h-2 w-0.5 rotate-25 rounded-full bg-emerald-900" />
                </div>
                <span className="absolute -bottom-3 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap opacity-80">
                  ~bzz!~
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row">
          {/* ── Left / Bottom-Left: The Boy Mascot Stage ────────────────── */}
          <div className="hidden sm:flex flex-col justify-between w-64 md:w-72 bg-gradient-to-b from-primary/[0.08] via-card to-primary/[0.04] p-5 border-r border-border/60 relative overflow-hidden shrink-0">
            {/* Ambient Background Aura */}
            <div className="pointer-events-none absolute -left-8 -top-8 size-36 rounded-full bg-primary/10 blur-2xl" />

            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-primary tracking-wide uppercase">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Student Mascot
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Always here to react and send your message to the Marginal team.
              </p>
            </div>

            {/* Mascot Character standing quite big */}
            <div className="relative z-10 flex flex-col items-center justify-end pt-3">
              <InteractiveBoyMascot
                category={category}
                isTyping={isTyping}
                isSubmitting={submitting}
                isHoveringSend={isHoveringSend}
                activeField={activeField}
                className="w-full"
                onBugClick={() => {
                  toast.success("🎯 You caught the bug! Describe what went wrong below.");
                }}
              />
            </div>
          </div>

          {/* ── Right: Form & Controls ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 p-5 sm:p-6 max-h-[88vh] overflow-y-auto">
            <DialogHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="size-4" />
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Direct Message to Marginal Team
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Share ideas, report bugs, ask questions about grading, or request features. Your message goes directly to our core developers and examiners.
              </DialogDescription>
            </DialogHeader>

            {/* Mobile Mascot banner (visible on phone screens < sm) */}
            <div className="sm:hidden flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/[0.04] mt-3">
              <div className="w-24 shrink-0">
                <InteractiveBoyMascot
                  category={category}
                  isTyping={isTyping}
                  isSubmitting={submitting}
                  isHoveringSend={isHoveringSend}
                  activeField={activeField}
                  className="w-full h-32"
                />
              </div>
              <div className="text-xs space-y-0.5 min-w-0">
                <p className="font-bold text-foreground">Marginal Mascot</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {category === "bug"
                    ? "Catch the bug flying around!"
                    : category === "feature_request"
                    ? "Great idea! What should we build?"
                    : "Tell our engineers anything!"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-3">
              {/* Category Quick Chips */}
              <div className="space-y-1.5">
                <Label htmlFor="feedback-category" className="text-xs font-semibold flex items-center justify-between">
                  <span>Category</span>
                  <span className="text-[10.5px] text-muted-foreground font-normal">
                    Select to see mascot reactions
                  </span>
                </Label>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 gap-1.5">
                  {FEEDBACK_CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          setActiveField("category");
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all text-left cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                            : "border-border/70 bg-card hover:bg-muted/70 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <CategoryIcon
                          category={cat}
                          className={cn(
                            "size-3.5 shrink-0",
                            isSelected ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate">{CATEGORY_SHORT_LABELS[cat]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="feedback-subject" className="text-xs font-semibold">
                  Subject
                </Label>
                <Input
                  id="feedback-subject"
                  placeholder="e.g. Question regarding AO2 scoring in 12-mark essay"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setIsTyping(true);
                  }}
                  onFocus={() => setActiveField("subject")}
                  onBlur={() => {
                    setActiveField(null);
                    setIsTyping(false);
                  }}
                  className="h-8 text-xs"
                  required
                />
              </div>

              {/* Your Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feedback-message" className="text-xs font-semibold">
                    Your Message
                  </Label>
                  <span className="text-[10.5px] font-mono text-muted-foreground">
                    {message.length} chars
                  </span>
                </div>
                <Textarea
                  id="feedback-message"
                  placeholder="Tell us what you noticed, what could be improved, or how we can help..."
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setIsTyping(true);
                  }}
                  onFocus={() => setActiveField("message")}
                  onBlur={() => {
                    setActiveField(null);
                    setIsTyping(false);
                  }}
                  className="min-h-[110px] text-xs resize-none"
                  required
                />
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="feedback-name" className="text-[11px] text-muted-foreground">
                    Your Name (optional)
                  </Label>
                  <Input
                    id="feedback-name"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setActiveField("name")}
                    onBlur={() => setActiveField(null)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="feedback-email" className="text-[11px] text-muted-foreground">
                    Your Email (optional)
                  </Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    placeholder="name@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setActiveField("email")}
                    onBlur={() => setActiveField(null)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 text-xs"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !subject.trim() || message.trim().length < 5}
                  onMouseEnter={() => setIsHoveringSend(true)}
                  onMouseLeave={() => setIsHoveringSend(false)}
                  className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="size-3" />
                      Send to Team
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Floating feedback pill fixed at bottom-right corner of screen.
 * Intentionally hidden on MCQ live practice and exam routes so it never covers answers or controls.
 */
export function FloatingFeedbackPill() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [dismissed, setDismissed] = useState(false);

  // Never render on exam/practice/marking workspaces so it never covers answers, candidate text, or action buttons
  const isWorkspace =
    pathname.startsWith("/mcq") ||
    pathname.startsWith("/data-response") ||
    pathname.startsWith("/live-examiner") ||
    pathname.startsWith("/grade") ||
    pathname.startsWith("/examiner") ||
    pathname.startsWith("/practice");

  if (dismissed || isWorkspace) {
    return null;
  }

  return (
    <div
      className="fixed z-50 hidden sm:flex items-center gap-1"
      style={{
        bottom: "clamp(1rem, 2.5vw, 1.5rem)",
        right: "calc(clamp(1rem, 2.5vw, 1.5rem) + 52px)",
        height: "44px",
      }}
    >
      <FeedbackDialog
        trigger={
          <button
            type="button"
            className="group flex h-[40px] items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur transition-all duration-200 hover:border-primary/60 hover:bg-card hover:scale-105 active:scale-95 cursor-pointer"
            title="Send direct feedback or communicate with Marginal team"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <MessageSquarePlus className="size-3.5 text-primary transition-transform group-hover:rotate-12" />
            <span>Message Us</span>
          </button>
        }
      />
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex size-6 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm cursor-pointer"
        title="Hide message button"
        aria-label="Hide message button"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
