import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  ShieldCheck,
  Check,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  getMyStudentThread,
  sendStudentTextMessage,
  getUnreadMessageCount,
  markConversationAsRead,
  type DirectMessage,
} from "@/lib/messages.functions";

interface StudentMessagesDialogProps {
  trigger?: React.ReactNode;
}

export function playMessageNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    /* ignore audio error */
  }
}

export function StudentMessagesDialog({ trigger }: StudentMessagesDialogProps) {
  const queryClient = useQueryClient();
  const getThreadFn = useServerFn(getMyStudentThread);
  const sendStudentMsgFn = useServerFn(sendStudentTextMessage);
  const getUnreadFn = useServerFn(getUnreadMessageCount);
  const markReadFn = useServerFn(markConversationAsRead);

  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unread badge query (polls every 3s for fast alert delivery; pauses while open to avoid race conditions)
  const unreadQuery = useQuery({
    queryKey: ["student-unread-count"],
    queryFn: () => getUnreadFn(),
    refetchInterval: open ? false : 3_000,
  });

  const unreadCount = open ? 0 : (unreadQuery.data?.unreadCount ?? 0);

  // Handle opening and immediate unread clearance
  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setIsBlinking(false);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);

      // Instantly clear unread count in client cache so badge disappears immediately
      queryClient.setQueryData<{ unreadCount: number }>(["student-unread-count"], { unreadCount: 0 });

      // Persist read state to backend DB
      try {
        await markReadFn({ data: {} });
      } catch (err) {
        console.warn("Failed to mark messages as read:", err);
      }

      // Re-sync after backend update completes
      queryClient.invalidateQueries({ queryKey: ["student-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["student-messages-thread"] });

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  };

  // Active notification detection & 5-second blink handling
  useEffect(() => {
    if (prevCountRef.current === null) {
      if (unreadCount > 0 && !open) {
        setIsBlinking(true);
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = setTimeout(() => {
          setIsBlinking(false);
        }, 5000);

        playMessageNotificationChime();
        toast.info("New message from Marginal Team", {
          description: "You have a direct message from our examiners. Click to open.",
          action: {
            label: "View Chat",
            onClick: () => handleOpenChange(true),
          },
          duration: 8000,
        });
      }
      prevCountRef.current = unreadCount;
      return;
    }

    if (unreadCount > prevCountRef.current && !open) {
      // Blink for 5 seconds when new message arrives, then turn into static badge
      setIsBlinking(true);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(false);
      }, 5000);

      playMessageNotificationChime();
      toast.info("New message from Marginal Team", {
        description: "You have a direct message from our examiners. Click to open.",
        action: {
          label: "View Chat",
          onClick: () => handleOpenChange(true),
        },
        duration: 8000,
      });

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Marginal Economics Team", {
            body: "You received a new message from our examiners.",
            icon: "/marginal-m-icon-clean.png",
          });
        } catch {
          /* fallback */
        }
      }
    } else if (unreadCount === 0) {
      setIsBlinking(false);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    }

    prevCountRef.current = unreadCount;
  }, [unreadCount, open]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Chat thread query (refetches when open)
  const threadQuery = useQuery({
    queryKey: ["student-messages-thread"],
    queryFn: () => getThreadFn(),
    enabled: open,
    refetchInterval: open ? 4_000 : false,
  });

  const messages: DirectMessage[] = threadQuery.data?.messages ?? [];

  useEffect(() => {
    if (open) {
      setIsBlinking(false);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages.length]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendStudentMsgFn({ data: { text } }),
    onSuccess: () => {
      setInputText("");
      queryClient.invalidateQueries({ queryKey: ["student-messages-thread"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send message.");
    },
  });

  const handleSend = () => {
    if (!inputText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(inputText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          <div className="relative w-full cursor-pointer">
            {trigger}
            {unreadCount > 0 && !open && (
              isBlinking ? (
                <>
                  <span className="absolute top-2 right-2 flex size-2.5 rounded-full bg-rose-500 animate-ping pointer-events-none" />
                  <span className="absolute top-2 right-2 flex size-2.5 rounded-full bg-rose-500 animate-pulse pointer-events-none" />
                </>
              ) : (
                <span className="absolute top-1.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs pointer-events-none">
                  {unreadCount}
                </span>
              )
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "relative h-8 gap-1.5 rounded-full border-border/80 text-xs font-semibold transition-all",
              unreadCount > 0 && !open && isBlinking &&
                "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)] animate-pulse",
              unreadCount > 0 && !open && !isBlinking &&
                "border-rose-500/30 text-foreground"
            )}
          >
            <MessageSquare className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Messages</span>
            {unreadCount > 0 && !open && (
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs",
                  isBlinking && "animate-bounce"
                )}
              >
                {unreadCount}
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col h-[580px] max-h-[85vh] rounded-3xl border border-border/80 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 px-5 border-b border-border/70 bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <span>Marginal Team Direct Chat</span>
                  <Badge variant="outline" className="text-[10px] text-primary bg-primary/10 border-primary/20 font-bold px-1.5 py-0">
                    Official Support
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Two-way channel with Cambridge 9708 examiners & developers</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0 bg-background/50">
          {threadQuery.isLoading ? (
            <div className="space-y-3 py-6">
              <div className="h-12 w-2/3 bg-muted/60 rounded-2xl animate-pulse" />
              <div className="h-12 w-2/3 ml-auto bg-muted/60 rounded-2xl animate-pulse" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 text-muted-foreground">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <MessageSquare className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Welcome to Direct Messaging!</h4>
                <p className="text-xs max-w-xs leading-relaxed text-muted-foreground">
                  Have a question about Cambridge 9708 essay scoring, past paper answers, or need account help? Text our team directly here!
                </p>
              </div>

              {/* Starter chips */}
              <div className="flex flex-col gap-1.5 w-full max-w-xs pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Suggested inquiries:</span>
                {[
                  "How do I interpret my 20-mark evaluation?",
                  "Question regarding Cambridge mark schemes",
                  "Feedback on MCQ past papers",
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(chip)}
                    className="text-left text-xs p-2 rounded-xl bg-card border border-border/70 hover:border-primary/50 text-foreground hover:bg-muted/50 transition-all cursor-pointer font-medium"
                  >
                    "{chip}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.sender === "admin";
              const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                >
                  <div className="flex items-center gap-1 px-1 pb-1 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {isAdmin ? "Marginal Team" : "You"}
                    </span>
                    <span>•</span>
                    <span>{timeStr}</span>
                    {!isAdmin && <CheckCheck className="size-3 text-primary ml-0.5" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-xs",
                      isAdmin
                        ? "bg-card border border-border/80 text-foreground rounded-tl-xs"
                        : "bg-primary text-primary-foreground rounded-tr-xs"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 sm:p-4 border-t border-border/70 bg-card/80 backdrop-blur-md shrink-0 space-y-1.5">
          <div className="relative">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message to Marginal Team… (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="pr-12 text-xs resize-none bg-background rounded-2xl border-input focus:border-primary"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sendMutation.isPending || !inputText.trim()}
              className="absolute right-2.5 bottom-2.5 size-8 p-0 rounded-xl bg-primary text-primary-foreground shadow-xs hover:opacity-90"
            >
              {sendMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>Official response within platform hours</span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
