import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isMarginalAdmin } from "@/lib/auth-admin";

export type ShowcaseAoScore = {
  awarded: number;
  out_of: number;
  comment?: string;
};

export type ShowcaseAoBreakdown = {
  knowledge?: ShowcaseAoScore;
  analysis?: ShowcaseAoScore;
  evaluation?: ShowcaseAoScore;
};

export type ShowcaseGrading = {
  band?: string;
  examiner_summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  actionable_feedback?: string[];
  ao_breakdown?: ShowcaseAoBreakdown;
  confidence?: number;
};

export type ShowcaseEssayItem = {
  essay_id: string;
  version_id: string;
  question: string;
  max_mark: number;
  total_mark: number;
  ao1_awarded: number | null;
  ao2_awarded: number | null;
  ao3_awarded: number | null;
  essay_text: string;
  grading: ShowcaseGrading | null;
  topic_id: string | null;
  topic_name: string | null;
  author_initials: string;
  showcased_at: string;
  is_hidden?: boolean;
  source?: "student_auto" | "teacher_model" | "cambridge_model" | "admin_added";
};

// In-memory / server state for admin overrides
const ADMIN_HIDDEN_ESSAY_IDS = new Set<string>();
const ADMIN_CUSTOM_EXEMPLARS: ShowcaseEssayItem[] = [];

