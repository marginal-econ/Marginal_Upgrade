import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Crown,
  Eraser,
  ExternalLink,
  Eye,
  EyeOff,
  GraduationCap,
  ImagePlus,
  KeyRound,
  Layers,
  LineChart,
  Loader2,
  Mail,
  Plug,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Trophy,
  UploadCloud,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { AdminGodmodeDashboard } from "@/components/app/admin-godmode";
import { CouponsAdminPanel } from "@/components/app/coupons-admin";
import { PublicWaitlistPanel } from "@/components/app/public-waitlist-admin";
import { TeacherApprovalsPanel } from "@/components/app/teacher-approvals-admin";
import {
  AccessPanel,
  ActivityOverview,
  SearchBox,
  displayName,
  matchesSearch,
  timeAgo,
  useUserActivity,
} from "@/components/app/admin-access";
import { PageHeader } from "@/components/app/app-shell";
import { MARGINAL_ADMIN_USER_ID, MARGINAL_ADMIN_EMAIL, isMarginalAdmin } from "@/lib/auth-admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { embedNextBatch, listDocuments, reembedAllDocuments } from "@/lib/knowledge.functions";
import {
  activateProviderKey,
  adminOverview,
  clearAiUsageLog,
  deleteProviderKey,
  deleteUserAccount,
  listProviderKeys,
  listUsers,
  resetAllScores,
  resetStudentPracticeData,
  rotateProviderKey,
  saveProviderKey,
  setUserRole,
  testEmbeddingProviderKey,
  testProviderKey,
  testSpecificKey,
  testVisionProviderKey,
} from "@/lib/admin.functions";
import { getMe } from "@/lib/account.functions";
import {
  getPlatformPricing,
  updatePlatformPricing,
  adminManageUserCredits,
} from "@/lib/pricing.functions";
import { DEFAULT_PRICING_PLANS } from "@/lib/pricing-plans";
import {
  AI_PROVIDERS,
  EMBEDDING_PROVIDERS,
  VISION_PROVIDERS,
  providerMeta,
} from "@/lib/ai/providers";
import {
  autofillDiagramFromImage,
  deleteCustomDiagram,
  listCustomDiagrams,
  saveCustomDiagram,
} from "@/lib/diagrams.functions";
import { filesToPageImages } from "@/lib/handwriting-images";
import { SPEC_TEMPLATES, templateSpec } from "@/lib/diagrams/custom";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import {
  adminAddShowcaseExemplar,
  adminDeleteShowcaseExemplar,
  adminListShowcaseEssays,
  adminToggleShowcaseVisibility,
  type ShowcaseEssayItem,
} from "@/lib/showcase.functions";
import {
  getPaymentConfig,
  listUpiPaymentRequests,
  approveUpiPaymentRequest,
  rejectUpiPaymentRequest,
  revokeUpiPaymentRequest,
  updateMerchantUpiConfig,
} from "@/lib/payment.functions";

function embeddingModelsFor(meta: ReturnType<typeof providerMeta>): readonly string[] {
  return "embeddingModels" in meta ? meta.embeddingModels : [];
}

function visionModelsFor(meta: ReturnType<typeof providerMeta>): readonly string[] {
  return "visionModels" in meta ? meta.visionModels : [];
}

function AdminErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const errorStack = error instanceof Error ? error.stack : null;

  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center space-y-4">
      <XCircle className="mx-auto size-10 text-destructive" />
      <h1 className="text-xl font-bold">Admin Console encountered an issue</h1>
      <p className="text-sm text-muted-foreground">
        {errorMessage || "An unexpected error occurred while loading the Admin Console."}
      </p>
      {errorStack && (
        <pre className="max-h-48 overflow-auto rounded border border-border/80 bg-muted/70 p-3 text-left font-mono text-[11px] text-destructive whitespace-pre-wrap">
          {errorStack}
        </pre>
      )}
      <div className="flex justify-center gap-2 pt-2">
        <Button onClick={reset} variant="default" size="sm">
          Try again
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Refresh page
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const user = (context as any)?.user;
    const isMarginal = isMarginalAdmin({
      userId: user?.id,
      email: user?.email,
      claims: user?.user_metadata,
    });
    if (!isMarginal) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin console — Marginal Economics" },
      {
        name: "description",
        content:
          "Platform admin console: manage roles, plug in your own AI provider keys, and monitor AI usage across the Economics platform.",
      },
      { property: "og:title", content: "Admin console — Marginal Economics" },
      {
        property: "og:description",
        content: "Roles, AI provider keys and usage monitoring for Marginal Economics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
  errorComponent: AdminErrorComponent,
});

type AdminSectionMeta = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: typeof Activity;
  badge?: string;
  badgeColor?: string;
};

