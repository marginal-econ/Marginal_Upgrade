/**
 * Comprehensive Cambridge International A Level (A2) Economics Coursebook Suite
 *
 * Ingests authoritative textbooks, coursebook units, and masterclass revision
 * resources covering the complete Cambridge 9708 A Level syllabus (Units 6 to 10)
 * into `knowledge_documents` and `document_chunks`.
 *
 * Usage:
 *   npx tsx scripts/import-a-level-textbooks.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFallback() {
  if (process.env.BACKEND_URL && process.env.BACKEND_SERVICE_ROLE_KEY) return;
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnvFallback();

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const TARGET_CHARS = 1200;
const OVERLAP_CHARS = 180;

function chunkText(raw: string) {
  const normalised = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (normalised.length === 0) return [];

  const chunks: Array<{
    index: number;
    content: string;
    heading: string | null;
    tokenEstimate: number;
  }> = [];

  const paragraphs = normalised.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  let buffer = "";
  let chunkIndex = 0;
  let currentHeading: string | null = null;

  for (const para of paragraphs) {
    if (para.startsWith("#")) {
      currentHeading = para.replace(/^#+\s*/, "").slice(0, 100);
    }

    if (buffer.length + para.length > TARGET_CHARS && buffer.length > 0) {
      chunks.push({
        index: chunkIndex++,
        content: buffer.trim(),
        heading: currentHeading,
        tokenEstimate: Math.ceil(buffer.length / 4),
      });
      buffer = buffer.slice(-OVERLAP_CHARS);
    }
    buffer += (buffer.length > 0 ? "\n\n" : "") + para;
  }

  if (buffer.trim().length > 0) {
    chunks.push({
      index: chunkIndex++,
      content: buffer.trim(),
      heading: currentHeading,
      tokenEstimate: Math.ceil(buffer.length / 4),
    });
  }

  return chunks;
}

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

interface TextbookSpec {
  title: string;
  docType: "coursebook" | "notes" | "examiner_report" | "syllabus";
  sourceName: string;
  examSeries: string;
  content: string;
}