// Built-in Cambridge 9708 Level 4 & Level 5 Exemplar Essays
const CAMBRIDGE_SHOWCASE_EXEMPLARS: ShowcaseEssayItem[] = [
  {
    essay_id: "ex-12m-aggregate-demand",
    version_id: "ver-12m-aggregate-demand",
    question:
      "Discuss whether an increase in aggregate demand would be of overall benefit for an economy. [12]",
    max_mark: 12,
    total_mark: 10,
    ao1_awarded: 2,
    ao2_awarded: 5,
    ao3_awarded: 3,
    topic_id: "topic-macro-ad",
    topic_name: "Macroeconomic goals and aggregate demand",
    author_initials: "Top Student",
    showcased_at: "2026-10-02T16:15:00.000Z",
    source: "student_auto",
    grading: {
      band: "Top Band (Level 4 Distinction)",
      examiner_summary:
        "Strong, well-structured response accurately defining AD components (C+I+G+NX) and tracing the transmission mechanism to real GDP, derived labour demand, and fiscal receipts with clear spare-capacity evaluation.",
      strengths: [
        "Accurate definition of aggregate demand by its components (C+I+G+NX) and sound macroeconomic conceptual foundation.",
        "Clear analytical chains of reasoning linking higher AD to output, derived demand for labour, tax revenues, and induced investment.",
        "Strong evaluative points integrated throughout the essay examining spare capacity, elasticity of aggregate supply, fiscal cost/debt risks, and demand-pull inflation.",
      ],
      actionable_feedback: [
        "To achieve full 12/12 marks, explicitly mention the external sector trade-off where higher national income fuels marginal propensity to import (MPM), potentially worsening the current account deficit.",
      ],
      ao_breakdown: {
        knowledge: {
          awarded: 2,
          out_of: 2,
          comment:
            "Accurate definition of aggregate demand by its components (C+I+G+NX) and sound understanding of macroeconomic growth.",
        },
        analysis: {
          awarded: 5,
          out_of: 6,
          comment:
            "Clear analytical chains of reasoning linking higher AD to output, derived demand for labour, tax revenues, and induced investment.",
        },
        evaluation: {
          awarded: 3,
          out_of: 4,
          comment:
            "Strong evaluative points examining spare capacity, LRAS limits, fiscal debt risks of government-led stimulus, and inflation.",
        },
      },
    },
    essay_text: `Aggregate demand is equal to C+I+G+NX. Aggregate demand can be increased in certain cases by expansionary monetary and fiscal policies. Increased aggregate demand can cause demand pull inflation.

Increased aggregate demand may mean an increase in production. As when aggregate demand is high, it means suppliers are incentivised to produce due to their profit motive. Increased production can lead to increased job opportunities, and also increased production leads to an increase in GDP (Economic growth). Higher output also leads to higher corporate tax revenue and income tax revenue for the government, improving the fiscal budget.

However, the level of increase in production depends on the production possibility curve (PPC) and where the economy is currently operating. If the economy is operating with substantial spare capacity (a negative output gap), an increase in aggregate demand shifts real output towards full employment without immediately triggering cost or price pressures.

Conversely, if the economy is operating near full capacity (along the vertical segment of the LRAS), an increase in aggregate demand only generates demand-pull inflation without increasing real output. Furthermore, rapid demand expansion often triggers higher import expenditure, causing deterioration on the current account of the balance of payments.

In evaluation, whether an increase in aggregate demand is of overall benefit depends critically on the initial macroeconomic state: it is highly beneficial during a cyclical downturn with spare capacity, but risks stagflation and currency instability if applied when the economy is at full employment without matching supply-side expansion.`,
  },
  {
    essay_id: "ex-8m-public-merit",
    version_id: "ver-8m-public-merit",
    question:
      "Explain the difference between public goods and merit goods, and explain why the free market fails to provide them adequately. [8]",
    max_mark: 8,
    total_mark: 8,
    ao1_awarded: 3,
    ao2_awarded: 5,
    ao3_awarded: null,
    topic_id: "topic-micro-failure",
    topic_name: "Basic economic ideas and resource allocation",
    author_initials: "C. E.",
    showcased_at: "2026-09-25T10:00:00.000Z",
    source: "cambridge_model",
    grading: {
      band: "Level 4 (Full Marks 8/8)",
      examiner_summary:
        "Flawless distinction between non-excludability/non-rivalry of pure public goods and the information failure characterising merit goods. Excellent explanation of the free-rider problem and missing markets.",
      strengths: [
        "Precise definitions of non-excludability and non-rivalry with zero marginal cost of extra consumers.",
        "Clear distinction between private marginal benefit (MPB) and marginal social benefit (MSB = MPB + MEB) for merit goods.",
        "Rigorous explanation of why non-excludability leads to free-riding and missing markets in private equilibrium.",
      ],
      actionable_feedback: [
        "Exemplary structure — maintains technical terminology throughout while addressing both parts of the 8-mark prompt.",
      ],
      ao_breakdown: {
        knowledge: {
          awarded: 3,
          out_of: 3,
          comment:
            "Comprehensive understanding of public goods (non-excludable, non-rival) and merit goods (positive externalities, imperfect information).",
        },
        analysis: {
          awarded: 5,
          out_of: 5,
          comment:
            "Coherent, stepwise economic chain explaining free-riding, absence of price signal, under-consumption and deadweight welfare loss.",
        },
      },
    },
    essay_text: `A public good possesses two distinct technical characteristics: non-excludability and non-rivalry in consumption. Non-excludability means that once the good is provided, it is impossible to prevent individuals who have not paid from consuming it (e.g. national defence, street lighting). Non-rivalry means that one individual's consumption does not diminish the quantity or quality available to others; the marginal cost of supplying an additional consumer is zero.

In contrast, merit goods are excludable and rivalrous private goods (such as education and healthcare), but are under-consumed in a free market due to two key market failures: positive externalities in consumption (social benefit exceeds private benefit) and imperfect information (consumers suffer from bounded rationality and fail to appreciate long-term private returns).

The free market fails to allocate resources efficiently in both cases, but for different economic reasons:
1. For public goods, non-excludability leads directly to the free-rider problem. Because rational individuals anticipate they can enjoy the benefit without contributing to production costs, zero market demand is revealed through the price mechanism (willingness to pay = 0). Consequently, private firms cannot generate profit and there is complete market failure (a missing market), necessitating state provision funded via taxation.
2. For merit goods, because consumers only take into account their private marginal benefit (MPB) rather than the marginal social benefit (MSB = MPB + MEB), market equilibrium output (where MPB = MPC) falls below the socially optimal output (where MSB = MSC). This creates a welfare loss (deadweight loss), resulting in partial market failure that requires government interventions such as subsidies, state provision, or compulsory consumption laws.`,
  },
  {
    essay_id: "ex-12m-indirect-tax",
    version_id: "ver-12m-indirect-tax",
    question:
      "Assess whether the imposition of an indirect tax on demerit goods is always the most effective policy to reduce their consumption. [12]",
    max_mark: 12,
    total_mark: 12,
    ao1_awarded: 2,
    ao2_awarded: 6,
    ao3_awarded: 4,
    topic_id: "topic-micro-intervention",
    topic_name: "Government microeconomic intervention",
    author_initials: "A. R.",
    showcased_at: "2026-09-26T14:30:00.000Z",
    source: "cambridge_model",
    grading: {
      band: "Level 5 Distinction (12/12)",
      examiner_summary:
        "Rigorous analytical chain tracing the impact of specific vs ad-valorem indirect taxes with PED sensitivity. Outstanding evaluation comparing taxation against educational campaigns, minimum pricing, and age restrictions.",
      strengths: [
        "Internalisation of negative externalities explained via MPC to MPC+tax shift.",
        "Critical evaluative focus on price elasticity of demand (|PED| < 1) and regressive tax incidence.",
        "Comparative evaluation of alternative interventions: minimum unit pricing, advertising bans, and education.",
      ],
      actionable_feedback: [
        "Master-class evaluative synthesis recommending a complementary policy mix rather than relying on taxation alone.",
      ],
      ao_breakdown: {
        knowledge: {
          awarded: 2,
          out_of: 2,
          comment:
            "Accurate economic definitions of demerit goods, negative externalities, and indirect tax incidence.",
        },
        analysis: {
          awarded: 6,
          out_of: 6,
          comment:
            "Exemplary explanation of supply curve shift, contraction in quantity demanded towards social optimum (MSB=MSC), and hypothecated revenue.",
        },
        evaluation: {
          awarded: 4,
          out_of: 4,
          comment:
            "Balanced critique considering addictive inelasticity, illicit black market formation, and justification of a multi-policy approach.",
        },
      },
    },
    essay_text: `Demerit goods are private goods that are over-consumed in a free market because consumers suffer from information failure regarding their harmful private effects, and their consumption generates negative externalities (e.g. smoking creating passive health hazards, where MSC > MSB). 

An indirect tax (such as an excise duty on tobacco or alcohol) shifts the marginal private cost (supply) curve upwards and to the left by the amount of the tax (from MPC to MPC + tax). This internalises the external cost, raising the equilibrium market price from P1 to P2 and contracting quantity demanded from Q1 towards the socially optimum level Q* (where MSB = MSC), thereby eliminating the deadweight welfare loss triangle. Additionally, indirect taxes generate substantial tax revenue for the government, which can be hypothecated towards healthcare or anti-addiction education.

However, an indirect tax is not always the most effective policy due to several critical limitations:
1. Price Elasticity of Demand (PED): Demerit goods are frequently habit-forming or addictive, exhibiting highly price-inelastic demand (|PED| < 1). As a result, an increase in price leads to a proportionately smaller contraction in quantity demanded. Producers easily pass the bulk of the tax burden onto consumers, meaning consumption remains high while lower-income households face regressive welfare impacts.
2. Creation of Illicit Black Markets: Excessively high indirect taxes widen the price differential between legal and illicit goods, incentivising smuggling and counterfeit sales which bypass quality controls and evade government revenue.
3. Alternative and Complementary Policies: 
- Minimum Unit Pricing directly prevents supermarkets from discounting high-strength demerit goods without relying on tax incidence.
- Information campaigns, health warnings, and advertising bans directly address the root information asymmetry, shifting the MPB curve permanently inward rather than merely moving along an existing demand curve.
- Regulatory bans (e.g. smoking in public places or age limits) achieve direct, enforceable volume reductions.

In evaluation, an indirect tax is necessary but rarely sufficient on its own. While highly effective at raising hypothecated revenue and internalising monetary external costs, its efficacy in reducing physical consumption is constrained by price inelasticity. Therefore, the most effective policy approach is a combined policy package: using indirect taxes to penalise consumption and generate revenue, alongside targeted behavioral nudges, educational campaigns, and strict regulatory enforcement to eradicate the underlying information failure.`,
  },
  {
    essay_id: "ex-20m-growth-policies",
    version_id: "ver-20m-growth-policies",
    question:
      "Evaluate whether supply-side policies are more effective than demand-side policies in achieving sustained, non-inflationary economic growth. [20]",
    max_mark: 20,
    total_mark: 19,
    ao1_awarded: 4,
    ao2_awarded: 8,
    ao3_awarded: 7,
    topic_id: "topic-macro-policy",
    topic_name: "Macroeconomic policy",
    author_initials: "S. K.",
    showcased_at: "2026-09-28T09:15:00.000Z",
    source: "cambridge_model",
    grading: {
      band: "Level 5 Master Exemplar (19/20)",
      examiner_summary:
        "Comprehensive macroeconomic reasoning contrasting short-run demand management with long-run LRAS expansion. Strong contextualisation of time lags, fiscal opportunity costs, and spare capacity.",
      strengths: [
        "Clear distinction between actual growth (AD shift into spare capacity) and potential growth (LRAS/PPC outward shift).",
        "Thorough coverage of both interventionist (infrastructure, education) and market-oriented (deregulation, tax cuts) supply-side policies.",
        "Superb evaluation explaining why supply and demand policies are complementary rather than mutually exclusive.",
      ],
      actionable_feedback: [
        "Include a brief reference to potential trade-off with the current account on the balance of payments for full 20/20 marks.",
      ],
      ao_breakdown: {
        knowledge: {
          awarded: 4,
          out_of: 4,
          comment:
            "Precise definitions of sustainable growth, non-inflationary capacity, LRAS, and aggregate demand components.",
        },
        analysis: {
          awarded: 8,
          out_of: 8,
          comment:
            "Deep macroeconomic chain of reasoning tracing fiscal/monetary multiplier effects and outward LRAS shifts lowering inflationary pressure.",
        },
        evaluation: {
          awarded: 7,
          out_of: 8,
          comment:
            "Strong critical evaluation considering time lags (5-15 years), fiscal burdens, and macroeconomic state-dependence (recession vs boom).",
        },
      },
    },
    essay_text: `Sustained, non-inflationary economic growth requires an economy's productive capacity (Long-Run Aggregate Supply, LRAS) to expand in tandem with Aggregate Demand (AD), ensuring actual GDP rises without triggering demand-pull or cost-push inflationary spirals.

Demand-side policies (expansionary monetary and fiscal policies) aim to boost AD (AD = C + I + G + (X - M)). For instance, lowering interest rates reduces the cost of borrowing and mortgages, stimulating consumption (C) and investment (I), while raising government capital spending (G) injects direct demand via the Keynesian multiplier. If the economy operates with substantial spare capacity (a negative output gap), demand stimulus increases real output toward full employment (Yf) without significant upward pressure on the general price level.

However, demand-side policies cannot sustain growth indefinitely. Once an economy reaches the vertical or inelastic portion of its LRAS curve, further increases in AD only generate demand-pull inflation (price level rises from P1 to P2) without increasing real GDP. Furthermore, expansionary fiscal policy risks escalating sovereign debt and crowding out private investment, while loose monetary policy may weaken the exchange rate, exacerbating imported cost-push inflation.

Supply-side policies, by contrast, focus on increasing the quantity and quality of the factors of production and improving market efficiency, shifting the LRAS and PPC outward:
1. Interventionist supply-side policies: Government investments in education, vocational training (human capital), and national infrastructure (transport, broadband) lower structural costs for private firms and raise labour productivity.
2. Market-oriented supply-side policies: Deregulation, reduction in corporate tax rates, and labour market reforms (reducing trade union power or minimum wage rigidities) incentivise enterprise and enterprise investment.

The critical advantage of supply-side policies is that as LRAS shifts outward from LRAS1 to LRAS2, the economy experiences both higher real national output (Y1 to Y2) and downward pressure on the price level (P1 to P2), achieving the exact condition of non-inflationary, sustainable growth.

Nevertheless, supply-side policies face pronounced drawbacks:
- Severe Time Lags: Major educational reforms and infrastructure projects take 5 to 15 years to yield tangible productivity dividends.
- Fiscal Opportunity Costs: Heavy state capital spending requires upfront taxation or borrowing.
- Uncertainty of Outcome: Lowering taxes may lead to dividend hoarding rather than productive capital investment.
- Ineffectiveness in a Slump: Expanding productive capacity when consumer confidence is depressed does not generate sales if aggregate demand is deficient.

In conclusion, supply-side policies are fundamentally superior for ensuring that long-term growth remains non-inflationary, as only an increase in productive potential can prevent overheating at full capacity. However, they are not universally more effective in isolation: supply-side and demand-side policies are interdependent complements. Without sufficient aggregate demand, newly created capacity remains idle; without continuous supply-side expansion, demand stimulus inevitably degrades into inflation. Hence, maximum policy effectiveness requires synchronized macroeconomic management: steady demand growth to utilize emerging capacity alongside targeted supply-side investments to expand the productive frontier.`,
  },
  {
    essay_id: "ex-12m-exchange-rate",
    version_id: "ver-12m-exchange-rate",
    question:
      "Discuss whether a depreciation of a country's exchange rate will always improve its current account balance on the balance of payments. [12]",
    max_mark: 12,
    total_mark: 11,
    ao1_awarded: 2,
    ao2_awarded: 5,
    ao3_awarded: 4,
    topic_id: "topic-trade-macro",
    topic_name: "International trade and exchange rates",
    author_initials: "M. T.",
    showcased_at: "2026-09-29T11:45:00.000Z",
    source: "cambridge_model",
    grading: {
      band: "Level 5 Exemplar (11/12)",
      examiner_summary:
        "Crisp explanation of relative export/import prices, Marshall-Lerner condition calculation, and J-curve trajectory with clear evaluative synthesis.",
      strengths: [
        "Clear mathematical condition stating |PEDx| + |PEDm| > 1 for trade balance improvement.",
        "Detailed explanation of short-run trade contract rigidities explaining the J-curve deficit deterioration.",
        "Evaluation incorporates imported cost-push inflation and non-price competitiveness.",
      ],
      actionable_feedback: [
        "Include an explicit reference to domestic spare capacity required to meet higher export demand.",
      ],
      ao_breakdown: {
        knowledge: {
          awarded: 2,
          out_of: 2,
          comment:
            "Accurate definitions of exchange rate depreciation, current account balance, and terms of trade.",
        },
        analysis: {
          awarded: 5,
          out_of: 6,
          comment:
            "Thorough analytical transmission mechanism linking currency depreciation to relative price changes and trade balance adjustment.",
        },
        evaluation: {
          awarded: 4,
          out_of: 4,
          comment:
            "Robust critical judgment examining Marshall-Lerner elasticity conditions, short-run vs long-run time lags (J-curve), and retaliatory tariff risks.",
        },
      },
    },
    essay_text: `A depreciation of a floating exchange rate means a fall in the external value of a currency against other currencies. This alters relative international prices: exports become cheaper in terms of foreign currencies, whilst imports become more expensive in terms of domestic currency.

According to standard economic theory, cheaper exports stimulate foreign demand, raising export volumes (Qx), while dearer imports contract domestic demand for foreign goods (Qm). If total export revenue (Px × Qx) rises and total import expenditure (Pm × Qm) falls, the trade balance and current account will improve.

However, a depreciation does not *always* improve the current account due to four crucial economic conditions:

1. The Marshall-Lerner Condition (PEDx + PEDm > 1):
A depreciation only improves the current account balance if the sum of the price elasticities of demand for exports and imports is greater than one in absolute terms (|PEDx| + |PEDm| > 1). If demand is inelastic (|PEDx| + |PEDm| < 1), the percentage increase in export volume is insufficient to offset the lower foreign currency price, while import expenditure increases in domestic currency terms, worsening the deficit.

2. The J-Curve Effect (Short-run vs Long-run Time Lags):
In the short run, trade contracts are fixed and consumers/firms require time to find domestic substitutes. Consequently, demand is inelastic in the short term (|PEDx + PEDm| < 1), causing the current account deficit to deteriorate initially before improving in the long run once elasticities adjust (tracing a 'J' shape).

3. Cost-Push Inflation and Loss of Competitiveness:
If the domestic economy relies heavily on imported raw materials and capital equipment, depreciation causes imported inflation. This raises domestic costs of production, which shifts the SRAS curve leftward. If domestic wages and prices rise, the initial price competitiveness gained from the nominal depreciation is completely eroded.

4. Non-Price Competitiveness and Global Retaliation:
If exports suffer from poor quality, weak design, or unreliable delivery schedules, foreign buyers will not switch despite lower prices. Moreover, if trading partners respond with competitive devaluations or protectionist tariffs, export gains will be neutralised.

In evaluation, a currency depreciation will only reliably improve the current account in the medium to long run provided the Marshall-Lerner condition is satisfied, domestic inflation is kept under control, and the economy possesses sufficient spare capacity to produce additional export volumes without causing shortages.`,
  },
];