const ADMIN_SECTIONS: Record<string, AdminSectionMeta> = {
  overview: {
    id: "overview",
    category: "Platform & Intelligence",
    title: "Executive Platform Dashboard",
    subtitle: "Real-time user sessions, grading throughput, AI token spend, database health, and error telemetry.",
    icon: Activity,
  },
  godmode: {
    id: "godmode",
    category: "Platform & Intelligence",
    title: "Platform Vault & Database Inspector",
    subtitle: "Superadmin raw database access: inspect user records, audit student essays, and view live system attempts.",
    icon: Crown,
    badge: "Godmode",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  users: {
    id: "users",
    category: "Users & Access",
    title: "User Directory & Role Management",
    subtitle: "Manage registered student and teacher accounts, grant staff privileges, and audit account states.",
    icon: Users,
  },
  teachers: {
    id: "teachers",
    category: "Users & Access",
    title: "Teacher Verification Desk",
    subtitle: "Verify Cambridge 9708 educators, review compulsory school domains, and approve staff access to Knowledge Base & Classrooms.",
    icon: GraduationCap,
    badge: "Staff Verification",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  access: {
    id: "access",
    category: "Users & Access",
    title: "Capacity & AI Rate Controls",
    subtitle: "Administer per-user daily essay allowances, global request quotas, and VIP token overrides.",
    icon: Coins,
  },
  waitlist: {
    id: "waitlist",
    category: "Users & Access",
    title: "Public Waitlist & Access Invitations",
    subtitle: "Manage early signups, preview invitation templates, and send official access invitations via Mailjet.",
    icon: Mail,
    badge: "Mailjet Live",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  pricing: {
    id: "pricing",
    category: "Monetization & Plans",
    title: "Pricing Plans & Credit Control",
    subtitle: "Real-time pricing editor: customize monthly/annual tier pricing, essay allowances, Live Examiner credit quotas, and user balances.",
    icon: Coins,
    badge: "Live Dynamic",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  showcase: {
    id: "showcase",
    category: "Curriculum & Content",
    title: "Exemplar Showcase Curation",
    subtitle: "Review, approve, and curate Level 4 and Level 5 high-scoring Cambridge 9708 model essays.",
    icon: Trophy,
  },
  diagrams: {
    id: "diagrams",
    category: "Curriculum & Content",
    title: "Diagram Library Engine",
    subtitle: "Cambridge 9708 interactive visual graphs: label-by-label definitions, axes calibration, and custom graphs.",
    icon: LineChart,
  },
  providers: {
    id: "providers",
    category: "AI Engine & Infrastructure",
    title: "LLM Providers & API Keys",
    subtitle: "Bring your own keys: Anthropic Claude, Google Gemini, OpenAI GPT, Groq, and OpenRouter.",
    icon: KeyRound,
  },
  embeddings: {
    id: "embeddings",
    category: "AI Engine & Infrastructure",
    title: "Embedding Models & Vector Search",
    subtitle: "Configure semantic vector search models for syllabus retrieval, RAG grounding, and batch recalibration.",
    icon: Layers,
  },
  vision: {
    id: "vision",
    category: "AI Engine & Infrastructure",
    title: "Vision OCR & Handwriting Engine",
    subtitle: "Extract handwritten student scripts, diagrams, and mark scheme photos using multimodal AI models.",
    icon: ImagePlus,
  },
  payments: {
    id: "payments",
    category: "Monetization & Plans",
    title: "UPI Payment Approvals Desk",
    subtitle: "Verify incoming student UPI transaction references (UTR) against your bank credits, approve subscriptions with 1 click, or reject invalid entries.",
    icon: Coins,
  },
  coupons: {
    id: "coupons",
    category: "Monetization & Plans",
    title: "Coupon Codes & Discounts",
    subtitle: "Create, manipulate, pause, or cancel promotional discount codes. Configure flat ₹ or % cuts, caps, and expirations.",
    icon: Tag,
  },
};

const ADMIN_CATEGORIES = [
  {
    title: "Platform & Intelligence",
    items: [ADMIN_SECTIONS.overview, ADMIN_SECTIONS.godmode],
  },
  {
    title: "Users & Access",
    items: [ADMIN_SECTIONS.users, ADMIN_SECTIONS.teachers, ADMIN_SECTIONS.access, ADMIN_SECTIONS.waitlist],
  },
  {
    title: "Monetization & Plans",
    items: [ADMIN_SECTIONS.pricing, ADMIN_SECTIONS.payments, ADMIN_SECTIONS.coupons],
  },
  {
    title: "Curriculum & Content",
    items: [ADMIN_SECTIONS.showcase, ADMIN_SECTIONS.diagrams],
    externalLinks: [
      { label: "Knowledge Base", to: "/knowledge", icon: BookOpen, desc: "RAG Syllabus & Mark Schemes" },
      { label: "Calibration Anchors", to: "/calibration", icon: Target, desc: "Worked Exam Exemplars" },
      { label: "Content Ingestion", to: "/content-admin", icon: ShieldPlus, desc: "Question Bank Ingestion" },
      { label: "MCQ Paper Library", to: "/mcq-papers-admin", icon: UploadCloud, desc: "Past Paper PDFs" },
    ],
  },
  {
    title: "AI Infrastructure",
    items: [ADMIN_SECTIONS.providers, ADMIN_SECTIONS.embeddings, ADMIN_SECTIONS.vision],
  },
];

function AdminPage() {
  const fetchMe = useServerFn(getMe);
  const [activeTab, setActiveTab] = useState("overview");

  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  if (me.isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center space-y-4">
        <XCircle className="mx-auto size-8 text-destructive" />
        <h1 className="text-lg font-semibold">Unable to verify permissions</h1>
        <p className="text-sm text-muted-foreground">
          {me.error instanceof Error ? me.error.message : "Failed to load user profile."}
        </p>
        <Button onClick={() => me.refetch()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (!me.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This console is reserved exclusively for the platform administrator ({MARGINAL_ADMIN_EMAIL}).
        </p>
      </div>
    );
  }

  const currentSection = ADMIN_SECTIONS[activeTab] ?? ADMIN_SECTIONS.overview;
  const ActiveIcon = currentSection.icon;

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Studio Header ── */}
      <PageHeader
        title="Admin Command Studio"
        description="Master control center: platform health, user roles, syllabus curriculum, and AI infrastructure."
        action={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>Root: Marginal Admin</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Reload Studio</span>
            </Button>
          </div>
        }
      />

      {/* ── Studio Layout: Left Sidebar + Right Workspace ── */}
      <div className="flex flex-1 flex-col md:flex-row min-h-[calc(100vh-140px)] border-t border-border/70">
        {/* Mobile Horizontal Selector (< md) */}
        <div className="md:hidden border-b border-border/70 bg-card/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Studio Module:</span>
            <span className="font-medium text-foreground">{currentSection.title}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {Object.values(ADMIN_SECTIONS).map((sec) => (
              <Button
                key={sec.id}
                variant={activeTab === sec.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(sec.id)}
                className="h-7 text-xs whitespace-nowrap gap-1 shrink-0"
              >
                <sec.icon className="size-3" />
                {sec.id === "godmode" ? "Vault" : sec.title.split(" ")[0]}
              </Button>
            ))}
          </div>
        </div>

        {/* Desktop Left-Hand Studio Sidebar (md:) */}
        <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col justify-between border-r border-border/70 bg-card/40 p-3.5 space-y-4">
          <div className="space-y-4 overflow-y-auto">
            {ADMIN_CATEGORIES.map((cat) => (
              <div key={cat.title} className="space-y-1">
                <p className="px-2.5 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                  {cat.title}
                </p>
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const isActive = activeTab === item.id;
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "group relative flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-all",
                          isActive
                            ? "bg-primary/10 font-semibold text-primary shadow-xs"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon className={cn("size-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className="truncate">{item.title.split(" ")[0]} {item.title.split(" ")[1] ?? ""}</span>
                        </div>
                        {item.badge ? (
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-mono uppercase", item.badgeColor)}>
                            {item.badge}
                          </Badge>
                        ) : null}
                        {isActive ? (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                        ) : null}
                      </button>
                    );
                  })}

                  {/* External links under Curriculum */}
                  {cat.externalLinks?.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                      title={link.desc}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <link.icon className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                        <span className="truncate">{link.label}</span>
                      </div>
                      <ExternalLink className="size-3 text-muted-foreground/50 group-hover:text-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer info */}
          <div className="border-t border-border/60 pt-3 px-2 text-[11px] text-muted-foreground/80 space-y-1">
            <p className="font-semibold text-foreground text-xs">Marginal 9708 Engine</p>
            <p className="text-[10px]">Cloudflare Workers · PostgreSQL</p>
          </div>
        </aside>

        {/* ── Main Studio Workspace (Right) ── */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 bg-card/10 overflow-y-auto space-y-6">
          {/* Section Breadcrumb & Header Banner */}
          <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Admin</span>
                  <span>/</span>
                  <span className="text-foreground font-medium">{currentSection.category}</span>
                  <span>/</span>
                  <span className="text-primary font-semibold">{currentSection.title.split(" ")[0]}</span>
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ActiveIcon className="size-4" />
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {currentSection.title}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pt-0.5 leading-relaxed">
                  {currentSection.subtitle}
                </p>
              </div>

              {currentSection.badge ? (
                <Badge variant="outline" className={cn("self-start sm:self-center font-mono text-xs uppercase px-2.5 py-1", currentSection.badgeColor)}>
                  {currentSection.badge} active
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Active Panel View */}
          <div className="space-y-6">
            {activeTab === "overview" && (
              <OverviewPanel onOpenGodmode={() => setActiveTab("godmode")} />
            )}
            {activeTab === "godmode" && <AdminGodmodeDashboard />}
            {activeTab === "users" && <UsersPanel />}
            {activeTab === "teachers" && <TeacherApprovalsPanel />}
            {activeTab === "access" && <AccessPanel />}
            {activeTab === "waitlist" && <PublicWaitlistPanel />}
            {activeTab === "pricing" && <PricingAdminPanel />}
            {activeTab === "payments" && <PaymentApprovalsAdminPanel />}
            {activeTab === "coupons" && <CouponsAdminPanel />}
            {activeTab === "showcase" && <ShowcaseAdminPanel />}
            {activeTab === "diagrams" && <DiagramsPanel />}
            {activeTab === "providers" && <ProvidersPanel />}
            {activeTab === "embeddings" && <EmbeddingsPanel />}
            {activeTab === "vision" && <VisionPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProvidersPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testProviderKey);
  const testSpecific = useServerFn(testSpecificKey);
  const rotate = useServerFn(rotateProviderKey);

  const keys = useQuery({
    queryKey: ["provider-keys", "chat"],
    queryFn: () => list({ data: { purpose: "chat" } }),
  });

  type PoolKeyItem = {
    id: string;
    key: string;
    label: string;
    priority: number;
  };

  const [provider, setProvider] = useState<string>("google");
  const [label, setLabel] = useState("");
  const [paidPrimaryKey, setPaidPrimaryKey] = useState("");
  const [paidSecondaryKey, setPaidSecondaryKey] = useState("");
  const [poolKeys, setPoolKeys] = useState<PoolKeyItem[]>([
    { id: "pool-1", key: "", label: "Extra Key 1", priority: 1 },
  ]);
  const [keyTestState, setKeyTestState] = useState<
    Record<string, { status: "testing" | "success" | "error"; message: string }>
  >({});
  const [model, setModel] = useState("gemini-2.5-pro");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta(provider);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "chat"] });

  const handleAddPoolKey = () => {
    setPoolKeys((prev) => [
      ...prev,
      {
        id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        key: "",
        label: `Extra Key ${prev.length + 1}`,
        priority: prev.length + 1,
      },
    ]);
  };

  const handleRemovePoolKey = (id: string) => {
    setPoolKeys((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.map((item, index) => ({
        ...item,
        priority: index + 1,
      }));
    });
  };

  const handleUpdatePoolKey = (id: string, updates: Partial<PoolKeyItem>) => {
    setPoolKeys((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleMovePoolKey = (index: number, direction: "up" | "down") => {
    setPoolKeys((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy.map((k, idx) => ({
        ...k,
        priority: idx + 1,
      }));
    });
  };

  const handleTestSingleKey = async (slotId: string, keyValue: string) => {
    const trimmed = keyValue.trim();
    if (!trimmed || trimmed.length < 5) {
      toast.error("Please enter a valid key before testing");
      return;
    }
    setKeyTestState((prev) => ({
      ...prev,
      [slotId]: { status: "testing", message: "Connecting to provider..." },
    }));
    const testModel = (model || meta.models[0] || "gemini-2.5-pro").trim();
    try {
      const res = await testSpecific({
        data: {
          provider,
          apiKey: trimmed,
          model: testModel,
          baseUrl: baseUrl || undefined,
        },
      });
      if (res.ok) {
        setKeyTestState((prev) => ({
          ...prev,
          [slotId]: { status: "success", message: `Passed (${res.model})` },
        }));
        toast.success(`Key verified successfully with ${res.model}`);
      } else {
        setKeyTestState((prev) => ({
          ...prev,
          [slotId]: { status: "error", message: res.reply.slice(0, 70) },
        }));
        toast.error(`Key test failed: ${res.reply}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Key test failed";
      setKeyTestState((prev) => ({
        ...prev,
        [slotId]: { status: "error", message: message.slice(0, 70) },
      }));
      toast.error(message);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const validPool = poolKeys
        .filter((k) => k.key.trim().length > 5)
        .map((k, index) => ({
          key: k.key.trim(),
          label: k.label.trim() || `Extra Key ${index + 1}`,
          priority: k.priority || index + 1,
        }));

      const primary = paidPrimaryKey.trim() || (validPool[0]?.key ?? "");
      let finalKey = primary;
      const hasSecondary = paidSecondaryKey.trim().length > 0;
      const hasBudgetPool = validPool.length > 0;

      if (hasSecondary || hasBudgetPool) {
        finalKey = JSON.stringify({
          paidPrimary: primary,
          paidSecondary: paidSecondaryKey.trim(),
          budgetPool: validPool,
        });
      }

      return save({
        data: {
          provider: provider as never,
          label: label || meta.label,
          apiKey: finalKey,
          baseUrl,
          model: model || meta.models[0] || "",
          activate: activateNow,
        },
      });
    },
    onSuccess: async () => {
      toast.success("AI keys saved. AI features will use them immediately.");
      setPaidPrimaryKey("");
      setPaidSecondaryKey("");
      setPoolKeys([{ id: "pool-1", key: "", label: "Extra Key 1", priority: 1 }]);
      setKeyTestState({});
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id } }),
    onSuccess: async () => {
      toast.success("Active provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(`Key works — ${result.model} replied "${result.reply}"`)
        : toast.error(result.reply),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);
  const hasValidPaid = paidPrimaryKey.trim().length >= 8;
  const hasValidPool = poolKeys.some((k) => k.key.trim().length >= 8);

  return (
    <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" /> Configure AI Provider Keys
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Connect your API keys with multi-tier routing: dedicated keys for paying students, and
          an auto-rotating key pool with priority order for free &amp; budget tiers.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(providerMeta(value).models[0] ?? "");
                setBaseUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.filter((item) => item.id !== "lovable").map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Configuration Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={meta.label}
            />
          </div>

          {/* Multi-Tier Keys Section */}
          <div className="space-y-3.5 rounded-xl border border-border/80 bg-muted/20 p-3">
            {/* Primary Paid Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Primary Paid Key (Users &gt; ₹199)
                </Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => handleTestSingleKey("paid-primary", paidPrimaryKey)}
                    disabled={
                      keyTestState["paid-primary"]?.status === "testing" ||
                      paidPrimaryKey.trim().length < 5
                    }
                  >
                    {keyTestState["paid-primary"]?.status === "testing" ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" /> Testing
                      </>
                    ) : keyTestState["paid-primary"]?.status === "success" ? (
                      <>
                        <CheckCircle2 className="size-2.5 text-emerald-500" /> Pass
                      </>
                    ) : keyTestState["paid-primary"]?.status === "error" ? (
                      <>
                        <XCircle className="size-2.5 text-destructive" /> Retry
                      </>
                    ) : (
                      <>
                        <Zap className="size-2.5 text-emerald-500" /> Test Key
                      </>
                    )}
                  </Button>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                    VIP Access
                  </Badge>
                </div>
              </div>
              <Input
                type="password"
                value={paidPrimaryKey}
                onChange={(event) => setPaidPrimaryKey(event.target.value)}
                placeholder="AIza... (Pro, Mastery, Elite & Teachers)"
              />
              {keyTestState["paid-primary"] && (
                <div
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                    keyTestState["paid-primary"].status === "testing" && "text-muted-foreground bg-muted/40",
                    keyTestState["paid-primary"].status === "success" &&
                      "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                    keyTestState["paid-primary"].status === "error" &&
                      "text-destructive bg-destructive/10"
                  )}
                >
                  {keyTestState["paid-primary"].status === "testing" ? (
                    <Loader2 className="size-2.5 animate-spin" />
                  ) : keyTestState["paid-primary"].status === "success" ? (
                    <CheckCircle2 className="size-2.5" />
                  ) : (
                    <XCircle className="size-2.5" />
                  )}
                  <span className="truncate">{keyTestState["paid-primary"].message}</span>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                High-priority dedicated key for paying users. Zero queue delays and premium model access (e.g. Gemini 2.5 Pro).
              </p>
            </div>

            {/* Secondary Paid Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                  Secondary Paid Key (Failover)
                </Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => handleTestSingleKey("paid-secondary", paidSecondaryKey)}
                    disabled={
                      keyTestState["paid-secondary"]?.status === "testing" ||
                      paidSecondaryKey.trim().length < 5
                    }
                  >
                    {keyTestState["paid-secondary"]?.status === "testing" ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" /> Testing
                      </>
                    ) : keyTestState["paid-secondary"]?.status === "success" ? (
                      <>
                        <CheckCircle2 className="size-2.5 text-blue-500" /> Pass
                      </>
                    ) : keyTestState["paid-secondary"]?.status === "error" ? (
                      <>
                        <XCircle className="size-2.5 text-destructive" /> Retry
                      </>
                    ) : (
                      <>
                        <Zap className="size-2.5 text-blue-500" /> Test Key
                      </>
                    )}
                  </Button>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Optional
                  </Badge>
                </div>
              </div>
              <Input
                type="password"
                value={paidSecondaryKey}
                onChange={(event) => setPaidSecondaryKey(event.target.value)}
                placeholder="AIza... (Instant backup if primary paid key hits a blip)"
              />
              {keyTestState["paid-secondary"] && (
                <div
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                    keyTestState["paid-secondary"].status === "testing" && "text-muted-foreground bg-muted/40",
                    keyTestState["paid-secondary"].status === "success" &&
                      "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                    keyTestState["paid-secondary"].status === "error" &&
                      "text-destructive bg-destructive/10"
                  )}
                >
                  {keyTestState["paid-secondary"].status === "testing" ? (
                    <Loader2 className="size-2.5 animate-spin" />
                  ) : keyTestState["paid-secondary"].status === "success" ? (
                    <CheckCircle2 className="size-2.5" />
                  ) : (
                    <XCircle className="size-2.5" />
                  )}
                  <span className="truncate">{keyTestState["paid-secondary"].message}</span>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                If the primary paid key ever encounters a 429 or 503, paid users immediately failover to this key without delay.
              </p>
            </div>

            {/* Individual Budget Pool Keys with Priorities */}
            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                    Extra Pool Keys (₹0, ₹99, ₹199 Users)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Tried in priority order (Priority 1 first). Hops automatically on 429 rate limits.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                  {poolKeys.length} {poolKeys.length === 1 ? "Slot" : "Slots"}
                </Badge>
              </div>

              {poolKeys.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 p-3 text-center">
                  <p className="text-xs text-muted-foreground">No extra keys added to pool.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={handleAddPoolKey}
                  >
                    <Plus className="mr-1.5 size-3" /> Add Pool Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {poolKeys.map((item, index) => {
                    const testState = keyTestState[item.id];
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border/80 bg-background/60 p-2.5 space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            >
                              Priority #{item.priority}
                              {index === 0 ? " (Tried 1st)" : ""}
                            </Badge>
                            <div className="flex items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                disabled={index === 0}
                                onClick={() => handleMovePoolKey(index, "up")}
                                title="Increase priority (move up)"
                              >
                                <ArrowUp className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                disabled={index === poolKeys.length - 1}
                                onClick={() => handleMovePoolKey(index, "down")}
                                title="Decrease priority (move down)"
                              >
                                <ArrowDown className="size-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px] gap-1"
                              onClick={() => handleTestSingleKey(item.id, item.key)}
                              disabled={testState?.status === "testing" || item.key.trim().length < 5}
                            >
                              {testState?.status === "testing" ? (
                                <>
                                  <Loader2 className="size-2.5 animate-spin" /> Testing
                                </>
                              ) : testState?.status === "success" ? (
                                <>
                                  <CheckCircle2 className="size-2.5 text-emerald-500" /> Pass
                                </>
                              ) : testState?.status === "error" ? (
                                <>
                                  <XCircle className="size-2.5 text-destructive" /> Retry
                                </>
                              ) : (
                                <>
                                  <Zap className="size-2.5 text-amber-500" /> Test Key
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemovePoolKey(item.id)}
                              title="Delete this key slot"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <Input
                            value={item.label}
                            onChange={(e) =>
                              handleUpdatePoolKey(item.id, { label: e.target.value })
                            }
                            placeholder="Key label"
                            className="h-8 text-xs font-medium"
                          />
                          <Input
                            type="password"
                            value={item.key}
                            onChange={(e) =>
                              handleUpdatePoolKey(item.id, { key: e.target.value })
                            }
                            placeholder="AIzaSy... (API Key)"
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        {testState && (
                          <div
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                              testState.status === "testing" && "text-muted-foreground bg-muted/40",
                              testState.status === "success" &&
                                "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                              testState.status === "error" &&
                                "text-destructive bg-destructive/10"
                            )}
                          >
                            {testState.status === "testing" ? (
                              <Loader2 className="size-2.5 animate-spin" />
                            ) : testState.status === "success" ? (
                              <CheckCircle2 className="size-2.5" />
                            ) : (
                              <XCircle className="size-2.5" />
                            )}
                            <span className="truncate">{testState.message}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-dashed gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleAddPoolKey}
                  >
                    <Plus className="size-3.5" /> Add Another Pool Key
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={meta.models[0] ?? "model-id"}
            />
            {meta.models.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {meta.models.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setModel(suggestion)}
                    className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://your-endpoint/v1"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make active</p>
              <p className="text-xs text-muted-foreground">
                Marking, coaching, MCQs and essays all route through it.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!hasValidPaid && !hasValidPool)}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save provider configuration
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently serving:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "Marginal AI (built in)"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "All AI features use your own key and billing."
                : "Uses the built-in credits. If they run out, add your own key on the left."}
            </p>
          </div>
          {activeKey ? (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
              <Plug className="size-4" /> Switch back to Marginal AI
            </Button>
          ) : null}
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {(keys.data ?? []).map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerMeta(row.provider).label} · {row.model} · key {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`rotate-${row.id}`}>New API key</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => handleTestSingleKey(`rotate-${row.id}`, rotateValue)}
                    disabled={
                      keyTestState[`rotate-${row.id}`]?.status === "testing" ||
                      rotateValue.trim().length < 5
                    }
                  >
                    {keyTestState[`rotate-${row.id}`]?.status === "testing" ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" /> Testing
                      </>
                    ) : keyTestState[`rotate-${row.id}`]?.status === "success" ? (
                      <>
                        <CheckCircle2 className="size-2.5 text-emerald-500" /> Pass
                      </>
                    ) : keyTestState[`rotate-${row.id}`]?.status === "error" ? (
                      <>
                        <XCircle className="size-2.5 text-destructive" /> Retry
                      </>
                    ) : (
                      <>
                        <Zap className="size-2.5 text-amber-500" /> Test Key
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save new key
                  </Button>
                </div>
                {keyTestState[`rotate-${row.id}`] && (
                  <div
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                      keyTestState[`rotate-${row.id}`].status === "testing" &&
                        "text-muted-foreground bg-muted/40",
                      keyTestState[`rotate-${row.id}`].status === "success" &&
                        "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                      keyTestState[`rotate-${row.id}`].status === "error" &&
                        "text-destructive bg-destructive/10"
                    )}
                  >
                    {keyTestState[`rotate-${row.id}`].status === "testing" ? (
                      <Loader2 className="size-2.5 animate-spin" />
                    ) : keyTestState[`rotate-${row.id}`].status === "success" ? (
                      <CheckCircle2 className="size-2.5" />
                    ) : (
                      <XCircle className="size-2.5" />
                    )}
                    <span className="truncate">{keyTestState[`rotate-${row.id}`].message}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {keys.data && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No provider keys yet. Add one on the left to stop depending on built-in credits.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/**
 * Separate console section for embedding-purpose keys — deliberately its
 * own tab, own list, own active flag from the chat providers above, since
 * "which model marks essays" and "which model produces vectors for the
 * knowledge base" are independent choices that used to silently share one
 * setting. Multiple embedding keys can be saved at once; the Knowledge page
 * lets a specific ingestion job pick any of them, not just whichever is
 * flagged active here.
 */
function EmbeddingsPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testEmbeddingProviderKey);
  const rotate = useServerFn(rotateProviderKey);
  const reembedAll = useServerFn(reembedAllDocuments);
  const getDocuments = useServerFn(listDocuments);
  const embedBatch = useServerFn(embedNextBatch);

  const keys = useQuery({
    queryKey: ["provider-keys", "embedding"],
    queryFn: () => list({ data: { purpose: "embedding" } }),
  });

  // Drives every queued document's embedding to completion right here in
  // Admin, rather than requiring a separate trip to the Knowledge page.
  // Sequential (one document at a time, one batch at a time) on purpose:
  // embedNextBatch already batches internally, and running documents in
  // parallel would just race the same rate limits a free/shared embedding
  // key is most likely to hit.
  const [reembedProgress, setReembedProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const reembedMutation = useMutation({
    mutationFn: async () => {
      const { queued } = await reembedAll();
      setReembedProgress({ done: 0, total: queued });
      const documents = await getDocuments();
      const toEmbed = documents.filter((doc) => doc.status !== "ready");
      let completed = 0;
      for (const doc of toEmbed) {
        let done = false;
        let guard = 0;
        while (!done && guard < 500) {
          guard += 1;
          const batch = await embedBatch({ data: { documentId: doc.id } });
          done = batch.done;
        }
        completed += 1;
        setReembedProgress({ done: completed, total: toEmbed.length });
      }
      return { reembedded: completed };
    },
    onSuccess: ({ reembedded }) => {
      toast.success(
        reembedded > 0
          ? `Re-embedded ${reembedded} document${reembedded === 1 ? "" : "s"} under the active embedding provider.`
          : "Nothing to re-embed — the knowledge base is empty.",
      );
      setReembedProgress(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setReembedProgress(null);
    },
  });

  const [provider, setProvider] = useState<string>(EMBEDDING_PROVIDERS[0]?.id ?? "google");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta(provider);
  const embeddingModels = embeddingModelsFor(meta);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "embedding"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          provider: provider as never,
          purpose: "embedding",
          label: label || `${meta.label} embeddings`,
          apiKey,
          baseUrl,
          model: model || embeddingModels[0] || "",
          activate: activateNow,
        },
      }),
    onSuccess: async () => {
      toast.success("Embedding key saved. Knowledge ingestion and retrieval will use it.");
      setApiKey("");
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id, purpose: "embedding" } }),
    onSuccess: async () => {
      toast.success("Active embedding provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(
            `Key works — ${result.dimensions}-dimension vector in ${result.latencyMs}ms (${result.model})`,
          )
        : toast.error(result.error ?? "Test failed."),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" /> Add an embedding key
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Only providers with a working embeddings endpoint are listed here — this is deliberately
          separate from the chat/marking providers, so switching one never silently changes the
          other. Accuracy of retrieval-grounded grading depends directly on this.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(embeddingModelsFor(providerMeta(value))[0] ?? "");
                setBaseUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_PROVIDERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={`${meta.label} embeddings`}
            />
          </div>

          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={meta.keyHint}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Embedding model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={embeddingModels[0] ?? "model-id"}
            />
            {embeddingModels.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {embeddingModels.map((suggestion: string) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setModel(suggestion)}
                    className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://your-endpoint/v1"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make active</p>
              <p className="text-xs text-muted-foreground">
                Default for knowledge ingestion and retrieval unless a call picks a different key.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || apiKey.trim().length < 8}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save embedding key
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently embedding with:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "No embedding key configured yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "Knowledge ingestion and retrieval-grounded grading use this by default."
                : "Add a key on the left — without one, embeddings will fail once the built-in gateway is unavailable."}
            </p>
            {reembedProgress ? (
              <p className="mt-1 text-xs font-medium text-primary">
                Re-embedding {reembedProgress.done}/{reembedProgress.total} documents…
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {activeKey ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reembedMutation.mutate()}
                disabled={reembedMutation.isPending}
                title="Switched embedding provider or model? Re-embed everything so the knowledge base is back in one consistent vector space."
              >
                {reembedMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Re-embed knowledge base
              </Button>
            ) : null}
            {activeKey ? (
              <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
                <Plug className="size-4" /> Clear active embedding key
              </Button>
            ) : null}
          </div>
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {(keys.data ?? []).map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerMeta(row.provider).label} · {row.model} · key {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor={`rotate-embed-${row.id}`}>New API key</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-embed-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save new key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {keys.data && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No embedding keys yet. Add one on the left — Google and OpenRouter both offer free tiers
            that work well for a 9708 knowledge base.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/**
 * Separate console section for vision-purpose keys — reads handwriting
 * pages and photographed/scanned past-paper pages (MCQ/essay bank
 * extraction, including hand-drawn/printed diagrams and data tables on the
 * page). Fully independent active flag from chat and embeddings, same
 * pattern as EmbeddingsPanel above. Only providers with a real image-input
 * endpoint (VISION_PROVIDERS) are offered here.
 */
function VisionPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testVisionProviderKey);
  const rotate = useServerFn(rotateProviderKey);

  const keys = useQuery({
    queryKey: ["provider-keys", "vision"],
    queryFn: () => list({ data: { purpose: "vision" } }),
  });

  const [provider, setProvider] = useState<string>(VISION_PROVIDERS[0]?.id ?? "google");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta(provider);
  const visionModels = visionModelsFor(meta);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "vision"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          provider: provider as never,
          purpose: "vision",
          label: label || `${meta.label} vision`,
          apiKey,
          baseUrl,
          model: model || visionModels[0] || "",
          activate: activateNow,
        },
      }),
    onSuccess: async () => {
      toast.success("Vision key saved. Handwriting OCR and MCQ/essay extraction will use it.");
      setApiKey("");
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id, purpose: "vision" } }),
    onSuccess: async () => {
      toast.success("Active vision provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(
            `Key works — ${result.model} read the test image in ${result.latencyMs}ms ("${result.reply}")`,
          )
        : toast.error(result.reply),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Eye className="size-4 text-primary" /> Add a vision key
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Powers handwriting transcription (grade/practice uploads) and MCQ/essay bank extraction
          from photographed or scanned past-paper pages — including reading the real diagrams and
          data tables printed on the page, not just typed text. Deliberately separate from the
          chat/marking and embedding providers above, so pointing this at a stronger vision model
          never changes what marks essays or what embeds the knowledge base.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(visionModelsFor(providerMeta(value))[0] ?? "");
                setBaseUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISION_PROVIDERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={`${meta.label} vision`}
            />
          </div>

          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={meta.keyHint}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Vision model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={visionModels[0] ?? "model-id"}
            />
            {visionModels.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {visionModels.map((suggestion: string) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setModel(suggestion)}
                    className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            {provider === "google" ? (
              <p className="pt-1 text-[11px] text-muted-foreground">
                Use the Google AI Studio id (e.g. <code>models/gemini-3.7-flash</code>) — the
                handwriting OCR path calls Google's API directly for the highest legibility.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://your-endpoint/v1"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make active</p>
              <p className="text-xs text-muted-foreground">
                Default for handwriting OCR and bank extraction unless a call picks a different key.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || apiKey.trim().length < 8}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save vision key
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently reading images with:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "Falls back to the active chat provider / built-in AI"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "Handwriting OCR and MCQ/essay bank extraction use this by default."
                : "Add a key on the left for the most accurate handwriting and diagram/table reads."}
            </p>
          </div>
          {activeKey ? (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
              <Plug className="size-4" /> Clear active vision key
            </Button>
          ) : null}
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {(keys.data ?? []).map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerMeta(row.provider).label} · {row.model} · key {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor={`rotate-vision-${row.id}`}>New API key</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-vision-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save new key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {keys.data && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vision keys yet. Without one, handwriting OCR and bank extraction fall back to the
            active chat provider, then the built-in gateway.
          </p>
        ) : null}
      </section>
    </div>
  );
}

const RESET_ALL_CATEGORIES: {
  category: "mcq" | "essays" | "liveExaminer" | "aiUsage";
  title: string;
  description: string;
  confirmWord: string;
}[] = [
  {
    category: "mcq",
    title: "Reset all MCQ scores",
    description:
      "Permanently deletes every MCQ attempt for every student — generated-paper history and real-past-paper history alike.",
    confirmWord: "MCQ",
  },
  {
    category: "essays",
    title: "Reset all essay scores",
    description: "Permanently deletes every essay (and its versions) for every student.",
    confirmWord: "ESSAYS",
  },
  {
    category: "liveExaminer",
    title: "Reset all Live Examiner sessions",
    description: "Permanently deletes every Live Examiner writing session for every student.",
    confirmWord: "LIVE",
  },
  {
    category: "aiUsage",
    title: "Clear all AI calls & cost logs",
    description: "Permanently wipes all AI usage logs, token tracking, and cost accounting back to zero for a clean slate.",
    confirmWord: "CLEAR",
  },
];

function DangerZoneSection() {
  const queryClient = useQueryClient();
  const resetAll = useServerFn(resetAllScores);
  const [target, setTarget] = useState<(typeof RESET_ALL_CATEGORIES)[number] | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const resetAllMutation = useMutation({
    mutationFn: (category: "mcq" | "essays" | "liveExaminer" | "aiUsage") => resetAll({ data: { category } }),
    onSuccess: async (result) => {
      const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      toast.success(
        total > 0
          ? `Cleared ${total} record${total === 1 ? "" : "s"} across every account.`
          : "Nothing to clear — already empty.",
      );
      setTarget(null);
      setConfirmText("");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="panel rounded-xl border border-destructive/40">
      <p className="border-b border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive">
        Danger zone
      </p>
      <div className="divide-y divide-border">
        {RESET_ALL_CATEGORIES.map((item) => (
          <div key={item.category} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="ml-auto border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setTarget(item);
                setConfirmText("");
              }}
            >
              Reset
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.description} This affects every account on the platform at once and can't be
              undone. Type <span className="font-mono font-semibold">{target?.confirmWord}</span>{" "}
              below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={target?.confirmWord}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetAllMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetAllMutation.isPending || confirmText.trim() !== target?.confirmWord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => target && resetAllMutation.mutate(target.category)}
            >
              {resetAllMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Clearing…
                </>
              ) : (
                "Reset for everyone"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type UsageRow = {
  id: string;
  user_id: string | null;
  feature: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  ok: boolean;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
};

type FeatureMetric = {
  feature: string;
  label: string;
  calls: number;
  okCalls: number;
  failedCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalLatencyMs: number;
  estCostUsd: number;
  estCostInr: number;
  avgLatencyMs: number;
};

type AdminMetrics = {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
  totalCostInr: number;
  last24hTokens: number;
  last24hCostInr: number;
  liveExaminer: {
    calls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    costInr: number;
    costUsd: number;
    avgLatencyMs: number;
  };
  essayGrader: {
    calls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    costInr: number;
    costUsd: number;
    avgLatencyMs: number;
  };
  byFeature: FeatureMetric[];
};

function OverviewPanel({ onOpenGodmode }: { onOpenGodmode?: () => void } = {}) {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(adminOverview);
  const clearAi = useServerFn(clearAiUsageLog);
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });
  const activity = useUserActivity();
  const [search, setSearch] = useState("");
  const [featureFilter, setFeatureFilter] = useState<"all" | "live_examiner" | "essay_grade" | "other">("all");
  const [clearAiDialogOpen, setClearAiDialogOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");

  const clearAiMutation = useMutation({
    mutationFn: () => clearAi(),
    onSuccess: async (result) => {
      toast.success(
        result.deletedCount > 0
          ? `Cleared ${result.deletedCount} AI usage log records. Telemetry reset to clean slate.`
          : "AI calls and cost are already at clean slate (0).",
      );
      setClearAiDialogOpen(false);
      setClearConfirmText("");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const whoIs = new Map(
    (activity.data ?? []).map((row) => [row.userId, `${displayName(row)} ${row.email ?? ""}`]),
  );

  if (overview.isLoading) return <Skeleton className="h-64 w-full" />;

  if (overview.isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 space-y-3">
        <div className="flex items-center gap-2 text-destructive font-semibold">
          <XCircle className="size-5" />
          <span>Failed to load admin overview metrics</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {overview.error instanceof Error ? overview.error.message : "An unexpected server error occurred."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => overview.refetch()}
          className="gap-2"
        >
          <RefreshCw className="size-3.5" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  if (!overview.data) return <p className="text-sm text-muted-foreground">Nothing to show yet.</p>;

  const counts = overview.data.counts;
  const usage = overview.data.usage ?? [];
  const metrics = (overview.data as { metrics?: AdminMetrics }).metrics;

  const tiles = [
    { label: "Users", value: counts?.users ?? 0 },
    { label: "Essays marked", value: counts?.essays ?? 0 },
    { label: "Knowledge documents", value: counts?.documents ?? 0 },
    { label: "Indexed sections", value: counts?.chunks ?? 0 },
    { label: "MCQ attempts", value: counts?.attempts ?? 0 },
    { label: "Calibration anchors", value: counts?.anchors ?? 0 },
  ];

  const shownUsage = (usage as UsageRow[]).filter((row) => {
    if (featureFilter === "live_examiner") {
      if (!row.feature || !row.feature.startsWith("live_examiner")) return false;
    } else if (featureFilter === "essay_grade") {
      if (row.feature !== "grade_essay" && row.feature !== "essay_grade") return false;
    } else if (featureFilter === "other") {
      if (
        !row.feature ||
        row.feature.startsWith("live_examiner") ||
        row.feature === "grade_essay" ||
        row.feature === "essay_grade"
      )
        return false;
    }

    return matchesSearch(
      [
        row.feature,
        row.model,
        row.ok ? "ok success" : "failed error",
        row.error_message,
        row.user_id ? whoIs.get(row.user_id) : null,
      ],
      search,
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search everything below — a person, email, page, feature or error…"
          className="max-w-xl flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => overview.refetch()}
          disabled={overview.isFetching}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={cn("size-3.5", overview.isFetching && "animate-spin")} />
          <span>Refresh metrics</span>
        </Button>
      </div>

      {/* God-Mode Quick Entry Banner */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
            <Crown className="size-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-foreground sm:text-sm flex items-center gap-1.5">
              God-Mode Platform Vault &amp; Inspector
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] py-0">
                ADMIN ROOT
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Direct access to all 81+ student essays, complete Cambridge mark reports, MCQ attempts, and Live Examiner writing sessions.
            </p>
          </div>
        </div>
        {onOpenGodmode && (
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 shadow-sm"
            onClick={onOpenGodmode}
          >
            <span>Open Platform Vault</span>
            <ChevronRight className="size-3.5" />
          </Button>
        )}
      </div>

      <ActivityOverview search={search} />

      {/* Real-time AI Token & Credit Analytics (Private Admin Console) */}
      <section className="panel rounded-xl border border-border p-5 space-y-5 bg-card/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-emerald-500" /> Real-time AI Token &amp; Credit Consumption
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Internal accounting of Gemini and Claude token expenditures across Live Examiner, Essay Grader, and generators.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setClearAiDialogOpen(true);
                setClearConfirmText("");
              }}
              disabled={clearAiMutation.isPending}
            >
              <Eraser className="size-3.5 mr-1" />
              Clear calls &amp; cost
            </Button>
            <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              Real-time Log Active
            </Badge>
          </div>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Tokens Consumed</span>
              <Zap className="size-3.5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {(metrics?.totalTokens ?? 0).toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>{(metrics?.totalPromptTokens ?? 0).toLocaleString()} in / {(metrics?.totalCompletionTokens ?? 0).toLocaleString()} out</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                +{(metrics?.last24hTokens ?? 0).toLocaleString()} 24h
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Estimated Cost</span>
              <Coins className="size-3.5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              ₹{(metrics?.totalCostInr ?? 0).toFixed(2)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>${(metrics?.totalCostUsd ?? 0).toFixed(3)} USD</span>
              <span className="text-muted-foreground font-medium">
                ₹{(metrics?.last24hCostInr ?? 0).toFixed(2)} 24h
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <span>Live Examiner</span>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                {(metrics?.liveExaminer?.calls ?? 0)} calls
              </Badge>
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {(metrics?.liveExaminer?.totalTokens ?? 0).toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">tokens</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Est: ₹{(metrics?.liveExaminer?.costInr ?? 0).toFixed(2)}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                ⚡ ~{(metrics?.liveExaminer?.avgLatencyMs ?? 0)}ms
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-primary font-medium">
              <span>Essay Grader</span>
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                {(metrics?.essayGrader?.calls ?? 0)} essays
              </Badge>
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {(metrics?.essayGrader?.totalTokens ?? 0).toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">tokens</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Est: ₹{(metrics?.essayGrader?.costInr ?? 0).toFixed(2)}</span>
              <span className="font-mono text-muted-foreground">
                ~{(metrics?.essayGrader?.avgLatencyMs ?? 0)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Feature Breakdown Table */}
        {metrics?.byFeature && metrics.byFeature.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
              <span>Feature Breakdown &amp; Unit Economics</span>
              <span className="text-[11px] font-normal text-muted-foreground">Based on latest 500 AI calls</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/20 text-muted-foreground text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2">Feature</th>
                    <th className="px-3.5 py-2 text-right">Calls</th>
                    <th className="px-3.5 py-2 text-right">Prompt In</th>
                    <th className="px-3.5 py-2 text-right">Completion Out</th>
                    <th className="px-3.5 py-2 text-right">Total Tokens</th>
                    <th className="px-3.5 py-2 text-right">Avg Latency</th>
                    <th className="px-3.5 py-2 text-right">Est. Cost (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.byFeature.map((f) => (
                    <tr key={f.feature} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3.5 py-2">
                        <div className="font-medium">{f.label}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{f.feature}</div>
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums">
                        {f.calls}
                        {f.failedCalls > 0 ? (
                          <span className="text-destructive ml-1 text-[10px]">({f.failedCalls} fail)</span>
                        ) : null}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                        {(f.promptTokens ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                        {(f.completionTokens ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums font-semibold">
                        {(f.totalTokens ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                        {f.avgLatencyMs > 0 ? `${f.avgLatencyMs} ms` : "—"}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums font-medium">
                        ₹{(f.estCostInr ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* Platform Totals */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="panel rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <p className="mt-1 text-xl font-semibold">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Recent AI calls with real-time token counts and cost */}
      <div className="panel rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">
            Recent AI calls{" "}
            <span className="font-normal text-muted-foreground">
              (latest {usage.length}
              {search || featureFilter !== "all" ? `, ${shownUsage.length} match` : ""})
            </span>
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "all" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("all")}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "live_examiner" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("live_examiner")}
            >
              Live Examiner
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "essay_grade" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("essay_grade")}
            >
              Essay Grader
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "other" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("other")}
            >
              Others
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {shownUsage.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              {search || featureFilter !== "all" ? "No AI calls match that filter." : "No AI calls logged yet."}
            </p>
          ) : null}
          {shownUsage.map((row) => {
            const rowTokens = (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0);
            const rowCostInr = (((row.prompt_tokens ?? 0) * 0.00000015 + (row.completion_tokens ?? 0) * 0.00000060) * 86.5);
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs hover:bg-muted/10 transition-colors">
                {row.ok ? (
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                ) : (
                  <XCircle className="size-3.5 text-destructive shrink-0" />
                )}
                <Badge variant="outline" className="text-[10px] font-medium">
                  {row.feature}
                </Badge>
                <span className="text-muted-foreground text-[11px]">{row.model}</span>

                {rowTokens > 0 ? (
                  <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">
                    ⚡ {rowTokens.toLocaleString()} tok ({row.prompt_tokens ?? 0} in / {row.completion_tokens ?? 0} out)
                  </Badge>
                ) : null}

                {rowCostInr > 0 ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ₹{rowCostInr.toFixed(3)}
                  </span>
                ) : null}

                {row.latency_ms ? (
                  <span className="text-muted-foreground text-[11px]">{row.latency_ms} ms</span>
                ) : null}

                {row.user_id && whoIs.get(row.user_id) ? (
                  <span className="truncate text-muted-foreground text-[11px]">
                    · {whoIs.get(row.user_id)?.trim()}
                  </span>
                ) : null}

                <span className="ml-auto text-muted-foreground text-[11px]">
                  {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                </span>

                {row.error_message ? (
                  <p className="w-full text-destructive text-[11px] pl-5">{row.error_message}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog
        open={clearAiDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setClearAiDialogOpen(false);
            setClearConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all AI calls &amp; cost logs?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                This will permanently wipe all AI telemetry records, prompt/completion tokens, and cost accounting.
                All student essays, questions, and accounts will remain intact — only AI consumption metrics will reset to 0.
              </span>
              <span className="block pt-2 font-mono text-xs text-foreground">
                Type <strong>CLEAR</strong> to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={clearConfirmText}
            onChange={(e) => setClearConfirmText(e.target.value)}
            placeholder="CLEAR"
            className="font-mono"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearAiMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearConfirmText.trim().toUpperCase() !== "CLEAR" || clearAiMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                clearAiMutation.mutate();
              }}
            >
              {clearAiMutation.isPending ? "Clearing..." : "Wipe to clean slate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DangerZoneSection />
    </div>
  );
}

function UsersPanel() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const updateRole = useServerFn(setUserRole);
  const resetData = useServerFn(resetStudentPracticeData);
  const deleteAccount = useServerFn(deleteUserAccount);
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const activity = useUserActivity();
  const activityById = new Map((activity.data ?? []).map((row) => [row.userId, row]));
  const [search, setSearch] = useState("");

  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: "student" | "teacher" | "admin" }) =>
      updateRole({ data: input }),
    onSuccess: async () => {
      toast.success("Role updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => resetData({ data: { userId } }),
    onSuccess: (result) => {
      const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      toast.success(
        total > 0
          ? `Cleared ${total} record${total === 1 ? "" : "s"}.`
          : "Nothing to clear — already empty.",
      );
      setResetTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAccount({ data: { userId } }),
    onSuccess: async () => {
      toast.success("Account deleted.");
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user-activity"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (users.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, school or role"
        className="mb-4 max-w-xl"
      />
      <div className="panel divide-y divide-border rounded-xl border border-border">
        {(users.data ?? [])
          .filter((user) => {
            const extra = activityById.get(user.id);
            return matchesSearch([user.fullName, user.school, user.role, extra?.email], search);
          })
          .map((user) => {
            const extra = activityById.get(user.id);
            return (
              <div key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  className={
                    extra?.isOnline
                      ? "inline-block size-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                      : "inline-block size-2 shrink-0 rounded-full bg-muted-foreground/30"
                  }
                  title={extra?.isOnline ? "Online now" : "Offline"}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.fullName ?? "Unnamed account"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {extra?.email ? `${extra.email} · ` : ""}
                    {user.school ?? "No school"} · joined{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                    {extra
                      ? ` · ${extra.isOnline ? "online now" : `last active ${timeAgo(extra.lastActivity)}`}`
                      : ""}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  {user.id === MARGINAL_ADMIN_USER_ID || extra?.email?.toLowerCase().trim() === MARGINAL_ADMIN_EMAIL.toLowerCase() ? (
                    <Badge variant="outline" className="h-8 px-2.5 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                      Sole Admin
                    </Badge>
                  ) : (
                    <Select
                      value={user.role === "admin" ? "student" : user.role}
                      onValueChange={(value) =>
                        roleMutation.mutate({
                          userId: user.id,
                          role: value as "student" | "teacher",
                        })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    aria-label="Clear this account's practice data"
                    title="Clear practice data (essays, MCQ attempts, Live Examiner sessions)"
                    onClick={() =>
                      setResetTarget({ id: user.id, name: user.fullName ?? "this account" })
                    }
                  >
                    <Eraser className="size-4" />
                  </Button>
                  {!(user.id === MARGINAL_ADMIN_USER_ID || extra?.email?.toLowerCase().trim() === MARGINAL_ADMIN_EMAIL.toLowerCase()) && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Delete this account"
                      title="Delete account permanently"
                      onClick={() =>
                        setDeleteTarget({ id: user.id, name: user.fullName ?? "this account" })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        {users.data && users.data.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No accounts yet.</p>
        ) : null}
      </div>

      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear practice data for {resetTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every essay, MCQ attempt, and Live Examiner writing session
              for this account — a clean slate. Their login, role, and profile are untouched. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetMutation.isPending}
              onClick={() => resetTarget && resetMutation.mutate(resetTarget.id)}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Clearing…
                </>
              ) : (
                "Clear data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the account and everything tied to it — essays, MCQ attempts,
              Live Examiner sessions, role, profile. This can't be undone and the person will be
              signed out everywhere immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
/* ------------------------------------------------------------------ */
/* Diagrams — admins add their own Cambridge diagrams to the library    */
/* ------------------------------------------------------------------ */

function DiagramsPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listCustomDiagrams);
  const save = useServerFn(saveCustomDiagram);
  const remove = useServerFn(deleteCustomDiagram);
  const autofill = useServerFn(autofillDiagramFromImage);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const diagrams = useQuery({ queryKey: ["custom-diagrams"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [section, setSection] = useState<"Microeconomics" | "Macroeconomics">("Microeconomics");
  const [topic, setTopic] = useState("Added by your school");
  const [level, setLevel] = useState<"AS" | "A Level" | "AS & A Level">("AS & A Level");
  const [templateId, setTemplateId] = useState(SPEC_TEMPLATES[0]?.id ?? "");
  const [represents, setRepresents] = useState("");
  const [whyUsed, setWhyUsed] = useState("");
  const [whenToDraw, setWhenToDraw] = useState("");
  const [howToRead, setHowToRead] = useState("");
  const [labels, setLabels] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [tips, setTips] = useState("");
  const [specJson, setSpecJson] = useState("");

  const autofillMutation = useMutation({
    mutationFn: async (file: File) => {
      const [image] = await filesToPageImages([file]);
      if (!image) throw new Error("Could not read that photo.");
      return autofill({ data: { image } });
    },
    onSuccess: (draft) => {
      setTitle(draft.title);
      setSection(draft.section);
      setLevel(draft.level);
      setTopic(draft.topic);
      if (SPEC_TEMPLATES.some((item) => item.id === draft.templateId)) {
        setTemplateId(draft.templateId);
      }
      setRepresents(draft.represents);
      setWhyUsed(draft.whyUsed);
      setWhenToDraw(draft.whenToDraw);
      setHowToRead(draft.howToRead.join("\n"));
      setLabels(draft.labels.join("\n"));
      setMistakes(draft.mistakes.join("\n"));
      setTips(draft.tips.join("\n"));
      setSpecJson("");
      toast.success("Drafted from the photo — review each field, then add it.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const templatePreview = templateSpec(templateId);
  const parsedSpec = (() => {
    if (!specJson.trim()) return { spec: templatePreview, error: null as string | null };
    try {
      return { spec: JSON.parse(specJson), error: null as string | null };
    } catch {
      return { spec: null, error: "That geometry JSON is not valid." };
    }
  })();

  const toLines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          title,
          section,
          topic,
          level,
          represents,
          whyUsed,
          whenToDraw,
          howToRead: toLines(howToRead),
          labels: toLines(labels).map((line) => {
            const [symbol, ...rest] = line.split("=");
            return { symbol: (symbol ?? "").trim(), meaning: rest.join("=").trim() };
          }),
          mistakes: toLines(mistakes),
          tips: toLines(tips),
          realWorld: [],
          related: [],
          examQuestions: [],
          spec: parsedSpec.spec as Record<string, unknown>,
        },
      }),
    onSuccess: async () => {
      toast.success("Diagram added to the library.");
      setTitle("");
      setRepresents("");
      setWhyUsed("");
      setWhenToDraw("");
      setHowToRead("");
      setLabels("");
      setMistakes("");
      setTips("");
      setSpecJson("");
      await queryClient.invalidateQueries({ queryKey: ["custom-diagrams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Diagram removed.");
      await queryClient.invalidateQueries({ queryKey: ["custom-diagrams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
      <section className="panel space-y-3 rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold">Add a diagram</h2>
        <p className="text-xs text-muted-foreground">
          Start from an exam-convention template, then rewrite the geometry if you need something
          different. New diagrams appear in the diagram library for every student.
        </p>

        <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <Label className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" /> Quick add from a photo
          </Label>
          <p className="text-xs text-muted-foreground">
            Photograph a diagram from a coursebook, whiteboard or past paper — every field below
            gets drafted for you to review, instead of typing it all out by hand.
          </p>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) autofillMutation.mutate(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={autofillMutation.isPending}
            onClick={() => photoInputRef.current?.click()}
          >
            {autofillMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Reading diagram…
              </>
            ) : (
              <>
                <ImagePlus className="size-4" /> Photograph or upload a diagram
              </>
            )}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Minimum wage in a labour market"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={section} onValueChange={(value) => setSection(value as never)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Microeconomics">Microeconomics</SelectItem>
                <SelectItem value="Macroeconomics">Macroeconomics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={level} onValueChange={(value) => setLevel(value as never)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AS">AS</SelectItem>
                <SelectItem value="A Level">A Level</SelectItem>
                <SelectItem value="AS &amp; A Level">AS &amp; A Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Topic group</Label>
          <Input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Geometry template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {SPEC_TEMPLATES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            What it represents <span className="text-muted-foreground">(one paragraph)</span>
          </Label>
          <Textarea rows={2} value={represents} onChange={(e) => setRepresents(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Why Cambridge uses it</Label>
          <Textarea rows={2} value={whyUsed} onChange={(e) => setWhyUsed(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>When to draw it</Label>
          <Textarea rows={2} value={whenToDraw} onChange={(e) => setWhenToDraw(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            How to read it <span className="text-muted-foreground">(one step per line)</span>
          </Label>
          <Textarea rows={3} value={howToRead} onChange={(e) => setHowToRead(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Labels <span className="text-muted-foreground">(one per line, e.g. P = price)</span>
          </Label>
          <Textarea rows={3} value={labels} onChange={(e) => setLabels(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Common mistakes <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea rows={2} value={mistakes} onChange={(e) => setMistakes(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Examiner tips <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea rows={2} value={tips} onChange={(e) => setTips(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Geometry JSON <span className="text-muted-foreground">(optional override)</span>
          </Label>
          <Textarea
            rows={4}
            className="font-mono text-[12px]"
            value={specJson}
            onChange={(event) => setSpecJson(event.target.value)}
            placeholder={JSON.stringify(templatePreview ?? {}).slice(0, 120)}
          />
          {parsedSpec.error ? <p className="text-xs text-destructive">{parsedSpec.error}</p> : null}
        </div>

        <Button
          className="w-full"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || title.trim().length < 3 || !parsedSpec.spec}
        >
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Add to diagram library
        </Button>
      </section>

      <section className="space-y-3">
        <div className="panel rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Preview</p>
          {parsedSpec.spec ? (
            <div className="mt-3">
              <EconomicsDiagram
                spec={parsedSpec.spec as never}
                title={title || "Untitled diagram"}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Fix the geometry JSON to preview.</p>
          )}
        </div>

        {diagrams.isLoading ? <Skeleton className="h-24 w-full" /> : null}

        {(diagrams.data ?? []).map((row) => (
          <div
            key={row.id}
            className="panel flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">
                {row.section} · {row.topic} · {row.level}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => deleteMutation.mutate(row.id)}
              aria-label={`Delete ${row.title}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {diagrams.data && diagrams.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom diagrams yet — the library still shows all built-in Cambridge diagrams.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ShowcaseAdminPanel() {
  const queryClient = useQueryClient();
  const listShowcase = useServerFn(adminListShowcaseEssays);
  const toggleVisibility = useServerFn(adminToggleShowcaseVisibility);
  const addExemplar = useServerFn(adminAddShowcaseExemplar);
  const deleteExemplar = useServerFn(adminDeleteShowcaseExemplar);

  const query = useQuery({
    queryKey: ["admin-showcase-essays"],
    queryFn: () => listShowcase(),
  });

  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [maxMark, setMaxMark] = useState<number>(12);
  const [totalMark, setTotalMark] = useState<number>(12);
  const [ao1, setAo1] = useState<number | undefined>(2);
  const [ao2, setAo2] = useState<number | undefined>(6);
  const [ao3, setAo3] = useState<number | undefined>(4);
  const [topicName, setTopicName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [examinerSummary, setExaminerSummary] = useState("");
  const [essayText, setEssayText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-showcase-essays"] });
    queryClient.invalidateQueries({ queryKey: ["showcase-essays"] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      addExemplar({
        data: {
          question,
          maxMark,
          totalMark,
          ao1Awarded: ao1,
          ao2Awarded: ao2,
          ao3Awarded: ao3,
          topicName: topicName || undefined,
          authorName: authorName || undefined,
          examinerSummary: examinerSummary || undefined,
          essayText,
        },
      }),
    onSuccess: async () => {
      toast.success("Exemplar essay added to Showcase.");
      setQuestion("");
      setEssayText("");
      setExaminerSummary("");
      setTopicName("");
      setAuthorName("");
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { versionId: string; hidden: boolean }) =>
      toggleVisibility({ data: input }),
    onSuccess: async (res) => {
      toast.success(
        res.hidden ? "Essay hidden from student showcase." : "Essay restored to showcase.",
      );
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExemplar({ data: { id } }),
    onSuccess: async () => {
      toast.success("Essay removed from showcase.");
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const allItems: ShowcaseEssayItem[] = (query.data as ShowcaseEssayItem[]) ?? [];
  const filtered = allItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      item.question.toLowerCase().includes(q) ||
      (item.topic_name && item.topic_name.toLowerCase().includes(q)) ||
      item.author_initials.toLowerCase().includes(q) ||
      item.essay_text.toLowerCase().includes(q)
    );
  });

  const visibleCount = allItems.filter((i) => !i.is_hidden).length;
  const hiddenCount = allItems.filter((i) => i.is_hidden).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
      {/* Left: Add Exemplar */}
      <section className="panel rounded-xl border border-border p-5 space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="size-4 text-primary" /> Add Model Exemplar
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Publish verified Cambridge examiner exemplar answers directly to the Showcase.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Question text</Label>
            <Textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Evaluate whether supply-side policies are more effective than demand-side..."
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tariff</Label>
              <Select
                value={String(maxMark)}
                onValueChange={(val) => {
                  const num = Number(val);
                  setMaxMark(num);
                  setTotalMark(num);
                  if (num === 8) {
                    setAo1(3);
                    setAo2(5);
                    setAo3(undefined);
                  } else if (num === 12) {
                    setAo1(2);
                    setAo2(6);
                    setAo3(4);
                  } else if (num === 20) {
                    setAo1(4);
                    setAo2(8);
                    setAo3(8);
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8-mark question</SelectItem>
                  <SelectItem value="12">12-mark question</SelectItem>
                  <SelectItem value="20">20-mark question</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Awarded mark</Label>
              <Input
                type="number"
                min={1}
                max={maxMark}
                value={totalMark}
                onChange={(e) => setTotalMark(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">AO1 Mark</Label>
              <Input
                type="number"
                value={ao1 ?? ""}
                onChange={(e) => setAo1(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">AO2 Mark</Label>
              <Input
                type="number"
                value={ao2 ?? ""}
                onChange={(e) => setAo2(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO2"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">AO3 Mark</Label>
              <Input
                type="number"
                value={ao3 ?? ""}
                onChange={(e) => setAo3(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Topic name (optional)</Label>
              <Input
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g. Macroeconomic policy"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Author name</Label>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Cambridge Senior Examiner"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Examiner commentary / Band notes</Label>
            <Textarea
              rows={2}
              value={examinerSummary}
              onChange={(e) => setExaminerSummary(e.target.value)}
              placeholder="Why this essay achieves Level 5..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Full exemplar essay text</Label>
            <Textarea
              rows={6}
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Write or paste full model essay here..."
              className="font-serif text-xs leading-relaxed"
            />
          </div>

          <Button
            className="w-full"
            onClick={() => addMutation.mutate()}
            disabled={
              addMutation.isPending || question.trim().length < 5 || essayText.trim().length < 20
            }
          >
            {addMutation.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 size-4" />
            )}
            Publish to Showcase
          </Button>
        </div>
      </section>

      {/* Right: Manage Showcase Essays */}
      <section className="space-y-4">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Showcase Repository &amp; Moderation</h3>
            <p className="text-xs text-muted-foreground">
              {visibleCount} active in student showcase • {hiddenCount} hidden from view
            </p>
          </div>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter showcase essays…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No showcase essays match your search.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.version_id}
                className={`panel rounded-xl border p-4 transition-all duration-150 ${
                  item.is_hidden
                    ? "border-destructive/30 bg-destructive/[0.02] opacity-70"
                    : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={item.is_hidden ? "destructive" : "default"}
                        className="text-[11px] font-semibold"
                      >
                        <Trophy className="mr-1 size-3" />
                        {item.total_mark} / {item.max_mark} marks
                      </Badge>

                      {item.is_hidden ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 text-[11px] text-destructive"
                        >
                          <EyeOff className="mr-1 size-3" /> Hidden from Students
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-[11px] text-emerald-600 dark:text-emerald-400"
                        >
                          <Eye className="mr-1 size-3" /> Live in Showcase
                        </Badge>
                      )}

                      <Badge variant="secondary" className="text-[11px]">
                        {item.source === "cambridge_model"
                          ? "Cambridge Model"
                          : item.source === "teacher_model"
                            ? "Teacher Exemplar"
                            : item.source === "admin_added"
                              ? "Admin Added"
                              : "Student Auto"}
                      </Badge>

                      <span className="text-[11px] text-muted-foreground">
                        Author:{" "}
                        <strong className="font-medium text-foreground">
                          {item.author_initials}
                        </strong>
                      </span>
                    </div>

                    <p className="text-xs font-semibold leading-snug text-foreground">
                      {item.question}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        toggleMutation.mutate({
                          versionId: item.version_id,
                          hidden: !item.is_hidden,
                        })
                      }
                      disabled={toggleMutation.isPending}
                    >
                      {item.is_hidden ? (
                        <>
                          <Eye className="mr-1 size-3.5" /> Restore
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-1 size-3.5 text-muted-foreground" /> Hide
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(item.version_id)}
                      disabled={deleteMutation.isPending}
                      title="Remove or permanently hide"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setExpandedId(expandedId === item.version_id ? null : item.version_id)
                      }
                    >
                      {expandedId === item.version_id ? "Close" : "Inspect"}
                    </Button>
                  </div>
                </div>

                {expandedId === item.version_id ? (
                  <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs">
                    {item.grading?.examiner_summary ? (
                      <p className="rounded-md bg-muted/40 p-2.5 italic text-muted-foreground">
                        "{item.grading.examiner_summary}"
                      </p>
                    ) : null}
                    <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/20 p-3 font-serif text-foreground border border-border/40">
                      {item.essay_text}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PricingAdminPanel() {
  const queryClient = useQueryClient();
  const getPricingFn = useServerFn(getPlatformPricing);
  const updatePricingFn = useServerFn(updatePlatformPricing);
  const manageUserCreditsFn = useServerFn(adminManageUserCredits);

  const pricingQuery = useQuery({
    queryKey: ["platform-pricing"],
    queryFn: () => getPricingFn(),
    staleTime: 30_000,
  });

  const activePlans = pricingQuery.data?.plans ?? DEFAULT_PRICING_PLANS;

  // Local state for tier editing
  const [tierForms, setTierForms] = useState<
    Record<
      string,
      {
        monthlyPrice: number;
        annualPrice: number;
        essaysPerMonth: number;
        liveCredits: number;
        hasExperimentalLabs: boolean;
      }
    >
  >({});

  const getTierState = (tier: "foundation" | "scholar_plus" | "pro" | "mastery" | "elite") => {
    if (tierForms[tier]) return tierForms[tier];
    const plan = activePlans[tier];
    return {
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      essaysPerMonth: plan.essaysPerMonth,
      liveCredits: plan.liveCredits,
      hasExperimentalLabs: plan.hasExperimentalLabs ?? (tier === "mastery" || tier === "elite"),
    };
  };

  const updateTierMutation = useMutation({
    mutationFn: (data: {
      tier: "foundation" | "scholar_plus" | "pro" | "mastery" | "elite";
      monthlyPrice: number;
      annualPrice: number;
      essaysPerMonth: number;
      liveCredits: number;
      hasExperimentalLabs: boolean;
    }) => updatePricingFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Plan pricing updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["platform-pricing"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update pricing."),
  });

  // User Credit Manager State
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedUserTier, setSelectedUserTier] = useState<string>("pro");
  const [bonusLiveCredits, setBonusLiveCredits] = useState<number>(0);
  const [bonusEssays, setBonusEssays] = useState<number>(0);
  const [resetUsage, setResetUsage] = useState<boolean>(false);

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

  const tiers: ("foundation" | "scholar_plus" | "pro" | "mastery" | "elite")[] = [
    "foundation",
    "scholar_plus",
    "pro",
    "mastery",
    "elite",
  ];

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

      {/* Dynamic Tier Pricing Editor */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Coins className="size-4 text-primary" />
              Dynamic Platform Pricing &amp; Tier Editor
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edit live student prices, annual discounts, monthly essay quotas, and Live Examiner credit allocations. Changes instantly reflect across{" "}
              <code className="text-primary font-mono text-[11px]">/pricing</code> and{" "}
              <code className="text-primary font-mono text-[11px]">/payment</code>.
            </p>
          </div>
          {pricingQuery.data?.isCustom ? (
            <Badge variant="outline" className="text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Custom DB Values Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
              Default Config Active
            </Badge>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tierKey) => {
            const plan = activePlans[tierKey];
            const current = getTierState(tierKey);

            return (
              <div
                key={tierKey}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/50 p-4 space-y-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {tierKey}
                    </span>
                    {current.hasExperimentalLabs && (
                      <Badge className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        Labs Access
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-1">{plan.name}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {plan.tagline}
                  </p>
                </div>

                <div className="space-y-3 border-t border-border/60 pt-3 text-xs">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Monthly Price (₹)</Label>
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
                    <Label className="text-[11px] text-muted-foreground">Annual Price (₹)</Label>
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

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Monthly Essays Quota</Label>
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
                    <Label className="text-[11px] text-muted-foreground">Live Examiner Credits</Label>
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

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Experimental Labs
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
                </div>

                <Button
                  size="sm"
                  className="w-full text-xs font-medium h-8 cursor-pointer"
                  disabled={updateTierMutation.isPending}
                  onClick={() =>
                    updateTierMutation.mutate({
                      tier: tierKey,
                      ...current,
                    })
                  }
                >
                  {updateTierMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : null}
                  Save {plan.name}
                </Button>
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
            Target any user by UUID to promote their tier, inject bonus Live Examiner credits, grant extra essays, or reset their usage counter.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">User ID (UUID)</Label>
            <Input
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assign Active Tier</Label>
            <Select value={selectedUserTier} onValueChange={setSelectedUserTier}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free Starter (2 essays)</SelectItem>
                <SelectItem value="foundation">Foundation Scholar</SelectItem>
                <SelectItem value="scholar_plus">Scholar Plus</SelectItem>
                <SelectItem value="pro">Pro Accelerator</SelectItem>
                <SelectItem value="mastery">A* Mastery Sprint</SelectItem>
                <SelectItem value="elite">Cambridge Elite Pass</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bonus Live Credits</Label>
            <Input
              type="number"
              placeholder="+10"
              value={bonusLiveCredits || ""}
              onChange={(e) => setBonusLiveCredits(Number(e.target.value))}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bonus Graded Essays</Label>
            <Input
              type="number"
              placeholder="+5"
              value={bonusEssays || ""}
              onChange={(e) => setBonusEssays(Number(e.target.value))}
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <Switch checked={resetUsage} onCheckedChange={setResetUsage} id="reset-usage-switch" />
            <Label htmlFor="reset-usage-switch" className="text-xs cursor-pointer">
              Reset Essay Counter to 0
            </Label>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <Button
              className="w-full text-xs font-semibold h-9 cursor-pointer"
              disabled={!targetUserId.trim() || manageCreditsMutation.isPending}
              onClick={() =>
                manageCreditsMutation.mutate({
                  userId: targetUserId.trim(),
                  tier: selectedUserTier as any,
                  bonusLiveCredits,
                  bonusEssays,
                  resetUsageCount: resetUsage,
                })
              }
            >
              {manageCreditsMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-400" />
              )}
              Apply User Quota &amp; Tier
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentApprovalsAdminPanel() {
  const queryClient = useQueryClient();
  const listRequestsFn = useServerFn(listUpiPaymentRequests);
  const approveRequestFn = useServerFn(approveUpiPaymentRequest);
  const rejectRequestFn = useServerFn(rejectUpiPaymentRequest);
  const revokeRequestFn = useServerFn(revokeUpiPaymentRequest);
  const updateUpiFn = useServerFn(updateMerchantUpiConfig);
  const getPricingConfigFn = useServerFn(getPaymentConfig);

  const paymentsQuery = useQuery({
    queryKey: ["admin-upi-payments"],
    queryFn: () => listRequestsFn(),
    refetchInterval: 12_000,
  });

  const configQuery = useQuery({
    queryKey: ["payment-config"],
    queryFn: () => getPricingConfigFn(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const [upiInput, setUpiInput] = useState("");
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const requests = paymentsQuery.data?.requests || [];
  const activeMerchantUpi = configQuery.data?.merchantUpiId || "8754256082-2@ybl";

  const updateUpiMutation = useMutation({
    mutationFn: (data: { upiId: string }) => updateUpiFn({ data }),
    onSuccess: async (res: any) => {
      toast.success(res?.message || "Merchant UPI updated!");
      await queryClient.invalidateQueries({ queryKey: ["payment-config"] });
      configQuery.refetch();
      setUpiInput("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update UPI ID."),
  });

  const approveMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; tier: any }) => approveRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Payment verified and approved!");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.message || "Approval failed."),
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; reason?: string }) => rejectRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Payment request rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
    },
    onError: (err: any) => toast.error(err?.message || "Rejection failed."),
  });

  const revokeMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; reason?: string }) => revokeRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Subscription access revoked.");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.message || "Revocation failed."),
  });

  const copyUtr = (utr: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      toast.success(`UTR #${utr} copied!`);
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.utr.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.tier.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Section 1: Merchant UPI Settings ── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Coins className="size-4 text-emerald-500" />
              Direct UPI Merchant Configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set the bank UPI ID where student payments will be sent via QR code or direct UPI apps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active UPI ID:</span>
            <code className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground border border-border">
              {activeMerchantUpi}
            </code>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-border/60">
          <Input
            placeholder="Enter your real UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)"
            value={upiInput}
            onChange={(e) => setUpiInput(e.target.value)}
            className="text-xs font-mono bg-background h-9 flex-1"
          />
          <Button
            size="sm"
            disabled={!upiInput.trim() || updateUpiMutation.isPending}
            onClick={() => updateUpiMutation.mutate({ upiId: upiInput.trim() })}
            className="w-full sm:w-auto text-xs font-semibold h-9 shrink-0 gap-1.5 cursor-pointer"
          >
            {updateUpiMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Save Active UPI ID
          </Button>
        </div>
      </div>

      {/* ── Section 2: Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Submissions
          </p>
          <p className="text-2xl font-bold mt-1 text-foreground">{requests.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500 animate-pulse" />
            Pending Verification
          </p>
          <p className="text-2xl font-bold mt-1 text-amber-900 dark:text-amber-200">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Approved Payments
          </p>
          <p className="text-2xl font-bold mt-1 text-emerald-900 dark:text-emerald-200">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Rejected / Fraud
          </p>
          <p className="text-2xl font-bold mt-1 text-muted-foreground">{rejectedCount}</p>
        </div>
      </div>

      {/* ── Section 3: Approvals Desk Table ── */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "approved"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Approved ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("rejected")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "rejected"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search UTR or student email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 bg-background"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => paymentsQuery.refetch()}
              className="h-8 px-2 text-xs cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className={cn("size-3.5", paymentsQuery.isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500/60" />
            <p className="font-semibold text-foreground text-sm">
              {statusFilter === "pending"
                ? "No pending approvals in queue!"
                : "No matching payment requests found."}
            </p>
            <p className="max-w-xs mx-auto text-muted-foreground">
              {statusFilter === "pending"
                ? "All student payments have been verified against your bank statement."
                : "Incoming UPI reference submissions will appear here automatically."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Left Info: Email & Tier */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {req.userEmail}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
                    >
                      {req.tier} · ₹{req.amount}
                    </Badge>
                    {(req as any).couponCode && (
                      <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1 font-mono font-bold">
                        <Tag className="size-2.5" /> {(req as any).couponCode}
                      </Badge>
                    )}
                    {req.status === "pending" && (
                      <Badge className="bg-amber-500 text-white text-[10px] gap-1 font-semibold">
                        <Clock className="size-3 animate-pulse" /> Pending Verification
                      </Badge>
                    )}
                    {req.status === "approved" && (
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-semibold">
                        <CheckCircle2 className="size-3" /> Approved
                      </Badge>
                    )}
                    {req.status === "rejected" && (
                      <Badge variant="destructive" className="text-[10px] gap-1 font-semibold">
                        <XCircle className="size-3" /> Rejected
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <span>
                      Submitted: {new Date(req.submittedAt).toLocaleDateString()} at{" "}
                      {new Date(req.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {req.reviewedAt && (
                      <span className="text-[10px] text-muted-foreground/80">
                        (Reviewed {new Date(req.reviewedAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Center: 12-Digit UTR with 1-Click Copy */}
                <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/80 shrink-0">
                  <div className="space-y-0.5">
                    <p className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-wider">
                      Bank Ref (UTR)
                    </p>
                    <code className="text-xs font-mono font-bold text-foreground">
                      {req.utr}
                    </code>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUtr(req.utr)}
                    className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                    title="Copy UTR to check bank SMS or GPay app"
                  >
                    {copiedUtr === req.utr ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedUtr === req.utr ? "Copied" : "Copy"}
                  </Button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {req.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() =>
                          approveMutation.mutate({
                            logId: req.id,
                            userId: req.userId,
                            tier: req.tier,
                          })
                        }
                        className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve &amp; Upgrade
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Reject payment submission for ${req.userEmail} with UTR #${req.utr}?`)) {
                            rejectMutation.mutate({
                              logId: req.id,
                              userId: req.userId,
                              reason: "UTR not found in bank credits",
                            });
                          }
                        }}
                        className="h-8 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </>
                  )}

                  {req.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revokeMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Revoke subscription for ${req.userEmail} and reset to Free?`)) {
                          revokeMutation.mutate({
                            logId: req.id,
                            userId: req.userId,
                            reason: "Admin manual revocation",
                          });
                        }
                      }}
                      className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      Revoke Access
                    </Button>
                  )}

                  {req.status === "rejected" && (
                    <span className="text-[11px] text-muted-foreground italic">
                      Rejected ({req.rejectionReason || "Invalid UTR"})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

