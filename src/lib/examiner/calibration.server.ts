import type { SupabaseClient } from "@supabase/supabase-js";

export type Anchor = {
  question: string;
  essay_text: string;
  mark: number;
  max_mark: number;
  band_label: string;
  notes: string | null;
};

/**
 * Gold-standard Cambridge 9708 Senior Examiner Calibration Exemplars.
 * These are embedded directly in code to guarantee zero-downtime, deterministic
 * grounding against real examiner marks and level descriptors even if the database
 * cache or connection is temporarily degraded.
 */
export const BUILT_IN_CAMBRIDGE_ANCHORS: Anchor[] = [
  {
    question: "Assess whether supply-side policy is the best method to reduce the rate of inflation.",
    mark: 4,
    max_mark: 12,
    band_label: "bottom",
    notes:
      "Official Cambridge Senior Examiner Mark: 4/12 (Table A AO1+AO2: 3/8; Table B AO3: 1/4). " +
      "Why this fluent 600-word essay receives only 4/12: " +
      "1. Question-Fit Gate Failure: The question asks whether supply-side policy is the 'best' method to reduce inflation. " +
      "The candidate writes extensively on how various supply-side policies work, but completely fails to analyze alternative policies " +
      "(contractionary monetary policy: interest rates; contractionary fiscal policy: taxation/government spending) on a stated criterion. " +
      "Under Cambridge rules, answering 'does X work?' instead of 'is X the best?' caps Table A at Level 2 (max 5/8) and caps AO3 at 1/4. " +
      "2. Three Major Economic Theoretical Errors: " +
      "- Paragraph 2: Confuses accelerating inflation with hyperinflation (states accelerating inflation is 'characterised by over a 50% increase in price level a month' - this is hyperinflation, whereas accelerating inflation is merely an increasing inflation rate). " +
      "- Paragraph 4: Meaningless mechanism: claims demand-pull inflation decreases 'as slowly equals AD' (AS=AD is equilibrium, not a transmission mechanism). " +
      "- Paragraph 8: Asserts that investment leads to a 'rise in money supply' (investment is AD component I; it does not automatically expand the money supply). " +
      "Two or more major theoretical errors strictly caps Table A at Level 2 (max 5/8), and in this flawed context Table A earns 3/8. " +
      "3. Capped Hedge Conclusion (AO3: 1/4): The candidate concludes with 'a mix of all the supply-side policies along with the implementation of contractionary demand side policies', " +
      "a classic unranked hedge. Because no alternative policy was analysed in the essay body and no comparative weighing occurred, Table B is strictly capped at 1/4. " +
      "Total: Table A (3/8) + Table B (1/4) = 4/12.",
    essay_text: `Supply-side policies are policies aimed at increasing the aggregate supply of the economy. This involves retraining workers to increase their skills and qualifications to increase their employability, thus increasing their standard of living, causing economic growth. Inflation is essentially the rise in price level of an economy over a period of time.

Inflation rate is the percentage by which the inflation changes and can be classified into two types, there is creeping inflation and accelerating inflation. Creeping inflation is a very low rate of inflation and accelerating inflation is an extremely high growth rate of inflation. It is characterised by over a 50% increase in price level a month.

One type of supply-side policy is reformation of trade unions. This involves reducing the negotiating power trade unions have in bargaining for high wages, so that firms can instead employ a larger number of workers at a lower wage level. This helps prevent the wage-inflation spiral that occurs after workers press for higher wages leading to higher costs of production for the firm thus higher prices. So due to higher prices workers again press for higher wages which results in a spiral that leads to inflation. Thus prevents the rate of inflation from increasing to a certain extent.

Another supply-side policy is provision of education and training. This increases the skills thus productivity of each worker thus increasing the productive capacity of a firm leading to economic growth. This can lead to low export prices as increased productivity and efficiency lead to more competitive goods. This leads to lower import prices for trading countries, thus reducing their cost-push inflation leading to low rate of inflation for them. This may lead to a more favourable trading agreement for the exporting country, so cost-push inflation of exporting country also decreases. Reducing the rate of inflation. Furthermore this increase in aggregate supply means that demand-pull inflation will decrease as slowly equals AD.

Provision of increased health care will also lead to better living standard of consumers which will increase their productivity thus increasing aggregate supply, thereby controlling demand-pull inflation leading to low rate of inflation.

Overtime as skills and productivity of workers rise both AD and AS are more likely to stay in equilibrium which leads to a good rate of inflation aka ‘creeping inflation’. This low level of inflation is positive since it promises a good economic future.

However increased skills and qualification of workers may make them move out of the country in search of better employment opportunities or better living standards. This is called ‘brain drain’. This means those who are less skilled and qualified are left behind, meaning the home country’s workers still present in the country have low skill so low productive potential of firm. There will be a rise in cost of production due to mismatch between productivity and wage rate of workers leading to cost-push inflation which increases the rate of inflation.

Investing in technology and research and development as a form of supply side policy may exacerbate the rate of inflation in the short-run due to increased investment leading to rise in money supply without increasing aggregate supply to combat increase in aggregate demand. However in the long-run it will lead to development of better methods of production leading to increased quantity and quality of domestically produced goods. This increase in aggregate supply helps lower rate of inflation by lowering cost-push inflation.

In conclusion a mix of all the supply-side policies along with the implementation of contractionary demand side policies will help reduce the rate of inflation in both the short-run and the long-run. The government should analyse the situation of the economy and accordingly decide the magnitude of implementation of the supply-side and demand-side policies to ensure a low and stable rate of inflation. As a high rate of inflation causes uncertainty and instability in an economy which leads to low economic growth. However if only one supply-side policy had to be chosen it would be to improve the education and training of workers as it would help increase aggregate supply sustainably according to aggregate demand.`,
  },
  {
    question: "Assess whether governments should always support the provision of merit goods in markets such as those for education or health care.",
    mark: 10,
    max_mark: 12,
    band_label: "top",
    notes:
      "Official Cambridge Senior Examiner Mark: 10/12 (Table A AO1+AO2: 8/8; Table B AO3: 2/4). " +
      "Table A earns full 8/8 marks for detailed, accurate multi-chain analysis of positive externalities, under-consumption due to information failure, " +
      "and market under-provision with diagrammatic explanation. However, Table B is strictly capped at 2/4 because the conclusion recommends 'a mix of strategies' " +
      "without establishing an explicit ranking or conditions for why one policy is superior in specific market contexts.",
    essay_text: `Government can give support to merit goods like healthcare through subsidies and direct provisions. Merit goods are goods with significant positive externality that is usually underfocused in an economy.

The government may need to support provision because of information failure. As consumers may not know the benefits of the merit goods, the demand in the market becomes very less, signaling and disincentivising producers to produce these goods. This means that public welfare may be affected so the government may use consumer side subsidies and grants to increase consumption.

But, this may not be true in the long run. As provision may be expensive and providing them in the long run can cause a budget deficit for the government. Therefore, consumption of these goods may not increase in the long run due to opportunity cost of government spending, leading to less social welfare. Also government failure, such as what public choice theory states can lead to ineffective bureaucracy and loss in welfare.

The government may use support provision to ensure that producers are not impacted. When merit goods are not demanded in the market because MSB>MPB, producers may not be able to make enough revenue. Thai may lead to unemployment and low wages, causing the government to intervene using subsidies to ensure that suppliers can make a profit, and these markets remain stable to increase social welfare For example, the government may support teachers to both increase literacy of citizens but to also ensure teachers’ welfare. 

However, the subsidies and grants may not be enough. Though subsidies can be beneficial, incidence of subsidies matters. If demand is inelastic for merit goods like education is in developed economies, incidence of subsidies causes subsidies to benefit firms more. 

(Diagram A subsidy shifts the supply curve to the right from S to S₁, reducing the market price from P to P₁ and increasing output from Q to Q₁. The incidence of the subsidy depends on the price elasticity of demand (PED). When demand is relatively inelastic, consumers are less responsive to the fall in price, so the price decreases by only a small amount. Consequently, producers retain a larger proportion of the subsidy as higher revenue per unit, while consumers receive a smaller benefit through lower prices. In contrast, when demand is relatively elastic, consumers respond more strongly to lower prices, causing a larger fall in the market price. As a result, consumers receive a greater share of the subsidy in the form of lower prices, while producers receive a smaller share. Therefore, the side of the market that is less price elastic captures a greater proportion of the subsidy, as it is less responsive to changes in price. )

Finally, the government may need to use intervention to ensure that merit goods like education and healthcare remain affordable. In cases of well developed economies, as information is widespread, merit goods may be high in price due to high demand. Therefore the government may need to provide financial grants to healthcare and education sectors to ensure that the goods are provided for all.

But, this may not be true if PES is very elastic. If PES is very elastic this means that supply can quickly be increased. With new capital in both healthcare and education systems, through AI and robotics, PES of these products becomes more and more elastic. That means more firms can easily enter the market and use economies of scale to increase profit and provision for all. In this case subsidies are not always required.

In conclusion, the government may need to use provisions for merit goods to ensure social welfare of both producers and consumers.It may not always be sustainable in the long run to give subsidies, as inefficiency may rise due to poor management of some firms. Though government intervention through subsidies is still a dynamic way to increase welfare and growth, it is not always required.`,
  },
];