function formatAuthorInitials(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) return "Anonymous";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase() + ".";
  return (
    parts[0].slice(0, 1).toUpperCase() +
    ". " +
    parts[parts.length - 1].slice(0, 1).toUpperCase() +
    "."
  );
}

/**
 * Checks whether an essay qualifies for automatic showcase display:
 * - 8-marker: >= 7 marks (7 or 8)
 * - 12-marker: >= 10 marks (10, 11, 12)
 * - 20-marker: >= 15 marks (15 to 20)
 * - Any other tariff: >= 75% of max marks
 */
export function isShowcaseScore(totalMark: number, maxMark: number): boolean {
  if (maxMark === 8) return totalMark >= 7;
  if (maxMark === 12) return totalMark >= 10;
  if (maxMark === 20) return totalMark >= 15;
  return totalMark >= Math.round(maxMark * 0.75);
}

async function getAdminDatabaseClient(fallbackClient: any) {
  try {
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();
    if (admin) return admin;
  } catch {
    /* fallback */
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    if (supabaseAdmin) return supabaseAdmin;
  } catch {
    /* fallback */
  }
  return fallbackClient;
}

/**
 * List showcase essays — automatically returns ALL qualifying high-scoring essays
 * (>=7 for 8m, >=10 for 12m, >=15 for 20m, plus teacher/admin exemplars) across the entire platform.
 */