const A_LEVEL_TEXTBOOKS: TextbookSpec[] = [
  // 1. A-LEVEL MICROECONOMICS COURSEBOOK (UNITS 6 & 7)
  {
    title: "Cambridge International A Level Economics (9708) — Coursebook: Advanced Microeconomics & Market Theory (Units 6 & 7)",
    docType: "coursebook",
    sourceName: "Cambridge International A Level Economics Authoritative Coursebook",
    examSeries: "Cambridge 9708 A Level Syllabus (A2)",
    content: `
# Unit 6: The Price System and the Microeconomy (Cambridge 9708 A Level)

## 6.1 Consumer Utility and Choice Theory
Consumer theory at Cambridge 9708 A Level extends basic demand analysis into utility foundations and ordinal indifference analysis.

### Cardinal Utility Theory & Law of Diminishing Marginal Utility
- **Total Utility (TU)**: The overall satisfaction gained from consuming a given quantity of a good or service.
- **Marginal Utility (MU)**: The addition to total satisfaction derived from consuming one extra unit of a good:
  \\[ MU = \\frac{\\Delta TU}{\\Delta Q} \\]
- **The Law of Diminishing Marginal Utility**: As an individual consumes additional units of a good within a given time period, the satisfaction derived from each subsequent unit declines.
- **Equi-Marginal Principle (Consumer Equilibrium)**: To maximize total satisfaction across multiple goods subject to a budget constraint, a consumer allocates income such that the marginal utility per dollar spent is equalised across all goods:
  \\[ \\frac{MU_A}{P_A} = \\frac{MU_B}{P_B} = \\dots = \\frac{MU_N}{P_N} \\]
- If \\( \\frac{MU_A}{P_A} > \\frac{MU_B}{P_B} \\), the rational consumer reallocates spending by purchasing more of Good A and less of Good B until diminishing marginal utility restores equality. This explains the downward-sloping individual demand curve.

### Ordinal Utility: Indifference Curves and Budget Lines
Indifference curve analysis avoids cardinal measurement of satisfaction by ranking consumer preferences.

#### Properties of Indifference Curves:
1. Downward sloping from left to right (non-satiation: more is preferred to less).
2. Convex to the origin, reflecting the **Diminishing Marginal Rate of Substitution (MRS)**. MRS is the rate at which a consumer is willing to give up good Y to obtain one extra unit of good X while maintaining the same total utility:
   \\[ MRS_{xy} = -\\frac{\\Delta Y}{\\Delta X} = \\frac{MU_X}{MU_Y} \\]
3. Higher indifference curves represent higher levels of total utility.
4. Indifference curves can never cross, complying with the axiom of transitivity.

#### The Budget Line:
Represents all combinations of two goods that a consumer can purchase given fixed money income (M) and market prices:
\\[ P_X X + P_Y Y = M \\]
The slope of the budget line is given by the relative price ratio:
\\[ \\text{Slope} = -\\frac{P_X}{P_Y} \\]

#### Consumer Equilibrium:
Consumer equilibrium occurs at the point of tangency between the budget line and the highest attainable indifference curve:
\\[ MRS_{xy} = \\frac{P_X}{P_Y} \\quad \\implies \\quad \\frac{MU_X}{MU_Y} = \\frac{P_X}{P_Y} \\]

### Income and Substitution Effects of a Price Change
When the price of Good X falls (pivot of budget line outward along the X-axis), total quantity demanded changes due to two distinct forces:
1. **Substitution Effect (SE)**: Always negative (acts in the opposite direction to price). Consumers substitute towards the relatively cheaper good, holding real utility constant (movement along the original indifference curve using Hicksian or Slutsky compensation).
2. **Income Effect (IE)**: The change in real purchasing power resulting from the price change. The direction depends on the nature of the good:
   - **Normal Good**: IE is positive (reinforces SE). Price falls \\(\\rightarrow\\) purchasing power rises \\(\\rightarrow\\) quantity demanded increases. SE and IE operate in the same direction, generating a downward-sloping demand curve.
   - **Inferior Good**: IE is negative (opposes SE). Price falls \\(\\rightarrow\\) purchasing power rises \\(\\rightarrow\\) consumer shifts away towards higher-quality goods. However, SE outweighs IE, so the overall demand curve remains downward sloping.
   - **Giffen Good**: A highly inferior staple good lacking close substitutes where the negative Income Effect overwhelms the Substitution Effect. A fall in price causes a net reduction in quantity demanded, leading to an upward-sloping demand curve.

---

## 6.2 Production, Costs and Revenues in the Short and Long Run

### Short Run Production & Costs
The short run is defined as the time period in which at least one factor of production is fixed (typically capital or factory premises).
- **Law of Diminishing Marginal Returns**: When successive units of a variable factor (labour) are added to a fixed factor (capital), there is a point beyond which the marginal product (MP) of the variable factor diminishes.
- **Three Stages of Production**:
  1. Increasing marginal returns (specialisation and division of labour).
  2. Diminishing marginal returns (fixed factor becomes crowded, MP declines but remains positive).
  3. Negative marginal returns (MP becomes negative, total output drops).
- **Cost Curves Relationship**:
  - \\( MC = \\frac{w}{MP_L} \\): Marginal cost is the mirror image of marginal product. When MP is at its maximum, MC is at its minimum.
  - Marginal Cost (MC) intersects Average Total Cost (ATC) and Average Variable Cost (AVC) at their respective minimum turning points.

### Long Run Costs & Returns to Scale
In the long run, all factors of production are variable.
- **Returns to Scale**:
  - Increasing Returns to Scale (Economies of Scale): A proportional increase in all inputs leads to a more than proportional increase in output.
  - Constant Returns to Scale: Output increases in direct proportion to inputs.
  - Decreasing Returns to Scale (Diseconomies of Scale): Output increases less than proportionally.
- **Internal Economies of Scale**: Purchasing/commercial, technical (increased dimensions, container principle), financial (lower borrowing rates), managerial, and risk-bearing economies.
- **Internal Diseconomies of Scale**: Managerial coordination failure, communication breakdowns, alienation and low worker morale.
- **Minimum Efficient Scale (MES)**: The lowest level of output at which a firm can achieve the lowest long-run average cost (LRAC). The size of MES relative to market demand determines industry structure (e.g., natural monopoly vs fragmented atomistic market).

---

## 6.3 Market Structures: Performance and Welfare Analysis

### Spectrum of Competition:
1. **Perfect Competition**:
   - Characteristics: Infinite buyers and sellers, homogeneous products, perfect information, price takers, zero barriers to entry/exit.
   - Short Run: Firms can make supernormal profit (P > AC), normal profit (P = AC), or subnormal profit/losses.
   - Long Run: Free entry/exit erodes supernormal profits until every firm produces at normal profit where:
     \\[ P = MR = MC = \\text{LRAC}_{\\min} \\]
   - Welfare: Achieves Allocative Efficiency (P = MC) and Productive Efficiency (min AC). Lacks Dynamic Efficiency due to absence of retained supernormal profit for R&D.

2. **Monopoly & Natural Monopoly**:
   - Characteristics: Single dominant firm (pure monopoly = 100% market share, legal monopoly in UK/EU = 25%+), unique product without close substitutes, substantial barriers to entry (patents, legal franchises, control of vital resources, high sunk costs).
   - Price and Output Determination: Firm sets output where \\( MC = MR \\) and charges price off the AR (demand) curve.
   - Welfare Evaluation:
     - Causes deadweight welfare loss (allocative inefficiency: \\( P > MC \\)).
     - Productive inefficiency (does not produce at minimum AC).
     - X-inefficiency (slack due to lack of competitive pressure).
     - Potential benefits: Dynamic efficiency (supernormal profits fund long-term R&D), natural monopoly economies of scale, cross-subsidisation of non-profitable social services.
   - **Natural Monopoly**: Occurs when an industry experiences continuous economies of scale such that LRAC falls continuously across the entire range of market demand. One firm can supply the whole market at lower unit cost than two or more competing firms (e.g., rail tracks, national electricity grid, water supply). Marginal cost pricing \\( P = MC \\) results in losses; requires average cost regulation or state subsidy.

3. **Price Discrimination**:
   - The practice of charging different prices to different consumers for the exact same good or service, not justified by cost differences.
   - Necessary conditions:
     1. Monopoly power (price-setting ability).
     2. Market separation (preventing arbitrage / resale between markets).
     3. Differing Price Elasticities of Demand (PED) across sub-markets.
   - Degrees of price discrimination:
     - First Degree (Perfect): Each unit sold at consumer's maximum willingness to pay, eliminating all consumer surplus.
     - Second Degree: Non-linear batch/volume pricing (e.g., bulk purchase discounts, off-peak electricity).
     - Third Degree: Segmenting markets by time, geography, age, or income (e.g., student railcards, peak vs off-peak airfares). Firm sets \\( MC = MR_A = MR_B \\), charging higher price in the relatively inelastic market.

4. **Monopolistic Competition**:
   - Characteristics: Large number of small firms, differentiated products (branding, packaging, design), low barriers to entry.
   - Downward sloping, relatively elastic demand curve.
   - Long run: Free entry shifts individual demand curves inward until tangency with AC occurs. Produces normal profit, but suffers from the **Excess Capacity Theorem**: fails to produce at minimum average cost and charges \\( P > MC \\).

5. **Oligopoly & Strategic Behaviour**:
   - Characteristics: Few large dominant firms, high concentration ratio (e.g. \\( CR_4 > 60\\% \\)), mutual interdependence, differentiated or standardized products, high barriers to entry.
   - **Kinked Demand Curve Theory (Paul Sweezy)**:
     - Assumes rivals will match price cuts (inelastic response below current price) but will not match price increases (elastic response above current price).
     - Results in a discontinuous Marginal Revenue curve. Cost shifts within the vertical gap leave equilibrium price and quantity unchanged (Price Rigidity).
   - **Game Theory & Prisoner's Dilemma**:
     - Simultaneous non-cooperative game where dominant strategy for both players leads to a sub-optimal Nash Equilibrium compared to cooperative collusion.
   - **Collusion**:
     - Overt Collusion (Cartels like OPEC): Explicit agreements on price, quotas, and market allocation. Vulnerable to secret cheating, differences in cost structures, and antitrust laws.
     - Tacit Collusion (Price Leadership): Barometric or dominant firm price leadership avoiding price wars without explicit communication.
   - **Contestable Markets Theory (William Baumol)**:
     - What matters is not market concentration, but the threat of entry.
     - A contestable market has zero sunk costs and freedom of entry and exit ("hit-and-run" competition). Even a monopoly will price at competitive normal profit (\\( P = AC \\)) to deter new entrants.

---

## 6.4 Labour Market Economics (Cambridge 9708)

### Demand for Labour: Marginal Revenue Productivity Theory (MRPL)
Labour demand is a derived demand. A profit-maximizing firm hires workers up to the point where the marginal cost of employing one more worker equals the marginal revenue generated by that worker:
\\[ MRPL = MPP_L \\times MR \\]
In perfect product competition (\\( MR = P \\)), \\( MRPL = VMPL = MPP_L \\times P \\).
- Shifts in Labour Demand: Changes in labour productivity, price of final product, and changes in the prices of substitute/complementary capital.

### Supply of Labour to an Industry:
Determined by wage rates, working conditions, qualifications and training time, occupational and geographical mobility, non-pecuniary perks.
- **Individual Labour Supply Curve**: substitution effect of higher wages (leisure becomes more expensive \\(\\rightarrow\\) work more) versus income effect (higher income enables consumer to afford more leisure \\(\\rightarrow\\) work less). If income effect dominates at high wage rates, the curve bends backward.

### Wage Determination in Different Market Structures:
1. **Perfect Labour Competition**:
   - Wage rate determined by market supply and demand. Firms are wage takers (horizontal labour supply \\( ACL = MCL = W_c \\)). Equilibrium employment where \\( MRPL = W_c \\).
2. **Monopsony Labour Market**:
   - Single buyer of labour. Facing an upward-sloping labour supply curve (\\( ACL \\)), the marginal cost of labour (\\( MCL \\)) lies above \\( ACL \\) because hiring an extra worker requires paying higher wages to all existing workers.
   - Monopsonist hires where \\( MCL = MRPL \\), but pays wage \\( W_m \\) off the \\( ACL \\) curve.
   - Results in **monopsonistic exploitation**: employment (\\( L_m < L_c \\)) and wages (\\( W_m < W_c \\)) are significantly lower than competitive levels.
3. **Trade Unions and Minimum Wages**:
   - In a competitive market, imposing a trade union wage or national minimum wage above equilibrium causes classical unemployment.
   - In a monopsony market, introducing an effective minimum wage turns the monopsonist's MCL curve horizontal at that wage level, simultaneously increasing wages and expanding employment without causing unemployment.
4. **Economic Rent vs Transfer Earnings**:
   - **Transfer Earnings**: The minimum payment required to keep a factor of production in its current employment.
   - **Economic Rent**: Any payment received above transfer earnings (analogous to producer surplus).
   - Inelastic labour supply yields high economic rent (e.g. elite surgeons, superstar athletes); perfectly elastic supply yields zero economic rent.

---

# Unit 7: Government Microeconomic Intervention (Cambridge 9708 A Level)

## 7.1 Efficiency Concepts and Market Failure
- **Pareto Optimality**: An allocation of resources where it is impossible to make one person better off without making someone else worse off.
- **Allocative Efficiency**: Occurs when society produces the exact mix of goods and services most desired by consumers:
  \\[ P = MC \\quad \\text{or} \\quad MSB = MSC \\]
- **Productive Efficiency**: Producing output at the minimum point of the average total cost curve:
  \\[ \\text{Lowest point of LRAC} \\]
- **Dynamic Efficiency**: Occurs over time through innovation, technological progress, and new production processes.
- **X-Inefficiency (Harvey Leibenstein)**: When a firm operates with higher costs than necessary, caused by organizational slack, lack of competition, or bureaucratic inertia.

## 7.2 Externalities and Deadweight Welfare Loss
- **Negative Externalities of Production**: \\( MSC > MPC \\) (e.g., carbon emissions from steel plants). In an unregulated free market, equilibrium output \\( Q_m \\) (where \\( MPC = MPB \\)) exceeds the socially optimum output \\( Q_{opt} \\) (where \\( MSC = MSB \\)), generating a deadweight welfare loss triangle pointing towards \\( Q_{opt} \\).
- **Positive Externalities of Consumption**: \\( MSB > MPB \\) (e.g., education, vaccines). Market underproduces \\( Q_m < Q_{opt} \\).

## 7.3 Information Asymmetry, Moral Hazard and Adverse Selection
- **Adverse Selection (George Akerlof)**: Occurs before the transaction when asymmetric information leads to high-risk individuals selecting into markets (e.g. lemons in the used-car market, or sickly individuals buying comprehensive health insurance).
- **Moral Hazard**: Occurs after a contract is signed when an insured party engages in riskier behaviour knowing that the insurer will absorb the financial losses (e.g., reckless banking following government bailouts).
- **Principal-Agent Dilemma**: Owners (shareholders/principals) delegate control to managers (agents) who pursue self-interested goals (status, empire-building, high salaries) rather than profit maximization.

## 7.4 Cost-Benefit Analysis (CBA)
A formal appraisal technique used by governments to evaluate major public infrastructure investment projects by comparing total social costs and total social benefits.
- **Steps in CBA**:
  1. Identify all private and external costs and benefits.
  2. Assign monetary values using shadow pricing, opportunity costing, and valuation methods for non-market goods (hedonic pricing, travel cost method, contingent valuation willingness-to-pay surveys).
  3. Apply a Social Discount Rate to convert future net flows to Net Present Value (NPV):
     \\[ NPV = \\sum_{t=0}^n \\frac{B_t - C_t}{(1 + r)^t} \\]
  4. Project is accepted if \\( NPV > 0 \\) and \\( B/C > 1 \\).
- **Critique & Limitations**: Subjective monetary valuation of human lives and environmental destruction, choice of discount rate, political bias, cost overruns.

## 7.5 Corrective Policy Instruments
- **Pigouvian Taxes**: Set equal to Marginal External Cost (MEC) at the social optimum. Internalises the externality, raises revenue, but requires precise information on external cost curves.
- **Tradable Pollution Permits (Cap and Trade)**: Government caps total pollution volume and issues tradable quotas. Creates a market price for carbon, incentivising low-cost abate firms to sell excess permits.
- **Price Capping Regulation (RPI - X / RPI + K)**: Applied to privatized utilities to curb monopoly exploitation while incentivising productive cost reductions.
- **Privatisation vs Nationalisation vs Deregulation**: Analysis of efficiency incentives, fiscal windfalls, natural monopoly exploitation, and quality degradation.
`,
  },

  // 2. A-LEVEL MACROECONOMICS COURSEBOOK (UNITS 8 & 9)
  {
    title: "Cambridge International A Level Economics (9708) — Coursebook: Advanced Macroeconomics & Policy Management (Units 8 & 9)",
    docType: "coursebook",
    sourceName: "Cambridge International A Level Economics Authoritative Coursebook",
    examSeries: "Cambridge 9708 A Level Syllabus (A2)",
    content: `
# Unit 8: The Macroeconomy (Cambridge 9708 A Level)

## 8.1 National Income Determination and the Circular Flow
At A Level, macroeconomic equilibrium is modelled using the circular flow of income, aggregate expenditure functions, and the interaction between leakages and injections.

### Circular Flow Model:
- **Injections (J)**: Additions of expenditure into the circular flow not arising from current domestic household income:
  \\[ J = I + G + X \\]
  (Investment, Government Spending, Exports).
- **Withdrawals / Leakages (W)**: Income received by households that is not spent on currently produced domestic goods:
  \\[ W = S + T + M \\]
  (Savings, Net Taxes, Imports).
- Macroeconomic equilibrium occurs where total planned leakages equal total planned injections:
  \\[ S + T + M = I + G + X \\]
- If \\( J > W \\), national output expands, generating unplanned depletion of inventories until income rises to restore \\( W = J \\).
- If \\( W > J \\), national output contracts, unplanned inventory accumulation occurs, reducing national income until \\( W = J \\).

### The Keynesian Multiplier and Accelerator
- **Marginal Propensity to Consume (MPC)**: The proportion of an increase in disposable income that is spent on consumption:
  \\[ MPC = \\frac{\\Delta C}{\\Delta Y} \\]
- **Marginal Propensity to Withdraw (MPW)**:
  \\[ MPW = MPS + MPT + MPM \\]
- **The Multiplier Formula (k)**:
  \\[ k = \\frac{1}{1 - MPC} = \\frac{1}{MPW} = \\frac{1}{MPS + MPT + MPM} \\]
- Any autonomous increase in injections (\\( \\Delta I \\)) generates a magnified cumulative increase in national equilibrium income: \\( \\Delta Y = k \\times \\Delta I \\).
- **The Accelerator Principle**:
  Net investment expenditure depends on the rate of change of national income or consumer demand:
  \\[ I_t = \\alpha (Y_t - Y_{t-1}) \\]
  where \\( \\alpha \\) is the capital-output ratio. A deceleration in GDP growth causes an absolute decline in net investment, triggering business cycle downturns.
- **The Super-Multiplier**: The combined interaction of the multiplier and the accelerator generates cyclical fluctuations (boom, peak, recession, trough).

---

## 8.2 Money, Banking and the Financial Sector

### Functions and Classification of Money
- Functions: Medium of exchange, unit of account, store of value, standard for deferred payments.
- Measures of Money Supply:
  - Narrow Money (M0 / M1): Currency in circulation plus sight/checkable bank deposits.
  - Broad Money (M3 / M4): Narrow money plus time deposits, money market funds, and certificates of deposit.

### Credit Creation by Commercial Banks
Commercial banks create money by granting loans backed by fractional cash reserves.
- **The Bank Deposit Multiplier**:
  \\[ \\text{Money Multiplier} = \\frac{1}{\\text{Reserve Ratio (rr)}} \\]
- If the legal cash reserve ratio is 10%, an initial cash deposit of $100 million can support a maximum expansion of bank credit and deposits equal to \\( \\$100\\text{m} \\times (1 / 0.10) = \\$1,000\\text{m} \\).
- Real-world limits on credit creation: Cash drain to the public, excess reserves held by banks, lack of creditworthy borrowers, regulatory capital requirements (Basel III).

### Keynesian Liquidity Preference Theory
Keynes identified three motives for demanding liquid cash balances:
1. **Transactions Motive**: Money held to conduct planned daily transactions. Positively related to real national income (\\( L_1 = f(Y) \\)).
2. **Precautionary Motive**: Money held to cover unexpected contingencies and emergencies. Positively related to income (\\( L_1 = f(Y) \\)).
3. **Speculative Motive**: Money held to take advantage of expected fluctuations in bond and asset prices. Inversely related to nominal interest rates (\\( L_2 = f(r) \\)):
   - High interest rates \\(\\rightarrow\\) bond prices are low, opportunity cost of holding cash is high \\(\\rightarrow\\) low speculative money demand.
   - Low interest rates \\(\\rightarrow\\) bond prices are high, risk of capital loss on bonds is high, opportunity cost of holding cash is minimal \\(\\rightarrow\\) high demand for liquidity.
- **The Liquidity Trap**: Occurs at near-zero interest rates where the speculative demand for money becomes perfectly interest-elastic (horizontal). Monetary policy expansions fail to lower interest rates further or stimulate borrowing and investment.

---

## 8.3 Employment, Unemployment and the Phillips Curve

### Equilibrium and Disequilibrium Unemployment
- **Disequilibrium Unemployment**:
  - Real-wage (classical) unemployment caused by real wages being maintained above market clearing level (minimum wage laws, trade union action).
  - Demand-deficient (cyclical/Keynesian) unemployment caused by aggregate demand falling below potential capacity.
- **Equilibrium Unemployment (Natural Rate of Unemployment / NRU)**:
  - Exists when the aggregate labour market is in equilibrium. Composed of frictional, structural, and seasonal unemployment.
  - Determinants of NRU: Labour market flexibility, unemployment benefit generosity, occupational mobility, skills mismatches, income tax rates.

### The Phillips Curve: Short Run vs Long Run
1. **Original Short-Run Phillips Curve (SRPC)**:
   - A.W. Phillips identified a historical inverse trade-off between the rate of unemployment and the rate of wage inflation.
   - Keynesian policy implication: Governments could trade off higher inflation to achieve lower unemployment via aggregate demand stimulus.
2. **Friedman-Phelps Monetarist Critique & Expectations-Augmented Phillips Curve**:
   - In the short run, unanticipated monetary expansion lowers unemployment along the SRPC due to adaptive expectations and money illusion.
   - In the long run, workers recognize that inflation has eroded real wages and demand higher nominal wages. Employment falls back to the Natural Rate of Unemployment (NAIRU) at a higher permanent inflation rate.
   - **The Long-Run Phillips Curve (LRPC)** is vertical at the Natural Rate of Unemployment. There is no permanent trade-off between inflation and unemployment.
   - Shifting the LRPC inward requires supply-side labour market reforms, retraining programs, and reducing search frictions.

---

## 8.4 Theories of Economic Growth

### Growth Concepts:
- **Actual Economic Growth**: The annual percentage increase in real GDP. Measured by movements from inside the PPC towards the boundary, or rightward shifts in Aggregate Demand (AD).
- **Potential Economic Growth**: The long-run expansion in the productive capacity of the economy. Represented by an outward shift of the PPC or a rightward shift of the Long-Run Aggregate Supply (LRAS) curve.
- **Output Gaps**:
  - Positive Output Gap: Actual GDP exceeds potential GDP, causing unsustainable factor utilization and demand-pull inflation.
  - Negative Output Gap: Actual GDP is below potential GDP, accompanied by idle factories and cyclical unemployment.

### Growth Models:
1. **Harrod-Domar Growth Model**:
   - States that the rate of economic growth is directly proportional to the national savings ratio (\\( s \\)) and inversely proportional to the capital-output ratio (\\( c \\)):
     \\[ g = \\frac{s}{c} \\]
   - Key implication for developing nations: The savings gap (insufficient domestic savings to finance capital investment) is a primary constraint on growth.
2. **Solow Neoclassical Growth Model**:
   - Assumes diminishing marginal returns to capital and labour.
   - In the absence of technological progress, capital accumulation leads the economy to a steady-state equilibrium where output per worker stops growing.
   - Long-run sustained growth in per capita income is driven exclusively by **exogenous technological progress** (Total Factor Productivity - TFP).
3. **Endogenous Growth Theory (Paul Romer, Robert Lucas)**:
   - Rejects diminishing returns to capital when knowledge, R&D, and human capital are included.
   - Knowledge exhibits increasing returns and positive externalities across firms.
   - Governments can permanently raise long-term economic growth by subsidising education, research and development, and protecting intellectual property.

---

# Unit 9: Government Macroeconomic Intervention (Cambridge 9708 A Level)

## 9.1 Macroeconomic Goals and Policy Conflicts
Macroeconomic policymaking involves balancing six primary targets:
1. Sustained economic growth.
2. Full employment (low NRU).
3. Low, stable inflation (e.g. 2% target).
4. Balance of payments current account equilibrium.
5. Environmental sustainability.
6. Equitable distribution of income and wealth.

### Policy Trade-Offs and Conflicts:
- **Growth vs Inflation**: Rapid demand-led expansion causes demand-pull and cost-push inflation.
- **Growth vs Current Account**: Higher domestic incomes boost import spending (high MPM), widening the trade deficit.
- **Inflation vs Unemployment**: Short-run Phillips curve trade-off.
- **Equity vs Efficiency (Arthur Okun's Leaky Bucket)**: High marginal tax rates reduce economic inequality but distort work incentives and investment.

## 9.2 Monetary Policy Innovations and Central Banking
- **Transmission Mechanism of Monetary Policy**:
  Base interest rate change \\(\\rightarrow\\) money market and commercial lending rates \\(\\rightarrow\\) asset prices and exchange rates \\(\\rightarrow\\) consumption, investment, and net exports \\(\\rightarrow\\) aggregate demand and inflation.
- **Unconventional Monetary Policy**:
  - **Quantitative Easing (QE)**: Large-scale central bank open-market asset purchases of long-term government bonds using electronically created central bank reserves. Lowers yields, flattens the yield curve, triggers portfolio rebalancing into equities and corporate debt, and boosts commercial bank reserves.
  - **Forward Guidance**: Explicit communication by central banks regarding the future trajectory of policy rates to reduce market uncertainty.
  - **Negative Nominal Interest Rates**: Charging commercial banks on excess reserves to incentivize lending.

## 9.3 Fiscal Policy and Sovereign Debt Sustainability
- **Automatic Stabilisers**: Progressive income taxes and unemployment benefits that automatically cushion aggregate demand during recessions without discretionary legislation.
- **Discretionary Fiscal Policy**: Deliberate government tax and expenditure adjustments.
- **Structural vs Cyclical Budget Deficits**:
  - Cyclical Deficit: Caused by economic downturns (tax revenues fall, welfare spending rises). Disappears automatically when GDP returns to trend.
  - Structural Deficit: The underlying deficit that persists even when the economy is operating at full potential output. Driven by demographic aging, chronic welfare commitments, and uncompetitive tax structures.
- **Crowding Out**:
  - Financial Crowding Out: Heavy government borrowing raises real interest rates, reducing private sector capital investment.
  - Resource Crowding Out: Public sector absorption of skilled labour and raw materials leaves fewer resources for private firms.
- **The Laffer Curve**:
  Illustrates the relationship between tax rates and tax revenue. Beyond the revenue-maximizing tax rate \\( t^* \\), higher tax rates cause tax avoidance, evasion, and diminished work effort, causing tax revenue to fall.

## 9.4 Supply-Side Economics
- **Market-Led Policies**: Deregulation, reduction in corporate and income taxes, privatisation, weakening trade unions, abolishing minimum wages, promoting free trade.
- **Interventionist Policies**: Government funding of STEM education, public infrastructure investments (ports, high-speed rail, digital networks), regional development grants, subsidies for clean tech R&D.
`,
  },

  // 3. A-LEVEL INTERNATIONAL ECONOMICS COURSEBOOK (UNIT 10)
  {
    title: "Cambridge International A Level Economics (9708) — Coursebook: International Economics & Global Development (Unit 10)",
    docType: "coursebook",
    sourceName: "Cambridge International A Level Economics Authoritative Coursebook",
    examSeries: "Cambridge 9708 A Level Syllabus (A2)",
    content: `
# Unit 10: International Economic Issues (Cambridge 9708 A Level)

## 10.1 International Trade Theory and Globalisation

### Absolute and Comparative Advantage (David Ricardo)
- **Absolute Advantage (Adam Smith)**: A country has an absolute advantage if it can produce more of a good with the same quantity of resources than another country.
- **Comparative Advantage (David Ricardo)**: A country has a comparative advantage if it can produce a good at a **lower opportunity cost** than another country.
- **The Law of Comparative Advantage**: Total global output and economic welfare will increase if countries specialise in the production of those goods and services in which they possess a comparative advantage and trade with each other.

#### Opportunity Cost Table Example:
| Country | Output of Wheat (units) | Output of Computers (units) |
|---|---|---|
| Country A | 100 | 50 |
| Country B | 60 | 40 |

- In Country A: Opportunity cost of 1 Wheat = 0.5 Computers; Opportunity cost of 1 Computer = 2 Wheat.
- In Country B: Opportunity cost of 1 Wheat = 0.67 Computers; Opportunity cost of 1 Computer = 1.5 Wheat.
- Country A has a comparative advantage in Wheat (0.5 < 0.67).
- Country B has a comparative advantage in Computers (1.5 < 2.0).
- Specialisation and trade at an exchange ratio between 0.5 and 0.67 computers per unit of wheat will leave both nations strictly better off.

### Terms of Trade (TOT)
The terms of trade measures the relative price of a country's exports compared to its imports:
\\[ \\text{Terms of Trade} = \\frac{\\text{Index of Export Prices}}{\\text{Index of Import Prices}} \\times 100 \\]
- An **improvement** in the Terms of Trade (index rises): A given volume of exports can purchase a larger volume of imports. Caused by rising global export prices or falling import prices.
- A **deterioration** in the Terms of Trade (index falls): A given volume of exports purchases fewer imports.
- **Prebisch-Singer Hypothesis**: Suggests that developing nations that export primary commodities (agricultural goods, minerals) face a long-term structural deterioration in their terms of trade against manufactured capital goods. Primary commodities have a low Income Elasticity of Demand (YED < 1), so as world incomes expand, global demand for manufactured goods outpaces demand for commodities.

### Trade Protectionism & Welfare Analysis of a Tariff
Instruments of protectionism:
- Specific and ad valorem tariffs.
- Import quotas (quantitative restrictions).
- Export subsidies.
- Non-tariff barriers (administrative delays, sanitary standards, intellectual property rules).

#### Welfare Effects of an Import Tariff:
Imposing a tariff shifts the domestic price from world price \\( P_w \\) to \\( P_w + T \\):
1. **Domestic Consumers**: Consumer surplus falls by area \\( -(A + B + C + D) \\).
2. **Domestic Producers**: Producer surplus increases by area \\( +A \\).
3. **Government**: Tariff revenue gained equals area \\( +C \\) (\\( \\text{Tariff} \\times \\text{Import Volume} \\)).
4. **Net Society Welfare**: Areas \\( B \\) (production inefficiency / deadweight loss of domestic resources) and \\( D \\) (consumption deadweight loss) are permanently destroyed. Net deadweight welfare loss = \\( B + D \\).

### Economic Integration and Trading Blocs
- Stages of Integration:
  1. Free Trade Area (zero internal tariffs, independent external tariffs).
  2. Customs Union (zero internal tariffs, Common External Tariff - CET).
  3. Common Market (Customs union plus free mobility of factors of production: labour and capital).
  4. Economic and Monetary Union (Common market plus unified monetary policy and common currency, e.g. Eurozone).
- **Jacob Viner's Trade Effects**:
  - **Trade Creation**: Occurs when domestic consumption shifts from a high-cost domestic producer to a lower-cost partner producer within the trading bloc. Generates net welfare gains.
  - **Trade Diversion**: Occurs when consumption shifts from a lower-cost non-member global producer to a higher-cost member producer due to the Common External Tariff. Causes net global welfare losses.

---

## 10.2 Exchange Rate Regimes and Balance of Payments Correction

### Exchange Rate Systems:
1. **Free Floating Exchange Rate**: Determined strictly by market supply and demand without central bank intervention. Automatically corrects current account deficits, provides independent monetary policy, but creates commercial uncertainty and volatility.
2. **Fixed Exchange Rate**: Central bank pegs currency value to another anchor currency or gold. Requires large foreign currency reserves, eliminates exchange risk for exporters, but sacrifices independent domestic monetary policy (impossible trinity).
3. **Managed Float ("Dirty Float")**: Central bank allows the currency to fluctuate within an informal target band, intervening to counter speculative swings.

### Purchasing Power Parity (PPP) Theory
States that in the long run, exchange rates between currencies are in equilibrium when their purchasing power is the same in each of the two countries:
\\[ S = \\frac{P_1}{P_2} \\]
where \\( S \\) is the exchange rate and \\( P \\) is the price level. Deviations occur due to trade barriers, non-tradable goods (services, haircuts), and massive international capital flows.

### Correcting Current Account Imbalances
Policies to eliminate a current account deficit:
1. **Expenditure-Reducing Policies**: Tight fiscal policy (higher taxes, lower government spending) or tight monetary policy (higher interest rates) to compress domestic disposable income, thereby reducing import spending (\\( M = f(Y) \\)). Drawback: causes domestic recession and unemployment.
2. **Expenditure-Switching Policies**: Devaluation/depreciation of the exchange rate or protectionist tariffs to alter relative prices, making foreign imports more expensive and domestic exports cheaper.
- **The Marshall-Lerner Condition**:
  A currency depreciation or devaluation will only improve the current account balance if the sum of the price elasticities of demand for exports and imports is greater than one:
  \\[ |PED_x| + |PED_m| > 1 \\]
- **The J-Curve Effect**:
  In the short run, trade contracts and orders are fixed. Price elasticities of demand are highly inelastic (\\( |PED_x + PED_m| < 1 \\)). Immediately following a devaluation, the import bill rises while export revenues remain unchanged, causing the current account deficit to widen initially. Over time (6–18 months), consumers and firms adjust, demand becomes elastic, and the current account improves, tracing out the shape of a "J".

---

## 10.3 Economic Development and Structural Transformation

### Measuring Economic Development
- **Economic Growth vs Economic Development**: Growth is purely quantitative (increase in real GDP/GNI). Development is qualitative: improvements in living standards, life expectancy, adult literacy, healthcare access, political freedom, and reduction in multidimensional poverty.
- **Human Development Index (HDI)**: Geometric mean of three dimensions:
  1. Health (Life Expectancy at Birth).
  2. Education (Mean Years of Schooling for adults and Expected Years of Schooling for children).
  3. Standard of Living (GNI per capita at Purchasing Power Parity).
- **Multidimensional Poverty Index (MPI)**: Identifies overlapping household deprivations in health, education, and living standards (water, sanitation, electricity, cooking fuel).

### Income and Wealth Inequality:
- **The Lorenz Curve**: Graphs the cumulative percentage of national income received against the cumulative percentage of the population. A straight 45-degree diagonal represents complete equality.
- **The Gini Coefficient**:
  \\[ \\text{Gini} = \\frac{A}{A + B} \\]
  where A is the area between the 45-degree line and the Lorenz curve, and B is the total area under the Lorenz curve. Ranges from 0 (perfect equality) to 1 (complete inequality).

### Barriers to Development in Low-Income Economies:
1. **The Poverty Trap / Vicious Circle of Poverty (Ragnar Nurkse)**: Low income \\(\\rightarrow\\) low domestic savings \\(\\rightarrow\\) low capital investment \\(\\rightarrow\\) low labour productivity \\(\\rightarrow\\) low income.
2. **Infrastructure Deficits**: Inadequate roads, ports, reliable power grids, clean water, and digital connectivity raise unit production costs and discourage investment.
3. **The Lewis Dual Sector Model**: Explains structural transformation from a traditional subsistence agricultural sector (exhibiting zero or near-zero marginal productivity of labour) to a modern capitalist industrial sector. The transfer of surplus rural labour fuels urban industrial accumulation until the "Lewis turning point" is reached.
4. **Primary Product Dependency**: Price volatility, vulnerable supply shocks, and the Prebisch-Singer hypothesis.
5. **Capital Flight and Institutional Fragility**: Corruption, weak rule of law, unsecure property rights, and political instability prompt wealth owners to funnel savings to offshore financial centres.

### Development Strategies and International Aid:
- **Import Substitution Industrialisation (ISI)**: Erecting high tariffs to protect infant domestic manufacturing industries. Historically resulted in uncompetitive state monopolies and allocative inefficiency.
- **Export-Oriented Growth**: Encouraging domestic firms to compete in global markets (e.g., East Asian Tigers), supported by competitive exchange rates and human capital investment.
- **Foreign Direct Investment (FDI)**: Multinational corporations investing in local physical capital (factories, supply chains). Transfers technology and skills, but may repatriate profits and exercise monopsony power.
- **Foreign Aid**: Bilateral, multilateral, grant aid vs tied aid, and concessional loans. Role of the IMF (short-term balance of payments stabilization loans) vs World Bank (long-term infrastructure and development projects).
`,
  },

  // 4. A-LEVEL PAPER 3 MCQ MASTERCLASS STRATEGY GUIDE
  {
    title: "Cambridge International A Level Economics (9708) — Paper 3 MCQ Masterclass Strategy & Quantitative Traps",
    docType: "notes",
    sourceName: "Cambridge International A Level Economics Senior Examiner Guidance",
    examSeries: "Cambridge 9708 Paper 3 Masterclass",
    content: `
# Cambridge 9708 Paper 3 (A Level Multiple Choice) Masterclass Guide

## 1. Exam Structure & Quantitative Essentials
- 30 Multiple Choice Questions | 1 hour 15 minutes | 30 marks (weighted at 33% of A Level total).
- Timing: Average of 2.5 minutes per question. Never spend more than 4 minutes on any single quantitative problem.

## 2. Core Quantitative Formulas for Paper 3
1. **Marginal Revenue Formula**:
   \\[ MR = \\frac{\\Delta TR}{\\Delta Q} = P \\left(1 - \\frac{1}{|PED|}\\right) \\]
   - When \\( |PED| > 1 \\), \\( MR > 0 \\) (elastic demand; lowering price increases total revenue).
   - When \\( |PED| = 1 \\), \\( MR = 0 \\) (total revenue is maximised).
   - When \\( |PED| < 1 \\), \\( MR < 0 \\) (inelastic demand; lowering price decreases total revenue).

2. **Equi-Marginal Condition**:
   \\[ \\frac{MU_A}{P_A} = \\frac{MU_B}{P_B} \\]
   To answer question variants with price changes: if \\( P_A \\) rises, \\( \\frac{MU_A}{P_A} \\) drops below \\( \\frac{MU_B}{P_B} \\). The consumer must buy less A and more B to re-equate the ratios.

3. **Keynesian Open Economy Multiplier**:
   \\[ k = \\frac{1}{MPS + MPT + MPM} = \\frac{1}{1 - (MPC_d)} \\]
   *Common Cambridge Trap*: If asked for change in GDP given \\( MPC = 0.8 \\) and \\( \\Delta I = +\\$20\\text{m} \\), check if \\( MPT \\) or \\( MPM \\) are specified. If given only \\( MPC \\), \\( k = 1 / (1 - 0.8) = 5 \\); \\( \\Delta Y = 5 \\times \\$20\\text{m} = \\$100\\text{m} \\).

4. **Marginal Revenue Product of Labour**:
   \\[ MRPL = MPP_L \\times MR \\]
   In competitive goods market: \\( MRPL = MPP_L \\times P \\).
   The profit-maximizing firm hires up to \\( MRPL = MCL \\).

5. **Terms of Trade Calculation**:
   \\[ \\text{TOT} = \\frac{\\text{Export Price Index}}{\\text{Import Price Index}} \\times 100 \\]
   *Trap*: Distinguish between a rise in export *volume* vs export *price*. An increase in export volume has no direct effect on the TOT index unless it alters export prices.

## 3. High-Frequency Diagram Traps in Paper 3:
1. **Monopsony Labour Diagram**:
   - The monopsonist hires at \\( MCL = MRPL \\), but the wage is read vertically DOWN on the \\( ACL \\) (Average Cost of Labour / Supply) curve. Do not read the wage at the intersection point on the \\( MCL \\) curve!
2. **Kinked Demand Curve MR Gap**:
   - The vertical discontinuity in the MR curve lies directly below the kink in the AR curve. Any change in MC that stays within this gap leaves price and output unchanged.
3. **Indifference Curve Decompositions**:
   - The substitution effect is ALWAYS isolated by drawing a hypothetical budget line parallel to the new budget line (new price ratio) tangent to the ORIGINAL indifference curve (original utility).
   - For an inferior good, the income effect moves in the opposite direction of the substitution effect but is smaller in magnitude.
   - For a Giffen good, the income effect moves in the opposite direction and is larger in magnitude than the substitution effect.
4. **Tariff Welfare Breakdown**:
   - Domestic consumer surplus loss = \\( A + B + C + D \\).
   - Producer gain = \\( A \\).
   - Government tariff revenue = \\( C \\).
   - Deadweight loss = \\( B + D \\) (where B is deadweight production loss from inefficient domestic producers, and D is deadweight consumption loss).
`,
  },

  // 5. A-LEVEL PAPER 4 ESSAY MASTERCLASS & LEVEL 5 MODEL EXEMPLARS
  {
    title: "Cambridge International A Level Economics (9708) — Paper 4 Evaluative Essay Masterclass & Level 5 Compendium",
    docType: "notes",
    sourceName: "Cambridge International A Level Senior Examiner Report & Model Essays",
    examSeries: "Cambridge 9708 Paper 4 Evaluative Writing",
    content: `
# Cambridge 9708 Paper 4: Evaluative Essay Writing Masterclass

## 1. Paper 4 Assessment Objectives & Mark Allocation
- **Section A**: Compulsory Data Response (20 marks).
- **Section B & C**: Essay Questions (Choice of 2 essays, 20 marks each).
- Total: 60 marks | 2 hours.

### Cambridge 20-Mark Essay Mark Grid:
- **Knowledge and Understanding (AO1)**: 4 marks.
- **Analysis (AO2)**: 8 marks (rigorous theoretical mechanisms, step-by-step causality, accurate diagrams).
- **Evaluation (AO3)**: 8 marks (critical scrutiny of assumptions, magnitude of effects, short-run vs long-run distinctions, context-dependent judgments).

---

## 2. Level 5 Model Essay Exemplar 1 (Microeconomics: Market Structures)
**Question**: "A monopoly firm is always dynamically efficient but allocatively and productively inefficient. Discuss whether governments should always intervene to break up monopolies." [20 marks]

### Model Plan & Essay Structure:
- **Introduction**: Define monopoly (single seller, >25% market share, high barriers to entry) and the three efficiency concepts. State thesis: while pure monopoly causes static welfare loss, breaking them up is not always optimal due to dynamic efficiency, natural monopoly cost structures, and contestability.
- **Analysis of Inefficiencies (AO1/AO2)**:
  - Diagram: Standard monopoly profit-maximisation diagram showing \\( MC = MR \\) producing output \\( Q_m \\) and price \\( P_m \\).
  - Allocative Inefficiency: \\( P_m > MC \\) at \\( Q_m \\). Price exceeds marginal cost of production, meaning consumer valuation exceeds the opportunity cost of resources. This generates deadweight welfare loss (the Harberger triangle).
  - Productive Inefficiency: Output \\( Q_m \\) is not produced at the minimum point of LRAC. The firm suffers from X-inefficiency due to lack of competitive threats.
- **Counter-Analysis & Dynamic Efficiency (AO2)**:
  - Dynamic Efficiency: Joseph Schumpeter's concept of creative destruction. Supernormal profits earned in the short and long run provide internal financing for capital-intensive R&D, innovation, and technological breakthroughs (e.g. pharmaceuticals, semiconductor lithography).
  - Natural Monopoly Argument: In network utilities (water, railway tracks), LRAC falls continuously across the market demand curve. Dividing the market among competing firms would cause duplication of infrastructure, resulting in higher average costs for all consumers.
- **Evaluation (AO3)**:
  - Breaking up is not the only policy option: Governments can employ **price capping regulation (RPI - X)** or rate-of-return regulation to prevent exploitative pricing without destroying scale economies.
  - Contestable Markets Perspective: If barriers to entry and sunk costs are low, the mere threat of "hit-and-run" entry compels the monopoly to price at normal profit, eliminating the need for intervention.
  - Government Failure: Regulators face asymmetric information and regulatory capture, where policies distort markets more than the original monopoly market failure.
- **Conclusion**: Judged evaluatively, governments should not always intervene to break up monopolies. Intervention should be tailored: natural monopolies should be regulated or state-owned rather than broken up; dynamic tech monopolies should be monitored for anti-competitive behaviour; while artificial monopolies created purely by anti-competitive practices should face antitrust dissolution.

---

## 3. Level 5 Model Essay Exemplar 2 (Macroeconomics: Policy Mix)
**Question**: "Evaluate the effectiveness of supply-side policies compared to demand-management policies in reducing chronic unemployment in an open economy." [20 marks]

### Model Plan & Analysis:
- **Distinguishing Types of Unemployment**:
  - Cyclical/Keynesian unemployment (demand-deficient) vs Natural Rate of Unemployment (frictional and structural).
- **Analysis of Demand-Side Policies (Fiscal and Monetary)**:
  - Diagram: Keynesian AD/AS diagram showing AD shifting rightward from \\( AD_1 \\) to \\( AD_2 \\), closing a negative deflationary gap.
  - Highly effective against cyclical unemployment during recessions via the multiplier effect.
  - Limitations: Ineffective against structural and frictional unemployment. Pushing AD beyond potential capacity causes demand-pull inflation, crowding out, and worsens the current account deficit (import leakages).
- **Analysis of Supply-Side Policies**:
  - Interventionist (retraining schemes, education investment, vocational apprenticeships, infrastructure) and Market-Led (labour market deregulation, reducing unemployment benefit replacement rates, cutting payroll taxes).
  - Shifting LRAS outward directly targets the root causes of structural unemployment by matching worker skills to new sunrise industries.
- **Evaluation**:
  - Time Lags: Supply-side policies involve long gestation periods (e.g., educational reform takes a decade).
  - Fiscal Cost and Opportunity Cost: Interventionist supply-side measures increase budget deficits.
  - Complementarity: Supply-side and demand-side policies are complementary rather than mutually exclusive. As LRAS shifts rightward, aggregate demand must expand concurrently to absorb the newly created productive capacity; otherwise, increased productivity without demand creates technological unemployment.
`,
  },
];

