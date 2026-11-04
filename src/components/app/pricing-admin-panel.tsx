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
  Brain,
  FileDown,
  Mic,
  LineChart,
  Scale,
  School,
  Timer,
  BookOpen,
  CheckCircle2,
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
  DEFAULT_RESTRICTIONS,
  type PlanRestrictions,
  type PricingTierConfig,
} from "@/lib/pricing-plans";
import {
  getAllCurrencyBreakdowns,
  convertFromUsd,
  formatCurrencyAmount,
  CURRENCY_LIST,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "@/lib/currency";

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
  const [allCurrenciesModalOpen, setAllCurrenciesModalOpen] = useState(false);

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
    monthlyPrice: 49,
    annualPrice: 490,
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

  // List of all tiers in canonical order
  const uniqueTierKeys = useMemo(() => {
    const standardOrder = [
      "foundation",
      "scholar_plus",
      "pro",
      "mastery",
      "elite",
      "revision_sprint",
      "institutional_scholar",
    ];
    const set = new Set([...standardOrder, ...Object.keys(DEFAULT_PRICING_PLANS), ...Object.keys(activePlans)]);
    return Array.from(set).filter((k) => k in DEFAULT_PRICING_PLANS || k in activePlans);
  }, [activePlans]);

  // Read current tier state with guaranteed fallback for all 7 plans and custom tiers
  const getTierState = (tierKey: string): PricingTierConfig => {
    if (tierForms[tierKey]) return tierForms[tierKey];
    const defaultTier = (DEFAULT_PRICING_PLANS as any)[tierKey];
    const base = activePlans[tierKey] || defaultTier || {
      name: tierKey,
      tagline: "Platform membership plan",
      monthlyPrice: 199,
      annualPrice: 1999,
      annualEquivalentMonthly: 166,
      savePct: 16,
      essaysPerMonth: 15,
      liveCredits: 4,
      hasExperimentalLabs: false,
      isPublic: true,
      features: [],
      restrictions: { ...DEFAULT_RESTRICTIONS },
    };

    const defaultTierRestrictions = defaultTier?.restrictions || DEFAULT_RESTRICTIONS;
    return {
      ...base,
      isPublic: base.isPublic !== undefined ? base.isPublic : (defaultTier?.isPublic ?? true),
      restrictions: {
        ...defaultTierRestrictions,
        ...(base.restrictions || {}),
      },
    };
  };

  // Full map of active states (reacts immediately when user edits form or toggles public)
  const tierStates = useMemo(() => {
    const result: Record<string, PricingTierConfig> = {};
    for (const k of uniqueTierKeys) {
      result[k] = getTierState(k);
    }
    return result;
  }, [uniqueTierKeys, tierForms, activePlans]);

  const publicCount = uniqueTierKeys.filter((k) => tierStates[k]?.isPublic !== false).length;
  const privateCount = uniqueTierKeys.filter((k) => tierStates[k]?.isPublic === false).length;

  const filteredTierKeys = useMemo(() => {
    return uniqueTierKeys.filter((k) => {
      const plan = tierStates[k];
      if (!plan) return false;
      const isPub = plan.isPublic !== false;
      if (visibilityFilter === "public" && !isPub) return false;
      if (visibilityFilter === "private" && isPub) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = plan.name?.toLowerCase().includes(q);
        const matchesKey = k.toLowerCase().includes(q);
        const matchesTag = plan.tagline?.toLowerCase().includes(q);
        if (!matchesName && !matchesKey && !matchesTag) return false;
      }
      return true;
    });
  }, [uniqueTierKeys, tierStates, visibilityFilter, searchQuery]);

  const handleSaveTier = (tierKey: string) => {
    const current = getTierState(tierKey);
    const plan = activePlans[tierKey] || (DEFAULT_PRICING_PLANS as any)[tierKey] || {};
    updateTierMutation.mutate(
      {
        tier: tierKey,
        name: current.name || plan.name,
        tagline: current.tagline || plan.tagline,
        monthlyPrice: Number(current.monthlyPrice),
        annualPrice: Number(current.annualPrice),
        essaysPerMonth: Number(current.essaysPerMonth),
        liveCredits: Number(current.liveCredits),
        hasExperimentalLabs: Boolean(current.hasExperimentalLabs),
        isPublic: current.isPublic !== false,
        badge: current.badge || plan.badge,
        restrictions: current.restrictions,
      },
      {
        onSuccess: () => {
          setTierForms((prev) => {
            const next = { ...prev };
            delete next[tierKey];
            return next;
          });
        },
      },
    );
  };

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
              variant="outline"
              size="sm"
              onClick={() => setAllCurrenciesModalOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 shadow-2xs border-primary/30 text-primary hover:bg-primary/10"
            >
              <Globe className="size-3.5" />
              <span>All Currencies Matrix</span>
            </Button>

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
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                visibilityFilter === "all"
                  ? "bg-background text-foreground shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40",
              )}
            >
              All Plans ({uniqueTierKeys.length})
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter("public")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
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
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
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

        {/* Tier Cards Grid - Padded at bottom to prevent overlap with floating widgets */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 pb-24">
          {filteredTierKeys.map((tierKey) => {
            const plan = activePlans[tierKey] || (DEFAULT_PRICING_PLANS as any)[tierKey] || {};
            const current = getTierState(tierKey);
            const isDirty = Boolean(tierForms[tierKey]);
            const isSaving = updateTierMutation.isPending && updateTierMutation.variables?.tier === tierKey;
            const isExpanded = Boolean(expandedRestrictions[tierKey]);
            const isCustomOrUnlisted = !["foundation", "scholar_plus", "pro", "mastery", "elite"].includes(tierKey);

            // Segregated feature counts
            const restrictions = current.restrictions || DEFAULT_RESTRICTIONS;

            // 1. AI Evaluation Engine
            const evalList = [
              restrictions.allowSentenceAnalysis !== false,
              Boolean(restrictions.allowEvaluativeEngine),
              Boolean(restrictions.allowArbitration),
              restrictions.allowDefinitionsDrills !== false,
            ];
            const evalActive = evalList.filter(Boolean).length;

            // 2. Exam Revision Studio
            const studioList = [
              Boolean(restrictions.allowHandwritingOcr),
              Boolean(restrictions.allowModelAnswers),
              Boolean(restrictions.allowDiagramStudio),
              restrictions.allowPdfExport !== false,
            ];
            const studioActive = studioList.filter(Boolean).length;

            // 3. Live & Classrooms
            const cohortList = [
              restrictions.allowLiveExaminer !== false,
              Boolean(restrictions.allowClassrooms),
              Boolean(restrictions.allowDirectExaminerSupport),
            ];
            const cohortActive = cohortList.filter(Boolean).length;

            // 4. Infrastructure & Speed
            const infraList = [
              Boolean(restrictions.allowPriorityQueue),
              Boolean(current.hasExperimentalLabs),
            ];
            const infraActive = infraList.filter(Boolean).length;

            const totalActive = evalActive + studioActive + cohortActive + infraActive;
            const totalCount = evalList.length + studioList.length + cohortList.length + infraList.length;

            return (
              <div
                key={tierKey}
                className={cn(
                  "flex flex-col justify-between rounded-2xl border p-5 space-y-4 shadow-xs transition-all",
                  current.isPublic === false
                    ? "border-purple-500/40 bg-purple-500/[0.03]"
                    : "border-border/90 bg-card hover:border-border",
                )}
              >
                <div className="space-y-3.5">
                  {/* Card Top Action Bar: Slug on Left, Public/Unlisted + Save + Delete on Right */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                    {/* Slug & Monospace Label */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 truncate block max-w-[130px]"
                        title={tierKey}
                      >
                        {tierKey}
                      </span>
                      {current.badge && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 h-4 font-normal hidden xl:inline-flex truncate max-w-[110px]"
                        >
                          {current.badge}
                        </Badge>
                      )}
                    </div>

                    {/* Header Action Cluster */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Top Public / Unlisted Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextPublic = current.isPublic === false ? true : false;
                          setTierForms((prev) => ({
                            ...prev,
                            [tierKey]: { ...current, isPublic: nextPublic },
                          }));
                          toast.info(
                            nextPublic
                              ? `"${current.name || tierKey}" marked as Public. Click Save to publish on /pricing.`
                              : `"${current.name || tierKey}" removed from Public (now Unlisted). Click Save to apply.`,
                            { duration: 2500 },
                          );
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs select-none",
                          current.isPublic !== false
                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
                        )}
                        title={
                          current.isPublic !== false
                            ? "Currently Live on /pricing. Click to remove from public (make unlisted)."
                            : "Currently Unlisted (Private). Click to publish live on /pricing."
                        }
                      >
                        {current.isPublic !== false ? (
                          <>
                            <Globe className="size-3 text-emerald-500 shrink-0" />
                            <span>Public</span>
                            <span className="text-[9px] opacity-60 ml-0.5 font-mono">✕</span>
                          </>
                        ) : (
                          <>
                            <Lock className="size-3 text-purple-500 shrink-0" />
                            <span>Unlisted</span>
                            <span className="text-[9px] opacity-60 ml-0.5 font-mono">+ Pub</span>
                          </>
                        )}
                      </button>

                      {/* Quick Save in Header */}
                      <Button
                        type="button"
                        size="sm"
                        variant={isDirty ? "default" : "outline"}
                        className={cn(
                          "h-7 px-2 text-xs font-semibold gap-1 transition-all cursor-pointer",
                          isDirty && "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30",
                        )}
                        disabled={isSaving}
                        onClick={() => handleSaveTier(tierKey)}
                        title="Save changes for this plan"
                      >
                        {isSaving ? (
                          <RefreshCw className="size-3 animate-spin" />
                        ) : (
                          <Save className="size-3" />
                        )}
                        <span>Save</span>
                      </Button>

                      {/* Delete Option */}
                      {isCustomOrUnlisted && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
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
                  </div>

                  {/* Plan Name & Tagline */}
                  <div className="space-y-1.5">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Plan Display Name
                      </Label>
                      <Input
                        value={current.name || ""}
                        onChange={(e) =>
                          setTierForms((prev) => ({
                            ...prev,
                            [tierKey]: { ...current, name: e.target.value },
                          }))
                        }
                        className="h-8 font-bold text-sm bg-background/50 border-border/80 focus:border-primary"
                        placeholder="Plan Name"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Tagline / Summary
                      </Label>
                      <Input
                        value={current.tagline || ""}
                        onChange={(e) =>
                          setTierForms((prev) => ({
                            ...prev,
                            [tierKey]: { ...current, tagline: e.target.value },
                          }))
                        }
                        className="h-7 text-xs text-muted-foreground bg-background/50 border-border/80 focus:border-primary"
                        placeholder="Value proposition / summary"
                      />
                    </div>
                  </div>

                  {/* Pricing Inputs ($ USD Base) */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-0.5">
                    <div>
                      <Label className="text-[11px] text-muted-foreground font-medium">Monthly ($ USD)</Label>
                      <Input
                        type="number"
                        value={current.monthlyPrice}
                        onChange={(e) =>
                          setTierForms((prev) => ({
                            ...prev,
                            [tierKey]: { ...current, monthlyPrice: Number(e.target.value) },
                          }))
                        }
                        className="h-8 text-xs font-semibold tabular-nums mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <Label className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                          Annual ($ USD)
                        </Label>
                        {current.annualPrice > 0 && current.monthlyPrice > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap shrink-0">
                            {Math.max(0, Math.round((1 - current.annualPrice / (current.monthlyPrice * 12)) * 100))}% off
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
                        className="h-8 text-xs font-semibold tabular-nums mt-1 font-mono"
                      />
                    </div>
                  </div>

                  {/* All Currencies Preview Breakdown (Live across top international currencies) */}
                  <div className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Globe className="size-3 text-primary" />
                        All Currencies
                      </span>
                      <span className="font-mono text-muted-foreground text-[10px]">
                        Base: ${current.monthlyPrice || 0}/mo
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      {getAllCurrencyBreakdowns(current.monthlyPrice || 0)
                        .filter((c) => ["USD", "INR", "GBP", "EUR", "SGD", "AED"].includes(c.code))
                        .map((c) => (
                          <div
                            key={c.code}
                            className="flex items-center justify-between p-1 rounded-md bg-background/90 border border-border/40 text-[10px]"
                          >
                            <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                              <span>{c.flag}</span>
                              <span className="font-mono">{c.code}</span>
                            </span>
                            <span className="font-bold tabular-nums text-foreground">
                              {c.formatted}
                              <span className="text-muted-foreground font-normal text-[9px]">/mo</span>
                            </span>
                          </div>
                        ))}
                    </div>
                    {current.annualPrice > 0 && (
                      <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="text-[9.5px]">Annual:</span>
                        <div className="flex items-center gap-2 font-mono text-[9.5px]">
                          <span>🇺🇸 ${current.annualPrice}</span>
                          <span>🇮🇳 ₹{convertFromUsd(current.annualPrice, "INR").toLocaleString()}</span>
                          <span>🇬🇧 £{convertFromUsd(current.annualPrice, "GBP")}</span>
                          <span>🇪🇺 €{convertFromUsd(current.annualPrice, "EUR")}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quotas Inputs */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-muted-foreground font-medium">Essays / Mo</Label>
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
                      <Label className="text-[11px] text-muted-foreground font-medium">Live Credits</Label>
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

                  {/* Segregation Health Summary Strip */}
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px]">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
                      <Brain className="size-3 text-blue-500 shrink-0" />
                      <span className="truncate">AI Eval: <strong>{evalActive}/4</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
                      <LineChart className="size-3 text-emerald-500 shrink-0" />
                      <span className="truncate">Studio: <strong>{studioActive}/4</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium">
                      <School className="size-3 text-purple-500 shrink-0" />
                      <span className="truncate">Cohorts: <strong>{cohortActive}/3</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                      <Zap className="size-3 text-amber-500 shrink-0" />
                      <span className="truncate">{restrictions.allowPriorityQueue ? "Turbo Flash" : "Standard Speed"}</span>
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
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="size-3 text-primary" />
                        Feature Segregations &amp; Controls
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-mono">
                          {totalActive}/{totalCount} Enabled
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 space-y-3 text-xs border-t border-border/70 bg-background/80">
                        {/* ── 1. AI Marking & Diagnostic Engine ── */}
                        <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.03] p-2.5 space-y-2">
                          <div className="flex items-center justify-between border-b border-blue-500/15 pb-1">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                              <Brain className="size-3.5 text-blue-500" />
                              AI Evaluation &amp; Diagnostics
                            </span>
                            <Badge className="text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 px-1.5 py-0 h-4 font-mono">
                              {evalActive}/4 Enabled
                            </Badge>
                          </div>

                          {/* AO Sentence Diagnostics */}
                          <div className="flex items-start justify-between gap-2 pt-0.5">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Bot className="size-3 text-blue-500 shrink-0" />
                                AO Sentence Attribution
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Sub-second AO1 knowledge, AO2 analysis &amp; AO3 causal chain diagnostics (&lt;50ms)
                              </p>
                            </div>
                            <Switch
                              checked={restrictions.allowSentenceAnalysis !== false}
                              onCheckedChange={(val) =>
                                setTierForms((prev) => ({
                                  ...prev,
                                  [tierKey]: {
                                    ...current,
                                    restrictions: { ...restrictions, allowSentenceAnalysis: val },
                                  },
                                }))
                              }
                            />
                          </div>

                          {/* Level 4/5 Evaluative Refinements */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Sparkles className="size-3 text-indigo-500 shrink-0" />
                                Level 4/5 Evaluative Refinements
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Synoptic weighting, counter-perspectives, and evaluative conclusion refinement
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(restrictions.allowEvaluativeEngine)}
                              onCheckedChange={(val) =>
                                setTierForms((prev) => ({
                                  ...prev,
                                  [tierKey]: {
                                    ...current,
                                    restrictions: { ...restrictions, allowEvaluativeEngine: val },
                                  },
                                }))
                              }
                            />
                          </div>

                          {/* Dual-Examiner Arbitration */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Scale className="size-3 text-purple-500 shrink-0" />
                                Dual-Examiner Arbitration
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Cross-model principal consensus grading to resolve borderline marks
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(restrictions.allowArbitration)}
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

                          {/* Definitions Hub & Drills */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <BookOpen className="size-3 text-blue-500 shrink-0" />
                                Cambridge Definitions Hub &amp; Drills
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Syllabus 9708 glossary, command word drills, and memory flashcards
                              </p>
                            </div>
                            <Switch
                              checked={restrictions.allowDefinitionsDrills !== false}
                              onCheckedChange={(val) =>
                                setTierForms((prev) => ({
                                  ...prev,
                                  [tierKey]: {
                                    ...current,
                                    restrictions: { ...restrictions, allowDefinitionsDrills: val },
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>

                        {/* ── 2. Exam Revision & Generation Studio ── */}
                        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.03] p-2.5 space-y-2">
                          <div className="flex items-center justify-between border-b border-emerald-500/15 pb-1">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              <LineChart className="size-3.5 text-emerald-500" />
                              Exam Revision &amp; Generation Studio
                            </span>
                            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-1.5 py-0 h-4 font-mono">
                              {studioActive}/4 Enabled
                            </Badge>
                          </div>

                          {/* Handwriting OCR */}
                          <div className="flex items-start justify-between gap-2 pt-0.5">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Camera className="size-3 text-amber-500 shrink-0" />
                                Handwriting OCR Photo Scanning
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Direct mobile photo or PDF scan transcription of handwritten essays
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(restrictions.allowHandwritingOcr)}
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

                          {/* AI Model Answer Generator */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Bot className="size-3 text-indigo-500 shrink-0" />
                                AI Perfect Model Answer Generator
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Full 20/20 &amp; Level 5 exemplar responses strictly matching Cambridge rubrics
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(restrictions.allowModelAnswers)}
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

                          {/* Diagram Studio & Drills */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <LineChart className="size-3 text-emerald-500 shrink-0" />
                                Interactive Diagram Studio &amp; Drills
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                50+ Cambridge micro/macro economics graphs with shift sliders &amp; drills
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(restrictions.allowDiagramStudio)}
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

                          {/* Diagnostic PDF Export */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <FileDown className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                Diagnostic PDF Report Export
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Export official Cambridge examiner diagnostic reports with mark breakdowns
                              </p>
                            </div>
                            <Switch
                              checked={restrictions.allowPdfExport !== false}
                              onCheckedChange={(val) =>
                                setTierForms((prev) => ({
                                  ...prev,
                                  [tierKey]: {
                                    ...current,
                                    restrictions: { ...restrictions, allowPdfExport: val },
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>

                        {/* ── 3. Live Examiner Coaching & Classrooms ── */}
                        <div className="rounded-xl border border-purple-500/25 bg-purple-500/[0.03] p-2.5 space-y-2">
                          <div className="flex items-center justify-between border-b border-purple-500/15 pb-1">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                              <School className="size-3.5 text-purple-500" />
                              Live Examiner &amp; Classroom Cohorts
                            </span>
                            <Badge className="text-[9px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 px-1.5 py-0 h-4 font-mono">
                              {cohortActive}/3 Enabled
                            </Badge>
                          </div>

                          {/* Live Examiner Voice Coaching */}
                          <div className="flex items-start justify-between gap-2 pt-0.5">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Mic className="size-3 text-purple-500 shrink-0" />
                                Real-Time Live Examiner Voice &amp; AI
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Interactive AI examiner audio guidance and timed exam practice sessions
                              </p>
                            </div>
                            <Switch
                              checked={restrictions.allowLiveExaminer !== false}
                              onCheckedChange={(val) =>
                                setTierForms((prev) => ({
                                  ...prev,
                                  [tierKey]: {
                                    ...current,
                                    restrictions: { ...restrictions, allowLiveExaminer: val },
                                  },
                                }))
                              }
                            />
                          </div>

                          {/* School Classrooms Access */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <School className="size-3 text-rose-500 shrink-0" />
                                School Classrooms Access
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Teacher cohort assignments, homework grading sync, and class markbooks
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(restrictions.allowClassrooms)}
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

                          {/* Senior Examiner Support Desk */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <CheckCircle2 className="size-3 text-indigo-500 shrink-0" />
                                Senior Examiner Support Desk
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Priority 1-on-1 pedagogical review desk for disputed marks and re-evaluations
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(restrictions.allowDirectExaminerSupport)}
                              onCheckedChange={(val) =>
                                setTierForms((prev) => ({
                                  ...prev,
                                  [tierKey]: {
                                    ...current,
                                    restrictions: { ...restrictions, allowDirectExaminerSupport: val },
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>

                        {/* ── 4. Quotas, Speed & Infrastructure ── */}
                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.03] p-2.5 space-y-2">
                          <div className="flex items-center justify-between border-b border-amber-500/15 pb-1">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                              <Zap className="size-3.5 text-amber-500" />
                              Quotas, Speed &amp; Infrastructure
                            </span>
                            <Badge className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 px-1.5 py-0 h-4 font-mono">
                              {restrictions.allowPriorityQueue ? "Turbo Flash" : "Standard Speed"}
                            </Badge>
                          </div>

                          {/* Priority Queue */}
                          <div className="flex items-start justify-between gap-2 pt-0.5">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Zap className="size-3 text-amber-400 shrink-0" />
                                Priority High-Speed Queue
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Sub-second dedicated Flash cluster processing bypass
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(restrictions.allowPriorityQueue)}
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

                          {/* Beta Experimental Labs */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Sparkles className="size-3 text-indigo-400 shrink-0" />
                                Beta Experimental Labs
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                Preview unreleased Cambridge revision modules and next-gen AI features
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(current.hasExperimentalLabs)}
                              onCheckedChange={(val) =>
                                setTierForms((prev) => ({
                                  ...prev,
                                  [tierKey]: { ...current, hasExperimentalLabs: val },
                                }))
                              }
                            />
                          </div>

                          {/* Max Essay Words & Daily Limit */}
                          <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                  Max Words
                                </Label>
                                <span className="text-[9px] text-muted-foreground font-mono">0=unlimited</span>
                              </div>
                              <Input
                                type="number"
                                value={restrictions.maxEssayWords ?? 2000}
                                onChange={(e) =>
                                  setTierForms((prev) => ({
                                    ...prev,
                                    [tierKey]: {
                                      ...current,
                                      restrictions: { ...restrictions, maxEssayWords: Number(e.target.value) },
                                    },
                                  }))
                                }
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                  Daily Cap
                                </Label>
                                <span className="text-[9px] text-muted-foreground font-mono">0=unlimited</span>
                              </div>
                              <Input
                                type="number"
                                value={restrictions.dailyEssayLimit ?? 0}
                                onChange={(e) =>
                                  setTierForms((prev) => ({
                                    ...prev,
                                    [tierKey]: {
                                      ...current,
                                      restrictions: { ...restrictions, dailyEssayLimit: Number(e.target.value) },
                                    },
                                  }))
                                }
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                          </div>

                          {/* MCQ Access Policy */}
                          <div className="pt-1.5 border-t border-border/50 space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                              MCQ Past Paper Policy
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
                                <SelectItem value="full">Full Past Papers + Timers + Topic Drills</SelectItem>
                                <SelectItem value="topics_only">Topic Drills Only (No Past Exam Timers)</SelectItem>
                                <SelectItem value="locked">Locked (Paid Upgrade Required)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Action Button */}
                <div className="pt-3 border-t border-border/70 mt-auto">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full text-xs font-semibold h-9 shadow-xs cursor-pointer gap-1.5"
                    disabled={isSaving}
                    onClick={() => handleSaveTier(tierKey)}
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
        <DialogContent className="max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-border/80">
          <DialogHeader className="p-5 pb-3 border-b border-border/70 shrink-0 bg-background/95 backdrop-blur-sm pr-12">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4 text-primary" />
              Create New Platform Plan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a brand-new pricing plan. You can choose whether to make it visible publicly on <code className="text-primary font-mono text-[11px]">/pricing</code> or keep it private/unlisted.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs overscroll-contain">
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
                <Label className="text-[11px]">Monthly Price ($ USD)</Label>
                <Input
                  type="number"
                  value={newPlan.monthlyPrice}
                  onChange={(e) =>
                    setNewPlan((p) => ({ ...p, monthlyPrice: Number(e.target.value) }))
                  }
                  className="h-8 text-xs tabular-nums font-mono font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Annual Price ($ USD)</Label>
                <Input
                  type="number"
                  value={newPlan.annualPrice}
                  onChange={(e) =>
                    setNewPlan((p) => ({ ...p, annualPrice: Number(e.target.value) }))
                  }
                  className="h-8 text-xs tabular-nums font-mono font-semibold"
                />
              </div>
            </div>

            {/* Live multi-currency preview for new plan */}
            <div className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-1 text-[11px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Globe className="size-3 text-primary" />
                Live Multi-Currency Breakdown
              </span>
              <div className="grid grid-cols-3 gap-1">
                {getAllCurrencyBreakdowns(newPlan.monthlyPrice || 0)
                  .filter((c) => ["USD", "INR", "GBP", "EUR", "SGD", "AED"].includes(c.code))
                  .map((c) => (
                    <div key={c.code} className="p-1 rounded bg-background border border-border/40 text-[10px] flex items-center justify-between">
                      <span className="text-muted-foreground">{c.flag} {c.code}</span>
                      <span className="font-bold tabular-nums">{c.formatted}</span>
                    </div>
                  ))}
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

          <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 shrink-0">
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

      {/* Modal: All Currencies Matrix Overview for Admin */}
      <Dialog open={allCurrenciesModalOpen} onOpenChange={setAllCurrenciesModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-border/80">
          <DialogHeader className="p-6 pb-4 border-b border-border/70 shrink-0 bg-background/95 backdrop-blur-sm pr-12">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Globe className="size-5 text-primary" />
              <span>All Currencies Platform Pricing Matrix</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Live international student prices across all 8 supported currencies, calculated from active USD base pricing. Students see localized prices and can toggle their currency anytime on /pricing and during checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            <div className="rounded-xl border border-border/80 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Plan Name</th>
                    <th className="py-2.5 px-2 text-right">🇺🇸 USD</th>
                    <th className="py-2.5 px-2 text-right">🇮🇳 INR</th>
                    <th className="py-2.5 px-2 text-right">🇬🇧 GBP</th>
                    <th className="py-2.5 px-2 text-right">🇪🇺 EUR</th>
                    <th className="py-2.5 px-2 text-right">🇸🇬 SGD</th>
                    <th className="py-2.5 px-2 text-right">🇦🇪 AED</th>
                    <th className="py-2.5 px-2 text-center">Essays / Mo</th>
                    <th className="py-2.5 px-2 text-center">Live Credits</th>
                    <th className="py-2.5 px-3 text-center">Visibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {uniqueTierKeys.map((tierKey) => {
                    const current = getTierState(tierKey);
                    const isPub = current.isPublic !== false;
                    return (
                      <tr key={tierKey} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-foreground block">{current.name || tierKey}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{tierKey}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-foreground">
                          ${current.monthlyPrice}
                          <span className="block text-[10px] text-muted-foreground font-normal">${current.annualPrice}/yr</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-foreground">
                          ₹{convertFromUsd(current.monthlyPrice, "INR").toLocaleString()}
                          <span className="block text-[10px] text-muted-foreground font-normal">₹{convertFromUsd(current.annualPrice, "INR").toLocaleString()}/yr</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-foreground">
                          £{convertFromUsd(current.monthlyPrice, "GBP")}
                          <span className="block text-[10px] text-muted-foreground font-normal">£{convertFromUsd(current.annualPrice, "GBP")}/yr</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-foreground">
                          €{convertFromUsd(current.monthlyPrice, "EUR")}
                          <span className="block text-[10px] text-muted-foreground font-normal">€{convertFromUsd(current.annualPrice, "EUR")}/yr</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-foreground">
                          S${convertFromUsd(current.monthlyPrice, "SGD")}
                          <span className="block text-[10px] text-muted-foreground font-normal">S${convertFromUsd(current.annualPrice, "SGD")}/yr</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-foreground">
                          AED {convertFromUsd(current.monthlyPrice, "AED")}
                          <span className="block text-[10px] text-muted-foreground font-normal">AED {convertFromUsd(current.annualPrice, "AED")}/yr</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-foreground">
                          {current.essaysPerMonth}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-foreground">
                          {current.liveCredits}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isPub ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                              Public
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-semibold">
                              Unlisted
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="size-3.5 text-primary" />
                Multi-Currency Information
              </p>
              <p className="text-[11px] leading-relaxed">
                Base prices are saved in USD. Exchange rates automatically recalculate into local currency price points (with charm pricing in INR and integer rounding in GBP/EUR/SGD/AED). Students can freely switch currency at any time via the currency switcher.
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAllCurrenciesModalOpen(false)}
              className="text-xs"
            >
              Close Matrix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