export const listShowcaseEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topicId: z.string().optional(),
        tariff: z.number().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const results: ShowcaseEssayItem[] = [];

    // 1. Decoupled, schema-resilient database query for student and teacher submissions
    try {
      const client = await getAdminDatabaseClient(context.supabase);

      // Query raw essay_versions directly without fragile relational joins
      const { data: dbVersions, error: vError } = await client
        .from("essay_versions")
        .select(
          "id, essay_id, user_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading, created_at",
        )
        .not("total_mark", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!vError && dbVersions && dbVersions.length > 0) {
        // Collect IDs for separate batch fetching
        const essayIds = Array.from(
          new Set(dbVersions.map((v: any) => v.essay_id).filter(Boolean)),
        );
        const userIds = Array.from(new Set(dbVersions.map((v: any) => v.user_id).filter(Boolean)));

        // Fetch parent essay metadata (question, max_mark, topic_id)
        const essaysMap = new Map<
          string,
          { question: string; max_mark: number; topic_id: string | null }
        >();
        if (essayIds.length > 0) {
          const { data: essaysData } = await client
            .from("essays")
            .select("id, question, max_mark, topic_id")
            .in("id", essayIds);
          for (const e of essaysData ?? []) {
            essaysMap.set(e.id, e);
          }
        }

        // Fetch user profiles for author display names
        const profilesMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profilesData } = await client
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          for (const p of profilesData ?? []) {
            if (p.full_name) profilesMap.set(p.id, p.full_name);
          }
        }

        // Fetch user roles to distinguish teachers/admins
        const roleMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: rolesData } = await client
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);
          for (const r of rolesData ?? []) {
            roleMap.set(r.user_id, r.role);
          }
        }

        // Fetch topic names
        const topicIds = Array.from(
          new Set(
            Array.from(essaysMap.values())
              .map((e) => e.topic_id)
              .filter(Boolean),
          ),
        ) as string[];
        const topicsMap = new Map<string, string>();
        if (topicIds.length > 0) {
          const { data: topicsData } = await client
            .from("topics")
            .select("id, name")
            .in("id", topicIds);
          for (const t of topicsData ?? []) {
            topicsMap.set(t.id, t.name);
          }
        }

        for (const row of dbVersions as any[]) {
          const essayMeta = essaysMap.get(row.essay_id);
          const maxMark = essayMeta?.max_mark ?? 12;
          const totalMark = row.total_mark;
          const userRole = roleMap.get(row.user_id);
          const isTeacher = userRole === "teacher";

          // Qualifies if teacher response or score meets distinction threshold (e.g. 10/12, 8/8, 15/20)
          if (totalMark !== null && (isTeacher || isShowcaseScore(totalMark, maxMark))) {
            const versionId = row.id as string;
            // Check if hidden by administrator
            if (ADMIN_HIDDEN_ESSAY_IDS.has(versionId) || ADMIN_HIDDEN_ESSAY_IDS.has(row.essay_id)) {
              continue;
            }

            let parsedGrading: ShowcaseGrading | null = null;
            if (typeof row.grading === "string") {
              try {
                parsedGrading = JSON.parse(row.grading);
              } catch {
                parsedGrading = null;
              }
            } else if (typeof row.grading === "object" && row.grading !== null) {
              parsedGrading = row.grading as ShowcaseGrading;
            }

            const authorName = profilesMap.get(row.user_id);
            const authorInitials = isTeacher
              ? authorName
                ? `${authorName} (Economics Faculty)`
                : "Economics Faculty"
              : formatAuthorInitials(authorName);

            const topicName = essayMeta?.topic_id
              ? (topicsMap.get(essayMeta.topic_id) ?? "Cambridge Economics")
              : "Cambridge Economics";

            results.push({
              essay_id: row.essay_id,
              version_id: versionId,
              question: essayMeta?.question || "Cambridge 9708 Economics Question",
              max_mark: maxMark,
              total_mark: totalMark,
              ao1_awarded: row.ao1_awarded ?? null,
              ao2_awarded: row.ao2_awarded ?? null,
              ao3_awarded: row.ao3_awarded ?? null,
              essay_text: row.essay_text,
              grading: parsedGrading,
              topic_id: essayMeta?.topic_id || null,
              topic_name: topicName,
              author_initials: authorInitials,
              showcased_at: row.created_at,
              source: isTeacher
                ? "teacher_model"
                : userRole === "admin"
                  ? "admin_added"
                  : "student_auto",
            });
          }
        }
      }
    } catch (err) {
      console.warn("Database query for showcase essays encountered error:", err);
    }

    // 2. Append Cambridge Model Answers & Admin Custom Exemplars
    const visibleCambridge = CAMBRIDGE_SHOWCASE_EXEMPLARS.filter(
      (e) => !ADMIN_HIDDEN_ESSAY_IDS.has(e.version_id) && !ADMIN_HIDDEN_ESSAY_IDS.has(e.essay_id),
    );
    const visibleCustom = ADMIN_CUSTOM_EXEMPLARS.filter(
      (e) => !ADMIN_HIDDEN_ESSAY_IDS.has(e.version_id) && !ADMIN_HIDDEN_ESSAY_IDS.has(e.essay_id),
    );

    let combined = [...visibleCustom, ...results, ...visibleCambridge];

    // Filter by topic if requested
    if (data.topicId) {
      combined = combined.filter((e) => e.topic_id === data.topicId);
    }

    // Filter by tariff if requested
    if (data.tariff) {
      combined = combined.filter((e) => e.max_mark === data.tariff);
    }

    // Sort by highest mark percentage first, then date
    combined.sort((a, b) => {
      const scoreDiff = b.total_mark / b.max_mark - a.total_mark / a.max_mark;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      return new Date(b.showcased_at).getTime() - new Date(a.showcased_at).getTime();
    });

    return combined.slice(0, data.limit ?? 100);
  });

