import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calculator as CalcIcon,
  X,
  Minus,
  Plus,
  Divide,
  Percent,
  RotateCcw,
  Copy,
  Check,
  History,
  TrendingUp,
  Sparkles,
  Equal,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}

interface McqCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function McqCalculator({ isOpen, onClose, className }: McqCalculatorProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "formulas" | "history">("standard");
  const [display, setDisplay] = useState<string>("0");
  const [expression, setExpression] = useState<string>("");
  const [memory, setMemory] = useState<number | null>(null);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [justCalculated, setJustCalculated] = useState<boolean>(false);

  // Quick Economics Formula States
  // 1. Percentage Change
  const [pctOld, setPctOld] = useState<string>("");
  const [pctNew, setPctNew] = useState<string>("");
  const [pctResult, setPctResult] = useState<{ value: number; label: string } | null>(null);

  // 2. PED (Price Elasticity of Demand)
  const [pedDeltaQ, setPedDeltaQ] = useState<string>("");
  const [pedDeltaP, setPedDeltaP] = useState<string>("");
  const [pedResult, setPedResult] = useState<{
    value: number;
    magnitude: number;
    type: "elastic" | "inelastic" | "unit" | "perfectly_inelastic" | "perfectly_elastic";
    commentary: string;
  } | null>(null);

  // 3. Multiplier (k = 1 / (1 - MPC))
  const [mpcVal, setMpcVal] = useState<string>("");
  const [multiplierResult, setMultiplierResult] = useState<{ k: number; commentary: string } | null>(null);

  // 4. Real GDP / Inflation Index
  const [nomVal, setNomVal] = useState<string>("");
  const [priceIndex, setPriceIndex] = useState<string>("100");
  const [realResult, setRealResult] = useState<{ real: number; inflationDeflator: number } | null>(null);

  // Dragging support
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Safe arithmetic evaluator
  const evaluateExpression = useCallback((exprStr: string): string => {
    try {
      // Replace display operators with JS operators
      let sanitized = exprStr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/\^/g, "**");

      // Validate allowed characters: numbers, operators, parentheses, decimals, spaces
      if (!/^[0-9+\-*/().\s**]+$/.test(sanitized)) {
        return "Error";
      }

      // Safe evaluation using Function with no globals
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized});`)();

      if (typeof result !== "number" || !Number.isFinite(result)) {
        return "Error";
      }

      // Format clean decimal (limit float precision issues)
      const formatted = Math.abs(result) < 1e-9 ? "0" : Number(result.toFixed(8)).toString();
      return formatted;
    } catch {
      return "Error";
    }
  }, []);

  const handleDigit = useCallback(
    (digit: string) => {
      setDisplay((prev) => {
        if (justCalculated) {
          setJustCalculated(false);
          setExpression("");
          return digit;
        }
        if (prev === "0" && digit !== ".") return digit;
        if (digit === "." && prev.includes(".")) return prev;
        if (prev.length > 16) return prev;
        return prev + digit;
      });
    },
    [justCalculated]
  );

  const handleOperator = useCallback(
    (op: string) => {
      setJustCalculated(false);
      if (display === "Error") {
        setDisplay("0");
        setExpression("");
        return;
      }
      setExpression((prev) => `${prev} ${display} ${op}`.trim());
      setDisplay("0");
    },
    [display]
  );

  const handleEquals = useCallback(() => {
    if (display === "Error") return;
    const fullExpr = expression ? `${expression} ${display}` : display;
    const res = evaluateExpression(fullExpr);

    if (res !== "Error") {
      setHistory((prev) => [
        {
          id: Math.random().toString(36).slice(2, 9),
          expression: fullExpr,
          result: res,
          timestamp: new Date(),
        },
        ...prev.slice(0, 19),
      ]);
      setExpression(`${fullExpr} =`);
      setDisplay(res);
      setJustCalculated(true);
    } else {
      setDisplay("Error");
    }
  }, [display, expression, evaluateExpression]);

  const handleClear = useCallback(() => {
    setDisplay("0");
    setExpression("");
    setJustCalculated(false);
  }, []);

  const handleBackspace = useCallback(() => {
    if (justCalculated) {
      handleClear();
      return;
    }
    setDisplay((prev) => {
      if (prev.length <= 1 || prev === "Error") return "0";
      return prev.slice(0, -1);
    });
  }, [justCalculated, handleClear]);

  const handleToggleSign = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "0" || prev === "Error") return prev;
      if (prev.startsWith("-")) return prev.slice(1);
      return `-${prev}`;
    });
  }, []);

  const handlePercentage = useCallback(() => {
    setDisplay((prev) => {
      const num = parseFloat(prev);
      if (isNaN(num)) return "0";
      return (num / 100).toString();
    });
  }, []);

  const handleSqrt = useCallback(() => {
    setDisplay((prev) => {
      const num = parseFloat(prev);
      if (isNaN(num) || num < 0) return "Error";
      return Math.sqrt(num).toString();
    });
  }, []);

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if student is typing in an input inside formulas tab or page
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (target.dataset.calcInput) {
          // let formula inputs take keys
          return;
        }
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        handleDigit(".");
      } else if (e.key === "+") {
        e.preventDefault();
        handleOperator("+");
      } else if (e.key === "-") {
        e.preventDefault();
        handleOperator("−");
      } else if (e.key === "*") {
        e.preventDefault();
        handleOperator("×");
      } else if (e.key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isMinimized, handleDigit, handleOperator, handleEquals, handleBackspace, onClose]);

  // Copy current display
  const copyDisplay = () => {
    if (display === "Error") return;
    navigator.clipboard.writeText(display);
    setCopied(true);
    toast.success(`Copied: ${display}`);
    setTimeout(() => setCopied(false), 1800);
  };

  // Push result to display
  const sendToDisplay = (val: number | string) => {
    setDisplay(val.toString());
    setExpression("");
    setActiveTab("standard");
    toast.info(`Inserted ${val} into desk calculator.`);
  };

  // Formula Solvers
  const computePctChange = () => {
    const o = parseFloat(pctOld);
    const n = parseFloat(pctNew);
    if (isNaN(o) || isNaN(n) || o === 0) {
      toast.error("Enter valid numeric old and new values (old ≠ 0).");
      return;
    }
    const delta = ((n - o) / Math.abs(o)) * 100;
    const sign = delta > 0 ? "+" : "";
    setPctResult({
      value: Number(delta.toFixed(3)),
      label: `${sign}${delta.toFixed(2)}%`,
    });
  };

  const computePed = () => {
    const dq = parseFloat(pedDeltaQ);
    const dp = parseFloat(pedDeltaP);
    if (isNaN(dq) || isNaN(dp) || dp === 0) {
      toast.error("Enter valid % change in Quantity and Price (%ΔP ≠ 0).");
      return;
    }
    const ped = dq / dp;
    const mag = Math.abs(ped);

    let type: "elastic" | "inelastic" | "unit" | "perfectly_inelastic" | "perfectly_elastic" = "inelastic";
    let commentary = "";

    if (mag > 1) {
      type = "elastic";
      commentary = "Price Elastic (|PED| > 1). Demand is responsive. Lowering price increases Total Revenue.";
    } else if (mag < 1 && mag > 0) {
      type = "inelastic";
      commentary = "Price Inelastic (|PED| < 1). Demand is unresponsive. Raising price increases Total Revenue.";
    } else if (mag === 1) {
      type = "unit";
      commentary = "Unit Elastic (|PED| = 1). %ΔQ equals %ΔP. Total revenue is maximized.";
    } else if (mag === 0) {
      type = "perfectly_inelastic";
      commentary = "Perfectly Inelastic (|PED| = 0). Demand curve is vertical.";
    }

    setPedResult({
      value: Number(ped.toFixed(3)),
      magnitude: Number(mag.toFixed(3)),
      type,
      commentary,
    });
  };

  const computeMultiplier = () => {
    const mpc = parseFloat(mpcVal);
    if (isNaN(mpc) || mpc >= 1 || mpc <= 0) {
      toast.error("Enter a valid Marginal Propensity to Consume (0 < MPC < 1).");
      return;
    }
    const k = 1 / (1 - mpc);
    setMultiplierResult({
      k: Number(k.toFixed(3)),
      commentary: `Multiplier k = 1 / (1 - ${mpc}) = ${k.toFixed(2)}. An injection of $100m yields an equilibrium income expansion of $${(100 * k).toFixed(1)}m.`,
    });
  };

  const computeRealGdp = () => {
    const nom = parseFloat(nomVal);
    const idx = parseFloat(priceIndex);
    if (isNaN(nom) || isNaN(idx) || idx === 0) {
      toast.error("Enter valid nominal output and price index (> 0).");
      return;
    }
    const real = (nom / idx) * 100;
    const deflator = idx;
    setRealResult({
      real: Number(real.toFixed(2)),
      inflationDeflator: deflator,
    });
  };

  // Drag listeners
  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, select, [role='tab']")) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position ? position.x : rect.left,
      posY: position ? position.y : rect.top,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 380, dragRef.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 500, dragRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  if (!isOpen) return null;

  // Minimized floating pill
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-5 right-5 z-50 animate-in fade-in zoom-in-95 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-card/95 border border-primary/30 text-foreground shadow-2xl backdrop-blur-xl hover:border-primary transition-all group">
          <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            <CalcIcon className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Cambridge Calculator
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {display !== "0" && display !== "Error" ? display : "Ready"}
            </span>
          </div>
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors ml-1" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px`, position: "fixed" }
          : undefined
      }
      className={cn(
        "z-50 w-[350px] sm:w-[380px] bg-card/95 text-foreground border border-border/80 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden transition-shadow duration-200 select-none animate-in fade-in slide-in-from-bottom-3",
        !position && "fixed bottom-6 right-4 sm:right-6",
        className
      )}
    >
      {/* Draggable Header */}
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-between p-3.5 px-4 bg-muted/40 border-b border-border/70 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <CalcIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold tracking-tight text-foreground">Cambridge 9708 Calc</h4>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/5">
                Official Exam Desk
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">AS & A2 Economics Multiple Choice</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
            title="Minimize to floating bubble"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-rose-500 rounded-lg"
            title="Close calculator (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="flex flex-col flex-1"
      >
        <div className="px-3 pt-2 bg-muted/20 border-b border-border/40">
          <TabsList className="grid grid-cols-3 h-8 bg-muted/60 p-0.5 rounded-xl">
            <TabsTrigger
              value="standard"
              className="text-[11px] font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg"
            >
              Standard
            </TabsTrigger>
            <TabsTrigger
              value="formulas"
              className="text-[11px] font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg"
            >
              Econ Solvers
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-[11px] font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg flex items-center gap-1"
            >
              <History className="h-3 w-3" />
              <span>History</span>
              {history.length > 0 && (
                <span className="h-4 w-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: STANDARD ARITHMETIC DESK CALCULATOR */}
        <TabsContent value="standard" className="p-3.5 space-y-3 m-0 flex flex-col focus-visible:outline-none">
          {/* Display Screen */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 shadow-inner flex flex-col justify-between min-h-[82px] text-right relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-1">
                {memory !== null && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/40 text-primary">
                    M: {memory}
                  </Badge>
                )}
              </div>
              <span className="truncate max-w-[240px] text-muted-foreground/80 font-mono">
                {expression || "\u00A0"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={copyDisplay}
                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md shrink-0"
                title="Copy current value"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>

              <div
                className={cn(
                  "font-mono font-bold tracking-tight truncate text-foreground",
                  display.length > 12 ? "text-xl" : display.length > 8 ? "text-2xl" : "text-3xl"
                )}
              >
                {display}
              </div>
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
            {/* Row 1: Memory & Clear */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMemory(null);
                toast.info("Memory cleared");
              }}
              className="h-9 text-[11px] font-bold bg-muted/40 hover:bg-muted text-muted-foreground"
            >
              MC
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (memory !== null) setDisplay(memory.toString());
              }}
              className="h-9 text-[11px] font-bold bg-muted/40 hover:bg-muted text-muted-foreground"
            >
              MR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const n = parseFloat(display);
                if (!isNaN(n)) {
                  setMemory((prev) => (prev ?? 0) + n);
                  toast.success(`M+ added (${display})`);
                }
              }}
              className="h-9 text-[11px] font-bold bg-muted/40 hover:bg-muted text-muted-foreground"
            >
              M+
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-9 text-[11px] font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30"
            >
              AC
            </Button>

            {/* Row 2: Secondary Functions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("(")}
              className="h-9 font-mono bg-card hover:bg-muted"
            >
              (
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator(")")}
              className="h-9 font-mono bg-card hover:bg-muted"
            >
              )
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePercentage}
              className="h-9 font-mono bg-card hover:bg-muted text-muted-foreground"
            >
              %
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("÷")}
              className="h-9 font-mono text-primary font-bold bg-primary/10 hover:bg-primary/20 border-primary/20"
            >
              ÷
            </Button>

            {/* Row 3: 7, 8, 9, × */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("7")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              7
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("8")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              8
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("9")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              9
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("×")}
              className="h-10 font-mono text-primary font-bold bg-primary/10 hover:bg-primary/20 border-primary/20"
            >
              ×
            </Button>

            {/* Row 4: 4, 5, 6, - */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("4")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              4
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("5")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              5
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("6")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              6
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("−")}
              className="h-10 font-mono text-primary font-bold bg-primary/10 hover:bg-primary/20 border-primary/20"
            >
              −
            </Button>

            {/* Row 5: 1, 2, 3, + */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("1")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("2")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              2
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("3")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              3
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("+")}
              className="h-10 font-mono text-primary font-bold bg-primary/10 hover:bg-primary/20 border-primary/20"
            >
              +
            </Button>

            {/* Row 6: ±, 0, ., = */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSign}
              className="h-10 font-mono bg-card hover:bg-muted text-muted-foreground"
            >
              ±
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("0")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              0
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit(".")}
              className="h-10 font-bold bg-card hover:bg-muted"
            >
              .
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleEquals}
              className="h-10 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
            >
              =
            </Button>
          </div>

          {/* Quick Helper Shortcut Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
            <span>Type keys directly or press Alt+C</span>
            <button
              onClick={handleBackspace}
              className="hover:text-foreground flex items-center gap-1 font-mono cursor-pointer"
            >
              <span>Backspace (⌫)</span>
            </button>
          </div>
        </TabsContent>

        {/* TAB 2: CAMBRIDGE 9708 ECONOMICS FORMULA SOLVERS */}
        <TabsContent value="formulas" className="p-3.5 space-y-4 m-0 overflow-y-auto max-h-[360px] focus-visible:outline-none">
          {/* Formula 1: % Change */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-primary" />
                Percentage Change
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">((New - Old)/Old) × 100</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Old Value</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. 100"
                  value={pctOld}
                  onChange={(e) => setPctOld(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">New Value</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. 125"
                  value={pctNew}
                  onChange={(e) => setPctNew(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button size="sm" onClick={computePctChange} className="h-7 text-xs font-semibold px-3">
                Calculate %Δ
              </Button>
              {pctResult && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">{pctResult.label}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToDisplay(pctResult.value)}
                    className="h-6 text-[10px] px-2"
                    title="Insert into desk calculator"
                  >
                    Insert
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Formula 2: PED / PES / YED Elasticities */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Elasticity Solver (PED / PES)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">%ΔQ / %ΔP</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">%Δ Quantity (Q)</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. -15"
                  value={pedDeltaQ}
                  onChange={(e) => setPedDeltaQ(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">%Δ Price (P)</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. +10"
                  value={pedDeltaP}
                  onChange={(e) => setPedDeltaP(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button size="sm" onClick={computePed} className="h-7 text-xs font-semibold px-3">
                Evaluate Elasticity
              </Button>
              {pedResult && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">{pedResult.value}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToDisplay(pedResult.value)}
                    className="h-6 text-[10px] px-2"
                  >
                    Insert
                  </Button>
                </div>
              )}
            </div>

            {pedResult && (
              <div className="p-2 rounded-xl bg-background/80 border border-border text-[11px] space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 border-primary/40 text-primary">
                    {pedResult.type.replace("_", " ")}
                  </Badge>
                  <span>Magnitude |PED| = {pedResult.magnitude}</span>
                </div>
                <p className="text-muted-foreground text-[10px] leading-snug">{pedResult.commentary}</p>
              </div>
            )}
          </div>

          {/* Formula 3: Multiplier (k) */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Keynesian Multiplier (k)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">k = 1 / (1 - MPC)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Marginal Propensity to Consume (MPC)</Label>
                <Input
                  type="number"
                  step="0.05"
                  data-calc-input="true"
                  placeholder="e.g. 0.8"
                  value={mpcVal}
                  onChange={(e) => setMpcVal(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <Button size="sm" onClick={computeMultiplier} className="h-7 text-xs font-semibold mt-4">
                Calculate k
              </Button>
            </div>

            {multiplierResult && (
              <div className="p-2 rounded-xl bg-background/80 border border-border text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Multiplier k = {multiplierResult.k}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToDisplay(multiplierResult.k)}
                    className="h-5 text-[9px] px-1.5"
                  >
                    Insert k
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{multiplierResult.commentary}</p>
              </div>
            )}
          </div>

          {/* Formula 4: Real GDP / Deflator */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Real GDP & Inflation Deflator
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">(Nominal / Index) × 100</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Nominal GDP ($m)</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. 550"
                  value={nomVal}
                  onChange={(e) => setNomVal(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Price Index (Base 100)</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. 110"
                  value={priceIndex}
                  onChange={(e) => setPriceIndex(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button size="sm" onClick={computeRealGdp} className="h-7 text-xs font-semibold px-3">
                Compute Real GDP
              </Button>
              {realResult && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">${realResult.real}m</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToDisplay(realResult.real)}
                    className="h-6 text-[10px] px-2"
                  >
                    Insert
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: CALCULATION TAPE & AUDIT LOG */}
        <TabsContent value="history" className="p-3.5 space-y-3 m-0 overflow-y-auto max-h-[360px] focus-visible:outline-none">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border/40">
            <span>Recent Exam Calculations</span>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-[11px] text-rose-500 hover:underline cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-1">
              <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs font-semibold text-foreground">No calculations logged yet</p>
              <p className="text-[11px] text-muted-foreground">
                Expressions solved on the keypad or formula solvers will record here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => sendToDisplay(item.result)}
                  className="p-2.5 rounded-xl bg-muted/30 border border-border/70 hover:border-primary/50 hover:bg-muted/60 transition-all cursor-pointer group flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-muted-foreground truncate">{item.expression}</div>
                    <div className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      = {item.result}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0 font-mono">
                    {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
