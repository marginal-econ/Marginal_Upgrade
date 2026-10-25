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
  type DirectMessage,
} from "@/lib/messages.functions";

interface StudentMessagesDialogProps {
  trigger?: React.ReactNode;
}

export function StudentMessagesDialog({ trigger }: StudentMessagesDialogProps) {
  const queryClient = useQueryClient();
  const getThreadFn = useServerFn(getMyStudentThread);
  const sendStudentMsgFn = useServerFn(sendStudentTextMessage);
  const getUnreadFn = useServerFn(getUnreadMessageCount);

  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Unread badge query
  const unreadQuery = useQuery({
    queryKey: ["student-unread-count"],
    queryFn: () => getUnreadFn(),
    refetchInterval: 15_000,
  });

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;

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
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // Invalidate unread count since we opened the thread
      queryClient.invalidateQueries({ queryKey: ["student-unread-count"] });
    }
  }, [open, messages.length, queryClient]);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="relative h-8 gap-1.5 rounded-full border-border/80 text-xs font-semibold"
          >
            <MessageSquare className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Messages</span>
            {unreadCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden flex flex-col h-[560px] max-h-[85vh]">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border/70 bg-card/70 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
                  <span>Marginal Team Direct Chat</span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    Official Support
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                  Direct two-way channel with our economics examiners &amp; developers.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-background/50">
          {threadQuery.isLoading ? (
            <div className="space-y-3 py-6">
              <div className="h-10 w-2/3 bg-muted rounded-2xl animate-pulse" />
              <div className="h-10 w-2/3 ml-auto bg-muted rounded-2xl animate-pulse" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-muted-foreground">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="size-5" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">Welcome to Direct Messaging!</h4>
              <p className="text-[11px] max-w-xs leading-relaxed">
                Have a question about Cambridge 9708, essay scoring, or need support? Text us directly here and our team will reply in the app!
              </p>
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
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                      isAdmin
                        ? "bg-card border border-border text-foreground rounded-tl-xs"
                        : "bg-primary text-primary-foreground rounded-tr-xs"
                    }`}
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
        <div className="p-3 border-t border-border/70 bg-card/70 shrink-0 space-y-1.5">
          <div className="relative">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message to Marginal Team… (Enter to send)"
              rows={2}
              className="pr-10 text-xs resize-none"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sendMutation.isPending || !inputText.trim()}
              className="absolute right-2 bottom-2 size-7 p-0"
            >
              {sendMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            Press Enter to send
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