/* ------------------------------------------------------------------ */
/* Admin Showcase Management Functions                                 */
/* ------------------------------------------------------------------ */

/**
 * List all showcase essays for administrators, including hidden items and source details.
 */
export const adminListShowcaseEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = isMarginalAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const allItems: ShowcaseEssayItem[] = [];

    // Decoupled DB query
    try {
      const client = await getAdminDatabaseClient(context.supabase);

      const { data: dbVersions } = await client
        .from("essay_versions")
        .select(
          "id, essay_id, user_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading, created_at",
        )
        .not("total_mark", "is", null)
        .order("created_at", { ascending: false });

      if (dbVersions && dbVersions.length > 0) {
        const essayIds = Array.from(
          new Set(dbVersions.map((v: any) => v.essay_id).filter(Boolean)),
        );
        const userIds = Array.from(new Set(dbVersions.map((v: any) => v.user_id).filter(Boolean)));

        const essaysMap = new Map<
          string,
          { question: string; max_mark: number; topic_id: string | null }
        >();
        if (essayIds.length > 0) {
          const { data: essaysData } = await client
            .from("essays")
            .select("id, question, max_mark, topic_id")
            .in("id", essayIds);
          for (const e of essaysData ?? []) {
            essaysMap.set(e.id, e);
          }
        }

        const profilesMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profilesData } = await client
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          for (const p of profilesData ?? []) {
            if (p.full_name) profilesMap.set(p.id, p.full_name);
          }
        }

        const roleMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: rolesData } = await client
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);
          for (const r of rolesData ?? []) {
            roleMap.set(r.user_id, r.role);
          }
        }

        const topicIds = Array.from(
          new Set(
            Array.from(essaysMap.values())
              .map((e) => e.topic_id)
              .filter(Boolean),
          ),
        ) as string[];
        const topicsMap = new Map<string, string>();
        if (topicIds.length > 0) {
          const { data: topicsData } = await client
            .from("topics")
            .select("id, name")
            .in("id", topicIds);
          for (const t of topicsData ?? []) {
            topicsMap.set(t.id, t.name);
          }
        }

        for (const row of dbVersions as any[]) {
          const essayMeta = essaysMap.get(row.essay_id);
          const maxMark = essayMeta?.max_mark ?? 12;
          const totalMark = row.total_mark;
          const userRole = roleMap.get(row.user_id);
          const isTeacher = userRole === "teacher";

          if (totalMark !== null && (isTeacher || isShowcaseScore(totalMark, maxMark))) {
            const versionId = row.id as string;
            const isHidden =
              ADMIN_HIDDEN_ESSAY_IDS.has(versionId) || ADMIN_HIDDEN_ESSAY_IDS.has(row.essay_id);

            let parsedGrading: ShowcaseGrading | null = null;
            if (typeof row.grading === "string") {
              try {
                parsedGrading = JSON.parse(row.grading);
              } catch {
                parsedGrading = null;
              }
            } else if (typeof row.grading === "object" && row.grading !== null) {
              parsedGrading = row.grading as ShowcaseGrading;
            }

            const authorName = profilesMap.get(row.user_id);
            const authorInitials = isTeacher
              ? `${authorName ?? "Faculty"} (Teacher)`
              : authorName || "Student Submission";

            const topicName = essayMeta?.topic_id
              ? (topicsMap.get(essayMeta.topic_id) ?? "Cambridge Economics")
              : "Cambridge Economics";

            allItems.push({
              essay_id: row.essay_id,
              version_id: versionId,
              question: essayMeta?.question || "Cambridge 9708 Economics Question",
              max_mark: maxMark,
              total_mark: totalMark,
              ao1_awarded: row.ao1_awarded ?? null,
              ao2_awarded: row.ao2_awarded ?? null,
              ao3_awarded: row.ao3_awarded ?? null,
              essay_text: row.essay_text,
              grading: parsedGrading,
              topic_id: essayMeta?.topic_id || null,
              topic_name: topicName,
              author_initials: authorInitials,
              showcased_at: row.created_at,
              is_hidden: isHidden,
              source: isTeacher
                ? "teacher_model"
                : userRole === "admin"
                  ? "admin_added"
                  : "student_auto",
            });
          }
        }
      }
    } catch {
      // Fallback
    }

    // Append custom admin exemplars
    for (const custom of ADMIN_CUSTOM_EXEMPLARS) {
      allItems.push({
        ...custom,
        is_hidden: ADMIN_HIDDEN_ESSAY_IDS.has(custom.version_id),
        source: "admin_added",
      });
    }

    // Append Cambridge exemplars
    for (const ex of CAMBRIDGE_SHOWCASE_EXEMPLARS) {
      allItems.push({
        ...ex,
        is_hidden: ADMIN_HIDDEN_ESSAY_IDS.has(ex.version_id),
        source: "cambridge_model",
      });
    }

    return allItems;
  });

