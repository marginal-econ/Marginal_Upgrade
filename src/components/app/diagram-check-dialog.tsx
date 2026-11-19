import {
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Images,
  LineChart,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { detectDiagramRequirement } from "@/lib/diagram-prompt";
import { cn } from "@/lib/utils";

export interface DiagramCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  essayText?: string;
  onAddDiagram: () => void;
  onProceedAnyway: () => void;
}

export function DiagramCheckDialog({
  open,
  onOpenChange,
  question,
  essayText = "",
  onAddDiagram,
  onProceedAnyway,
}: DiagramCheckDialogProps) {
  const req = detectDiagramRequirement(question, essayText);
  const isUrgent = req.isExplicitlyRequested || req.isMentionedInScript;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border border-border/80 shadow-2xl bg-card">
        {/* Top vibrant header accent band */}
        <div
          className={cn(
            "h-1.5 w-full",
            isUrgent
              ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
              : "bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500",
          )}
        />

        <div className="p-5 sm:p-6 space-y-4">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              {isUrgent ? (
                <Badge
                  variant="outline"
                  className="bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold uppercase tracking-wider gap-1.5 px-2.5 py-0.5"
                >
                  <AlertTriangle className="size-3.5" />
                  {req.isExplicitlyRequested ? "Diagram Explicitly Requested" : "Figure Mentioned in Text"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[11px] font-bold uppercase tracking-wider gap-1.5 px-2.5 py-0.5"
                >
                  <LineChart className="size-3.5" />
                  Cambridge Diagram Check
                </Badge>
              )}
            </div>

            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {isUrgent ? "Check Your Diagrams Before Marking" : "Did you remember to add your diagram?"}
            </DialogTitle>

            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isUrgent ? (
                <>
                  This exam prompt specifically instructs diagrammatic analysis{" "}
                  {req.matchedPhrase ? (
                    <strong className="text-foreground">(&ldquo;{req.matchedPhrase}&rdquo;)</strong>
                  ) : null}
                  , but no diagram is currently attached to your submission.
                </>
              ) : (
                "You are about to mark this essay without any attached diagrams. Cambridge 9708 examiners reward diagrams and visual models in AO2 analysis."
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Cambridge Marking Impact Box */}
          <div
            className={cn(
              "rounded-xl p-3.5 sm:p-4 text-xs leading-relaxed border space-y-2 transition-all",
              isUrgent
                ? "bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30 text-amber-900 dark:text-amber-200"
                : "bg-purple-500/10 dark:bg-purple-950/20 border-purple-500/30 text-purple-950 dark:text-purple-200",
            )}
          >
            <div className="flex items-start gap-2.5">
              {isUrgent ? (
                <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
              ) : (
                <HelpCircle className="size-4 shrink-0 text-purple-500 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-semibold block text-[13px]">
                  {isUrgent ? "Cambridge Examiner Impact:" : "Why diagrams matter in Cambridge 9708:"}
                </span>
                <p className="opacity-90">
                  {isUrgent
                    ? "Submitting an essay without the requested diagram will strictly cap your AO2 Analysis marks (typically to Level 2: max 8/12 on 20-mark Paper 4 essays or 4/6 on 12-mark Paper 2 essays)."
                    : "Accurate diagrams demonstrate core causal chains. If you drew or referred to an economic graph, attach it now so our dual examiners can credit your visual models."}
                </p>
              </div>
            </div>
          </div>

          {/* Question Excerpt Preview */}
          {question.trim() ? (
            <div className="rounded-lg bg-muted/50 border border-border/70 p-3 text-xs text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 block mb-1">
                Question Preview
              </span>
              <p className="line-clamp-2 italic text-foreground/90 font-medium text-xs">
                &ldquo;{question.trim()}&rdquo;
              </p>
            </div>
          ) : null}

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onProceedAnyway();
              }}
              className="h-10 text-xs sm:text-sm font-medium border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
            >
              Grade without Diagram
            </Button>

            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onAddDiagram();
              }}
              className="h-10 text-xs sm:text-sm font-semibold gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Images className="size-4 shrink-0 text-amber-300" />
              <span>Add / Attach Diagram Now</span>
              <ArrowRight className="size-3.5 opacity-80" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
