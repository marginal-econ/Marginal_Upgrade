import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Coins,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Globe,
  HelpCircle,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Unlock,
  Wrench,
  Zap,
  Camera,
  Bot,
  LineChart,
  Scale,
  School,
  Timer,
  BookOpen,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getPlatformPricing,
  updatePlatformPricing,
  adminDeletePlatformTier,
  adminResetPlatformPricing,
  adminManageUserCredits,
} from "@/lib/pricing.functions";
import {
  DEFAULT_PRICING_PLANS,
  type PlanRestrictions,
  type PricingTierConfig,
} from "@/lib/pricing-plans";

const DEFAULT_RESTRICTIONS: PlanRestrictions = {
  allowHandwritingOcr: false,
  allowModelAnswers: false,
  allowDiagramStudio: true,
  allowArbitration: false,
  allowClassrooms: false,
  allowPriorityQueue: false,
  mcqAccessLevel: "full",
  maxEssayWords: 2000,
  dailyEssayLimit: 0,
};

export function PricingAdminPanel() {
  const queryClient = useQueryClient();
  const getPricingFn = useServerFn(getPlatformPricing);
  const updatePricingFn = useServerFn(updatePlatformPricing);
  const deleteTierFn = useServerFn(adminDeletePlatformTier);
  const resetPricingFn = useServerFn(adminResetPlatformPricing);
  const manageUserCreditsFn = useServerFn(adminManageUserCredits);

  const pricingQuery = useQuery({
    queryKey: ["platform-pricing"],
    queryFn: () => getPricingFn(),
    staleTime: 30_000,
  });

  const activePlans: Record<string, PricingTierConfig> =
    pricingQuery.data?.plans ?? DEFAULT_PRICING_PLANS;

  // Local form state for in-place editing
  const [tierForms, setTierForms] = useState<Record<string, PricingTierConfig>>({});
  const [expandedRestrictions, setExpandedRestrictions] = useState<Record<string, boolean>>({});

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");

  // Create new plan modal
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<{
    id: string;
    name: string;
    tagline: string;
    badge: string;
    monthlyPrice: number;
    annualPrice: number;
    essaysPerMonth: number;
    liveCredits: number;
    hasExperimentalLabs: boolean;
    isPublic: boolean;
    restrictions: PlanRestrictions;
  }>({
    id: "",
    name: "",
    tagline: "",
    badge: "Exclusive",
    monthlyPrice: 299,
    annualPrice: 2499,
    essaysPerMonth: 20,
    liveCredits: 6,
    hasExperimentalLabs: false,
    isPublic: false, // Default to private / unlisted as requested!
    restrictions: { ...DEFAULT_RESTRICTIONS },
  });

  // User credit granting state
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedUserTier, setSelectedUserTier] = useState<string>("pro");
  const [bonusLiveCredits, setBonusLiveCredits] = useState<number>(0);
  const [bonusEssays, setBonusEssays] = useState<number>(0);
  const [resetUsage, setResetUsage] = useState<boolean>(false);

  const getTierState = (tierKey: string): PricingTierConfig => {
    if (tierForms[tierKey]) return tierForms[tierKey];
    const base = activePlans[tierKey] || (DEFAULT_PRICING_PLANS as any)[tierKey] || {
      name: tierKey,
      tagline: "Custom plan",
      monthlyPrice: 0,
      annualPrice: 0,
      annualEquivalentMonthly: 0,
      savePct: 0,
      essaysPerMonth: 10,
      liveCredits: 2,
      hasExperimentalLabs: false,
      isPublic: true,
      features: [],
      restrictions: { ...DEFAULT_RESTRICTIONS },
    };
    return {
      ...base,
      restrictions: {
        ...DEFAULT_RESTRICTIONS,
        ...(base.restrictions || {}),
      },
    };
  };

  const updateTierMutation = useMutation({
    mutationFn: (data: {
      tier: string;
      name?: string;
      tagline?: string;
      monthlyPrice: number;
      annualPrice: number;
      essaysPerMonth: number;
      liveCredits: number;
      hasExperimentalLabs?: boolean;
      isPublic?: boolean;
      badge?: string;
      restrictions?: PlanRestrictions;
    }) => updatePricingFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Plan updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["platform-pricing"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update pricing."),
  });

  const deleteTierMutation = useMutation({
    mutationFn: (tierKey: string) => deleteTierFn({ data: { tier: tierKey } }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Plan deleted.");
      queryClient.invalidateQueries({ queryKey: ["platform-pricing"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete plan."),
  });

  const resetPricingMutation = useMutation({
    mutationFn: () => resetPricingFn(),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Pricing reset to platform defaults.");
      setTierForms({});
      queryClient.invalidateQueries({ queryKey: ["platform-pricing"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to reset pricing."),
  });

  const manageCreditsMutation = useMutation({
    mutationFn: (data: {
      userId: string;
      tier?: any;
      bonusLiveCredits?: number;
      bonusEssays?: number;
      resetUsageCount?: boolean;
    }) => manageUserCreditsFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "User subscription and credits updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setBonusLiveCredits(0);
      setBonusEssays(0);
      setResetUsage(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update user credits."),
  });

  // Compute tier metrics
  const allTierKeys = Object.keys(activePlans);
  const publicCount = allTierKeys.filter((k) => activePlans[k].isPublic !== false).length;
  const privateCount = allTierKeys.filter((k) => activePlans[k].isPublic === false).length;

  const filteredTierKeys = useMemo(() => {
    return allTierKeys.filter((k) => {
      const plan = activePlans[k];
      if (visibilityFilter === "public" && plan.isPublic === false) return false;
      if (visibilityFilter === "private" && plan.isPublic !== false) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = plan.name.toLowerCase().includes(q);
        const matchesKey = k.toLowerCase().includes(q);
        const matchesTag = plan.tagline?.toLowerCase().includes(q);
        if (!matchesName && !matchesKey && !matchesTag) return false;
      }
      return true;
    });
  }, [allTierKeys, activePlans, visibilityFilter, searchQuery]);

  const handleCreatePlan = () => {
    const slug = newPlan.id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    if (!slug) {
      toast.error("Please enter a valid unique plan identifier / slug.");
      return;
    }
    if (!newPlan.name.trim()) {
      toast.error("Please enter a plan display name.");
      return;
    }

    updateTierMutation.mutate(
      {
        tier: slug,
        name: newPlan.name,
        tagline: newPlan.tagline || `${newPlan.name} membership tier`,
        badge: newPlan.badge,
        monthlyPrice: Number(newPlan.monthlyPrice),
        annualPrice: Number(newPlan.annualPrice),
        essaysPerMonth: Number(newPlan.essaysPerMonth),
        liveCredits: Number(newPlan.liveCredits),
        hasExperimentalLabs: newPlan.hasExperimentalLabs,
        isPublic: newPlan.isPublic,
        restrictions: newPlan.restrictions,
      },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          setNewPlan({
            id: "",
            name: "",
            tagline: "",
            badge: "Exclusive",
            monthlyPrice: 299,
            annualPrice: 2499,
            essaysPerMonth: 20,
            liveCredits: 6,
            hasExperimentalLabs: false,
            isPublic: false,
            restrictions: { ...DEFAULT_RESTRICTIONS },
          });
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      {/* Superadmin Status Notice */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Administrator Root: Marginal Admin
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Admin account operates with <strong>Uncapped Godmode</strong>. Zero credit counters, no daily essay caps, and unrestricted bypass across all candidate features and experimental labs.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-mono">
            Uncapped · 0 Limits
          </Badge>
        </div>
      </div>

      {/* Dynamic Tier Pricing & Feature Restrictions Center */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Coins className="size-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                Dynamic Pricing Plans &amp; Feature Restrictions
              </h2>
              {pricingQuery.data?.isCustom ? (
                <Badge variant="outline" className="text-[11px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                  Custom DB Config Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] border-muted-foreground/30 text-muted-foreground font-mono">
                  Default Platform Config
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Configure student pricing, monthly essay allowances, Live Examiner credit quotas, and granular feature restrictions. Control which plans are public on <code className="text-primary font-mono text-[11px]">/pricing</code> and which are kept private / unlisted.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <Plus className="size-3.5" />
              <span>Create New Plan</span>
            </Button>

            {pricingQuery.data?.isCustom && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Reset all platform pricing plans back to the default configuration? Custom plans will be cleared.")) {
                    resetPricingMutation.mutate();
                  }
                }}
                disabled={resetPricingMutation.isPending}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset Defaults</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter and Quick Stats Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-xl border border-border/60">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setVisibilityFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                visibilityFilter === "all"
                  ? "bg-background text-foreground shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40",
              )}
            >
              All Plans ({allTierKeys.length})
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter("public")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                visibilityFilter === "public"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40",
              )}
            >
              <Globe className="size-3 text-emerald-500" />
              Public on /pricing ({publicCount})
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter("private")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                visibilityFilter === "private"
                  ? "bg-background text-purple-600 dark:text-purple-400 shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40",
              )}
            >
              <Lock className="size-3 text-purple-500" />
              Private / Unlisted ({privateCount})
            </button>
          </div>

          <div className="relative sm:w-60 shrink-0">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search plan by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {filteredTierKeys.map((tierKey) => {
            const plan = activePlans[tierKey];
            const current = getTierState(tierKey);
            const isSaving = updateTierMutation.isPending && updateTierMutation.variables?.tier === tierKey;
            const isExpanded = Boolean(expandedRestrictions[tierKey]);
            const isCustomOrUnlisted = !["foundation", "scholar_plus", "pro", "mastery", "elite"].includes(tierKey);

            // Count enabled restrictions
            const restrictions = current.restrictions || DEFAULT_RESTRICTIONS;
            const enabledCount = [
              restrictions.allowHandwritingOcr,
              restrictions.allowModelAnswers,
              restrictions.allowDiagramStudio,
              restrictions.allowArbitration,
              restrictions.allowClassrooms,
              restrictions.allowPriorityQueue,
              current.hasExperimentalLabs,
            ].filter(Boolean).length;

            return (
              <div
                key={tierKey}
                className={cn(
                  "flex flex-col justify-between rounded-2xl border p-5 space-y-4 shadow-xs transition-all",
                  current.isPublic === false
                    ? "border-purple-500/30 bg-purple-500/[0.02]"
                    : "border-border/90 bg-card",
                )}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-primary">
                          {tierKey}
                        </span>
                        {current.isPublic === false ? (
                          <Badge className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 gap-1">
                            <Lock className="size-2.5" />
                            Private / Unlisted
                          </Badge>
                        ) : (
                          <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 gap-1">
                            <Globe className="size-2.5" />
                            Public
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-foreground mt-1">
                        {current.name || plan.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {current.tagline || plan.tagline}
                      </p>
                    </div>

                    {isCustomOrUnlisted && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                        title="Delete custom plan"
                        onClick={() => {
                          if (confirm(`Delete plan "${current.name || tierKey}"?`)) {
                            deleteTierMutation.mutate(tierKey);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Visibility & Badge row */}
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 p-2.5 border border-border/60 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                        {current.isPublic !== false ? (
                          <>
                            <Eye className="size-3 text-emerald-500" />
                            Public on /pricing
                          </>
                        ) : (
                          <>
                            <EyeOff className="size-3 text-purple-500" />
                            Hidden / Private
                          </>
                        )}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {current.isPublic !== false
                          ? "Visible to all visitors"
                          : "Accessible only via admin or direct link"}
                      </p>
                    </div>
                    <Switch
                      checked={current.isPublic !== false}
                      onCheckedChange={(val) =>
                        setTierForms((prev) => ({
                          ...prev,
                          [tierKey]: { ...current, isPublic: val },
                        }))
                      }
                    />
                  </div>

                  {/* Pricing Inputs */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Monthly (₹)</Label>
                      <Input
                        type="number"
                        value={current.monthlyPrice}
                        onChange={(e) =>
                          setTierForms((prev) => ({
                            ...prev,
                            [tierKey]: { ...current, monthlyPrice: Number(e.target.value) },
                          }))
                        }
                        className="h-8 text-xs font-semibold tabular-nums mt-1"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] text-muted-foreground">Annual (₹)</Label>
                        {current.annualPrice > 0 && current.monthlyPrice > 0 && (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            Save {Math.max(0, Math.round((1 - current.annualPrice / (current.monthlyPrice * 12)) * 100))}%
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        value={current.annualPrice}
                        onChange={(e) =>
                          setTierForms((prev) => ({
                            ...prev,
                            [tierKey]: { ...current, annualPrice: Number(e.target.value) },
                          }))
                        }
                        className="h-8 text-xs font-semibold tabular-nums mt-1"
                      />
                    </div>
                  </div>

                  {/* Quotas Inputs */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Essays / Mo</Label>
                      <Input
                        type="number"
                        value={current.essaysPerMonth}
                        onChange={(e) =>
                          setTierForms((prev) => ({
                            ...prev,
                            [tierKey]: { ...current, essaysPerMonth: Number(e.target.value) },
                          }))
                        }
                        className="h-8 text-xs font-semibold tabular-nums mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Live Credits</Label>
                      <Input
                        type="number"
                        value={current.liveCredits}
                        onChange={(e) =>
                          setTierForms((prev) => ({
                            ...prev,
                            [tierKey]: { ...current, liveCredits: Number(e.target.value) },
                          }))
                        }
                        className="h-8 text-xs font-semibold tabular-nums mt-1"
                      />
                    </div>
                  </div>

                  {/* Feature Restrictions Accordion Drawer */}
                  <div className="border border-border/70 rounded-xl overflow-hidden bg-background/50">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRestrictions((prev) => ({
                          ...prev,
                          [tierKey]: !isExpanded,
                        }))
                      }
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="size-3 text-primary" />
                        Feature Restrictions
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-mono">
                          {enabledCount}/7 Active
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 space-y-2.5 text-xs border-t border-border/70 bg-background/80">
                        {/* Handwriting OCR */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground flex items-center gap-1.5">
                            <Camera className="size-3 text-amber-500" />
                            Handwriting OCR Scanning
                          </span>
                          <Switch
                            checked={restrictions.allowHandwritingOcr}
                            onCheckedChange={(val) =>
                              setTierForms((prev) => ({
                                ...prev,
                                [tierKey]: {
                                  ...current,
                                  restrictions: { ...restrictions, allowHandwritingOcr: val },
                                },
                              }))
                            }
                          />
                        </div>

                        {/* Model Answers Generator */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground flex items-center gap-1.5">
                            <Bot className="size-3 text-indigo-500" />
                            AI Model Answer Generator
                          </span>
                          <Switch
                            checked={restrictions.allowModelAnswers}
                            onCheckedChange={(val) =>
                              setTierForms((prev) => ({
                                ...prev,
                                [tierKey]: {
                                  ...current,
                                  restrictions: { ...restrictions, allowModelAnswers: val },
                                },
                              }))
                            }
                          />
                        </div>

                        {/* Economics Diagram Studio */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground flex items-center gap-1.5">
                            <LineChart className="size-3 text-emerald-500" />
                            Diagram Studio &amp; Drills
                          </span>
                          <Switch
                            checked={restrictions.allowDiagramStudio}
                            onCheckedChange={(val) =>
                              setTierForms((prev) => ({
                                ...prev,
                                [tierKey]: {
                                  ...current,
                                  restrictions: { ...restrictions, allowDiagramStudio: val },
                                },
                              }))
                            }
                          />
                        </div>

                        {/* Dual Model Arbitration */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground flex items-center gap-1.5">
                            <Scale className="size-3 text-purple-500" />
                            Dual-Examiner Arbitration
                          </span>
                          <Switch
                            checked={restrictions.allowArbitration}
                            onCheckedChange={(val) =>
                              setTierForms((prev) => ({
                                ...prev,
                                [tierKey]: {
                                  ...current,
                                  restrictions: { ...restrictions, allowArbitration: val },
                                },
                              }))
                            }
                          />
                        </div>

                        {/* Classroom & School Submissions */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground flex items-center gap-1.5">
                            <School className="size-3 text-rose-500" />
                            School Classrooms Access
                          </span>
                          <Switch
                            checked={restrictions.allowClassrooms}
                            onCheckedChange={(val) =>
                              setTierForms((prev) => ({
                                ...prev,
                                [tierKey]: {
                                  ...current,
                                  restrictions: { ...restrictions, allowClassrooms: val },
                                },
                              }))
                            }
                          />
                        </div>

                        {/* Priority Queue */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground flex items-center gap-1.5">
                            <Zap className="size-3 text-amber-400" />
                            Priority High-Speed Queue
                          </span>
                          <Switch
                            checked={restrictions.allowPriorityQueue}
                            onCheckedChange={(val) =>
                              setTierForms((prev) => ({
                                ...prev,
                                [tierKey]: {
                                  ...current,
                                  restrictions: { ...restrictions, allowPriorityQueue: val },
                                },
                              }))
                            }
                          />
                        </div>

                        {/* Experimental Labs */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground flex items-center gap-1.5">
                            <Sparkles className="size-3 text-indigo-400" />
                            Beta Experimental Labs
                          </span>
                          <Switch
                            checked={current.hasExperimentalLabs}
                            onCheckedChange={(val) =>
                              setTierForms((prev) => ({
                                ...prev,
                                [tierKey]: { ...current, hasExperimentalLabs: val },
                              }))
                            }
                          />
                        </div>

                        {/* MCQ Access Level */}
                        <div className="pt-1.5 border-t border-border/50 space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            MCQ Access Policy
                          </Label>
                          <Select
                            value={restrictions.mcqAccessLevel || "full"}
                            onValueChange={(val: any) =>
                              setTierForms((prev) => ({
                                ...prev,
                                [tierKey]: {
                                  ...current,
                                  restrictions: { ...restrictions, mcqAccessLevel: val },
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Full Past Papers + Topic Drills</SelectItem>
                              <SelectItem value="topics_only">Topic Practice Only</SelectItem>
                              <SelectItem value="locked">Locked (Paid Upgrade Only)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Button - Fully visible, never clipped */}
                <div className="pt-3 border-t border-border/70">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full text-xs font-semibold h-9 shadow-xs cursor-pointer gap-1.5"
                    disabled={isSaving}
                    onClick={() =>
                      updateTierMutation.mutate({
                        tier: tierKey,
                        name: current.name || plan.name,
                        tagline: current.tagline || plan.tagline,
                        monthlyPrice: current.monthlyPrice,
                        annualPrice: current.annualPrice,
                        essaysPerMonth: current.essaysPerMonth,
                        liveCredits: current.liveCredits,
                        hasExperimentalLabs: current.hasExperimentalLabs,
                        isPublic: current.isPublic !== false,
                        badge: current.badge || plan.badge,
                        restrictions: current.restrictions,
                      })
                    }
                  >
                    {isSaving ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    <span>Save {current.name || plan.name}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Credit & Subscription Granting Console */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Coins className="size-4 text-emerald-500" />
            Manage User Credits, Quotas &amp; Tier Assignment
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target any student or teacher by UUID to promote their tier (including custom/private plans), inject bonus Live Examiner credits, or reset their monthly evaluation counter.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">User ID (UUID)</Label>
            <Input
              type="text"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assign Tier</Label>
            <Select value={selectedUserTier} onValueChange={setSelectedUserTier}>
              <SelectTrigger className="h-8 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free Community Edition</SelectItem>
                {allTierKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {activePlans[k]?.name || k} {activePlans[k]?.isPublic === false ? "(Private)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bonus Live Credits</Label>
            <Input
              type="number"
              min={0}
              value={bonusLiveCredits}
              onChange={(e) => setBonusLiveCredits(Number(e.target.value))}
              className="h-8 text-xs tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bonus Essays</Label>
            <Input
              type="number"
              min={0}
              value={bonusEssays}
              onChange={(e) => setBonusEssays(Number(e.target.value))}
              className="h-8 text-xs tabular-nums"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 sm:col-span-2">
            <Switch checked={resetUsage} onCheckedChange={setResetUsage} id="reset-counter" />
            <Label htmlFor="reset-counter" className="text-xs cursor-pointer">
              Reset monthly essay usage counter to 0
            </Label>
          </div>

          <div className="sm:col-span-4 pt-1">
            <Button
              type="button"
              disabled={!targetUserId.trim() || manageCreditsMutation.isPending}
              onClick={() => {
                if (!targetUserId.trim()) {
                  toast.error("Please enter a valid user UUID.");
                  return;
                }
                manageCreditsMutation.mutate({
                  userId: targetUserId.trim(),
                  tier: selectedUserTier,
                  bonusLiveCredits,
                  bonusEssays,
                  resetUsageCount: resetUsage,
                });
              }}
              className="text-xs font-semibold h-8"
            >
              {manageCreditsMutation.isPending ? "Applying Updates..." : "Apply Tier & Credit Grants"}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal: Create New Plan */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4 text-primary" />
              Create New Platform Plan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a brand-new pricing plan. You can choose whether to make it visible publicly on <code className="text-primary font-mono text-[11px]">/pricing</code> or keep it private/unlisted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Plan Name</Label>
                <Input
                  placeholder="e.g. Revision Sprint"
                  value={newPlan.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "_")
                      .replace(/_+/g, "_");
                    setNewPlan((p) => ({
                      ...p,
                      name,
                      id: p.id || autoSlug,
                    }));
                  }}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Slug / Key (Unique ID)</Label>
                <Input
                  placeholder="e.g. revision_sprint"
                  value={newPlan.id}
                  onChange={(e) =>
                    setNewPlan((p) => ({
                      ...p,
                      id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                    }))
                  }
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Tagline / Description</Label>
              <Input
                placeholder="Targeted 30-day exam booster for intensive Cambridge prep"
                value={newPlan.tagline}
                onChange={(e) => setNewPlan((p) => ({ ...p, tagline: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Monthly Price (₹)</Label>
                <Input
                  type="number"
                  value={newPlan.monthlyPrice}
                  onChange={(e) =>
                    setNewPlan((p) => ({ ...p, monthlyPrice: Number(e.target.value) }))
                  }
                  className="h-8 text-xs tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Annual Price (₹)</Label>
                <Input
                  type="number"
                  value={newPlan.annualPrice}
                  onChange={(e) =>
                    setNewPlan((p) => ({ ...p, annualPrice: Number(e.target.value) }))
                  }
                  className="h-8 text-xs tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Monthly Essays Quota</Label>
                <Input
                  type="number"
                  value={newPlan.essaysPerMonth}
                  onChange={(e) =>
                    setNewPlan((p) => ({ ...p, essaysPerMonth: Number(e.target.value) }))
                  }
                  className="h-8 text-xs tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Live Examiner Credits</Label>
                <Input
                  type="number"
                  value={newPlan.liveCredits}
                  onChange={(e) =>
                    setNewPlan((p) => ({ ...p, liveCredits: Number(e.target.value) }))
                  }
                  className="h-8 text-xs tabular-nums"
                />
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border/70">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {newPlan.isPublic ? (
                    <>
                      <Globe className="size-3.5 text-emerald-500" />
                      Make Public on /pricing
                    </>
                  ) : (
                    <>
                      <Lock className="size-3.5 text-purple-500" />
                      Keep Private / Unlisted (Hidden)
                    </>
                  )}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {newPlan.isPublic
                    ? "Will be publicly visible to all candidates on the pricing page."
                    : "Hidden from /pricing. Only assignable by admin or shared direct link."}
                </p>
              </div>
              <Switch
                checked={newPlan.isPublic}
                onCheckedChange={(val) => setNewPlan((p) => ({ ...p, isPublic: val }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreatePlan}
              disabled={updateTierMutation.isPending}
              className="text-xs font-semibold"
            >
              {updateTierMutation.isPending ? "Creating Plan..." : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