let cachedAnchors: { data: Anchor[]; timestamp: number } | null = null;
const ANCHOR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Loads every active calibration anchor.
 * Prefers the server admin client to avoid issues with expired student session JWTs,
 * with memory cache fallback and safe error recovery so essay grading never misses
 * calibration anchors. Always merges built-in Cambridge gold-standard exemplars.
 */
export async function fetchCalibrationAnchors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: SupabaseClient<any>,
): Promise<Anchor[]> {
  const now = Date.now();
  if (cachedAnchors && now - cachedAnchors.timestamp < ANCHOR_CACHE_TTL_MS && cachedAnchors.data.length > 0) {
    return cachedAnchors.data;
  }

  try {
    let client = supabase;
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      if (supabaseAdmin) {
        client = supabaseAdmin;
      }
    } catch {
      // Fall back to provided client
    }

    let result: Anchor[] = [...BUILT_IN_CAMBRIDGE_ANCHORS];

    if (client) {
      let { data, error } = await client
        .from("calibration_anchors")
        .select("question, essay_text, mark, max_mark, band_label, notes")
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (error && (error.message?.includes("JWT") || error.code === "PGRST301")) {
        try {
          const { supabaseAdmin } = await import("@/integrations/backend/client.server");
          if (supabaseAdmin && client !== supabaseAdmin) {
            const retry = await supabaseAdmin
              .from("calibration_anchors")
              .select("question, essay_text, mark, max_mark, band_label, notes")
              .eq("active", true)
              .order("created_at", { ascending: true });
            if (!retry.error && retry.data) {
              data = retry.data;
              error = null;
            }
          }
        } catch {}
      }

      if (!error && Array.isArray(data) && data.length > 0) {
        // Merge database anchors, giving precedence to database versions
        const dbAnchors = data as Anchor[];
        const merged: Anchor[] = [...dbAnchors];
        for (const builtin of BUILT_IN_CAMBRIDGE_ANCHORS) {
          const alreadyExists = merged.some(
            (a) => a.question.trim().toLowerCase() === builtin.question.trim().toLowerCase()
          );
          if (!alreadyExists) {
            merged.push(builtin);
          }
        }
        result = merged;
      }
    }

    cachedAnchors = { data: result, timestamp: now };
    return result;
  } catch (err: any) {
    console.warn(`[calibration.server] Unexpected error fetching calibration anchors: ${err?.message || err}.`);
    return cachedAnchors?.data ?? BUILT_IN_CAMBRIDGE_ANCHORS;
  }
}