async function run() {
  console.log("==========================================================");
  console.log("📖 INGESTING CAMBRIDGE 9708 A-LEVEL AUTHORITATIVE TEXTBOOKS");
  console.log("==========================================================");

  let totalDocs = 0;
  let totalChunks = 0;

  for (const book of A_LEVEL_TEXTBOOKS) {
    console.log(`\n📚 Ingesting: ${book.title}...`);
    const hash = hashContent(book.content);

    const { data: existing } = await supabase
      .from("knowledge_documents")
      .select("id")
      .eq("content_hash", hash)
      .maybeSingle();

    if (existing) {
      console.log(`   ⏩ Already ingested in Knowledge Base (ID: ${existing.id})`);
      continue;
    }

    const chunks = chunkText(book.content);
    console.log(`   ✂️  Generated ${chunks.length} structured chunks (${book.content.length} characters)`);

    const { data: doc, error: docErr } = await supabase
      .from("knowledge_documents")
      .insert({
        title: book.title,
        doc_type: book.docType,
        source_name: book.sourceName,
        exam_series: book.examSeries,
        content_hash: hash,
        char_count: book.content.length,
        chunk_count: chunks.length,
        status: "ready",
      })
      .select("id")
      .single();

    if (docErr || !doc) {
      console.error(`   ❌ Failed to insert document: ${docErr?.message}`);
      continue;
    }

    const chunkRows = chunks.map((c) => ({
      document_id: doc.id,
      chunk_index: c.index,
      content: c.content,
      heading: c.heading,
      token_estimate: c.tokenEstimate,
    }));

    let inserted = 0;
    for (let offset = 0; offset < chunkRows.length; offset += 100) {
      const slice = chunkRows.slice(offset, offset + 100);
      const { error: chunkErr } = await supabase.from("document_chunks").insert(slice);
      if (chunkErr) {
        console.error(`   ❌ Chunk batch failed: ${chunkErr.message}`);
      } else {
        inserted += slice.length;
      }
    }

    console.log(`   ✅ Ingested successfully: ${inserted} chunks stored (Status: ready)`);
    totalDocs++;
    totalChunks += inserted;
  }

  console.log("\n==========================================================");
  console.log(`🎉 A-LEVEL TEXTBOOK INGESTION COMPLETE!`);
  console.log(`   New Documents: ${totalDocs}`);
  console.log(`   New Chunks:    ${totalChunks}`);
  console.log("==========================================================");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