/**
 * Toggle visibility of an essay in the showcase (hide / unhide).
 */
export const adminToggleShowcaseVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ versionId: z.string(), hidden: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginalAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    if (data.hidden) {
      ADMIN_HIDDEN_ESSAY_IDS.add(data.versionId);
    } else {
      ADMIN_HIDDEN_ESSAY_IDS.delete(data.versionId);
    }

    return { ok: true, versionId: data.versionId, hidden: data.hidden };
  });

/**
 * Add a custom exemplar essay to the showcase (Admin only).
 */
export const adminAddShowcaseExemplar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().trim().min(5, "Question must be at least 5 characters."),
        maxMark: z.number().int().min(1).max(30),
        totalMark: z.number().int().min(1).max(30),
        ao1Awarded: z.number().int().optional(),
        ao2Awarded: z.number().int().optional(),
        ao3Awarded: z.number().int().optional(),
        essayText: z.string().trim().min(20, "Essay text must be at least 20 characters."),
        examinerSummary: z.string().trim().optional(),
        topicName: z.string().trim().optional(),
        authorName: z.string().trim().optional(),
        source: z
          .enum(["student_auto", "teacher_model", "cambridge_model", "admin_added"])
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginalAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const id = `custom-ex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newExemplar: ShowcaseEssayItem = {
      essay_id: id,
      version_id: id,
      question: data.question,
      max_mark: data.maxMark,
      total_mark: data.totalMark,
      ao1_awarded: data.ao1Awarded ?? null,
      ao2_awarded: data.ao2Awarded ?? null,
      ao3_awarded: data.ao3Awarded ?? null,
      essay_text: data.essayText,
      grading: {
        band: "Cambridge Level 5 Exemplar",
        examiner_summary:
          data.examinerSummary ||
          "Master-level Cambridge response with balanced chains of reasoning and thorough evaluation.",
        strengths: [
          "Cohesive analytical structure addressing all directive command words.",
          "Strong integration of economic theory with evaluative context.",
        ],
        actionable_feedback: ["Exemplary standard for Level 4/5 revision."],
        ao_breakdown: {
          knowledge: {
            awarded: data.ao1Awarded ?? Math.round(data.maxMark * 0.25),
            out_of: Math.round(data.maxMark * 0.25),
            comment: "Accurate definitions and conceptual foundations.",
          },
          analysis: {
            awarded: data.ao2Awarded ?? Math.round(data.maxMark * 0.5),
            out_of: Math.round(data.maxMark * 0.5),
            comment: "Stepwise economic reasoning and mechanism analysis.",
          },
          evaluation: {
            awarded: data.ao3Awarded ?? Math.round(data.maxMark * 0.25),
            out_of: Math.round(data.maxMark * 0.25),
            comment: "Balanced evaluation with contextual synthesis.",
          },
        },
      },
      topic_id: null,
      topic_name: data.topicName || "Cambridge Economics",
      author_initials: data.authorName ? formatAuthorInitials(data.authorName) : "Exemplar Author",
      showcased_at: new Date().toISOString(),
      source: data.source || "admin_added",
      is_hidden: false,
    };

    ADMIN_CUSTOM_EXEMPLARS.unshift(newExemplar);
    return { ok: true, exemplar: newExemplar };
  });

/**
 * Remove or delete an essay from the showcase.
 */
export const adminDeleteShowcaseExemplar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginalAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    // Remove from custom exemplars if present
    const customIdx = ADMIN_CUSTOM_EXEMPLARS.findIndex(
      (e) => e.version_id === data.id || e.essay_id === data.id,
    );
    if (customIdx !== -1) {
      ADMIN_CUSTOM_EXEMPLARS.splice(customIdx, 1);
    } else {
      // Add to hidden set
      ADMIN_HIDDEN_ESSAY_IDS.add(data.id);
    }

    return { ok: true, id: data.id };
  });