/**
 * Selects the single most relevant calibration anchor based on question topic keywords
 * and mark tariff, ensuring the system injects the exact Cambridge ground-truth benchmark.
 */
export function selectBestAnchor(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
): Anchor | null {
  const pool = anchors.length > 0 ? anchors : BUILT_IN_CAMBRIDGE_ANCHORS;
  if (!question) return pool[0] ?? null;

  const qLower = question.toLowerCase();
  const stopwords = new Set([
    "what", "when", "where", "which", "with", "would", "could", "should",
    "discuss", "assess", "explain", "consider", "extent", "always", "between",
    "either", "about", "their", "there", "these", "those", "using", "question",
    "evaluate", "analyse", "analyze", "essay", "marks", "curve", "diagram",
    "does", "have", "more", "most", "than", "that", "this", "some", "such",
  ]);
  const qWords = qLower.match(/[a-z]{3,}/g)?.filter((w) => !stopwords.has(w)) || [];

  let bestAnchor: Anchor = pool[0]!;
  let bestScore = -1;

  for (const anchor of pool) {
    let score = 0;
    const aQ = anchor.question.toLowerCase();
    const aText = `${anchor.question} ${anchor.notes || ""}`.toLowerCase();

    // Exact or near-exact question match gets massive priority
    if (aQ.trim() === qLower.trim()) {
      score += 100;
    } else if (
      qLower.includes("supply-side") &&
      aQ.includes("supply-side") &&
      qLower.includes("inflation") &&
      aQ.includes("inflation")
    ) {
      score += 50;
    } else if (
      qLower.includes("merit good") &&
      aQ.includes("merit good")
    ) {
      score += 50;
    }

    // Topic keyword relevance matching
    for (const word of qWords) {
      if (aText.includes(word)) {
        score += 3;
      }
    }

    // Tariff alignment (e.g. matching 12-mark vs 8-mark vs 20-mark)
    if (typeof maxMark === "number") {
      if (anchor.max_mark === maxMark) {
        score += 4;
      } else if (Math.abs(anchor.max_mark - maxMark) <= 4) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestAnchor = anchor;
    }
  }

  return bestAnchor;
}

/**
 * Builds a focused, topic-aware calibration section using at least 1 relevant
 * exemplar essay matching the question's syllabus topic and mark tariff.
 */
export function buildAnchorBlock(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
): string {
  const chosenAnchor = selectBestAnchor(anchors, question, maxMark);
  if (!chosenAnchor) return "";

  const label = chosenAnchor.band_label ? chosenAnchor.band_label.toUpperCase() : "EXEMPLAR";

  const sections: string[] = [
    "REAL CALIBRATION EXAMPLE — provided by a Cambridge senior examiner with a confirmed mark. " +
      "Treat this as ground truth for your scoring scale:",
    `\n--- ${label} CALIBRATION BENCHMARK ---\n` +
      `Question: ${chosenAnchor.question}\n` +
      `Confirmed mark: ${chosenAnchor.mark}/${chosenAnchor.max_mark}\n` +
      `Senior Examiner Rationale: ${chosenAnchor.notes ?? "(Standard Cambridge level benchmark)"}\n` +
      `Exemplar Script:\n${chosenAnchor.essay_text}\n` +
      `--- END EXAMPLE ---`,
  ];

  return sections.join("\n");
}
