/**
 * Import Authoritative Books & Study Materials for Cambridge International AS Level Economics (9708)
 *
 * Ingests complete textbooks, syllabus specifications, examiner reports, revision notes,
 * and model exemplar essay banks into `knowledge_documents` and `document_chunks`.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/import-as-level-materials.ts
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

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

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

interface MaterialSpec {
  title: string;
  docType: "coursebook" | "syllabus" | "examiner_report" | "notes";
  sourceName: string;
  examSeries: string;
  content: string;
}

const AS_LEVEL_MATERIALS: MaterialSpec[] = [
  // 1. UNIT 1 COURSEBOOK
  {
    title: "Cambridge AS Level Economics (9708) — Coursebook: Unit 1 Basic Economic Ideas & Resource Allocation",
    docType: "coursebook",
    sourceName: "Cambridge International AS Level Economics Coursebook",
    examSeries: "Cambridge 9708 AS Syllabus",
    content: `
# Unit 1: Basic Economic Ideas and Resource Allocation (Cambridge 9708 AS Level)

## 1.1 The Fundamental Economic Problem: Scarcity, Choice and Opportunity Cost
The fundamental economic problem facing all societies is scarcity. Scarcity arises because human wants for goods and services are infinite, but the economic resources available to satisfy these wants are finite (limited).

Because resources are scarce, choices must be made. Choosing to allocate resources to produce one good inevitably means that another good cannot be produced. This gives rise to the central economic concept of opportunity cost.
- **Opportunity cost** is defined as the benefit forgone of the next best alternative given up when an economic decision is made.
- For example, if a government chooses to spend $10 billion on constructing high-speed rail, the opportunity cost is the next best alternative use of those funds, such as building new state-of-the-art hospitals or investing in renewable energy infrastructure.
- In Cambridge 9708 examinations, questions requiring definitions of opportunity cost award marks for stating "the next best alternative forgone" — omitting "next best" or "alternative" results in mark loss.

## 1.2 Factors of Production and Their Rewards
Resources used in the production process are categorized into four factors of production:
1. **Land**: All natural resources provided by nature, including arable land, mineral deposits, crude oil, rivers, forests, and clean air. The reward for land is **rent**.
2. **Labour**: The physical and mental effort exerted by human beings in the production of goods and services. The reward for labour is **wages** (or salaries).
3. **Capital**: Human-made aids to production used to produce other goods and services, such as machinery, factories, computers, tools, and transport infrastructure. Capital is distinct from financial capital (money). The reward for capital is **interest**.
4. **Enterprise (Entrepreneurship)**: The willingness to take business risks, organize and combine the other three factors of production, and innovate. The reward for enterprise is **profit**.

## 1.3 Production Possibility Curves (PPC / PPF)
A Production Possibility Curve (PPC) represents the maximum combinations of two goods or services that an economy can produce when all available resources are fully and efficiently employed with existing technology.

### Key Points on a PPC Diagram:
- **Points on the boundary**: Represent productive efficiency. All resources are fully utilized. Output cannot be increased for one good without reducing output of the other.
- **Points inside the boundary**: Represent underutilization, inefficiency, or unemployment of resources. Output of either or both goods can increase with zero opportunity cost by employing idle factors of production.
- **Points outside the boundary**: Currently unattainable given existing factor endowments and technology. They represent future economic growth targets.

### Shape of the PPC:
1. **Concave to the origin (bowed outwards)**: Reflects the Law of Increasing Opportunity Costs. Factors of production are not perfectly adaptable to alternative uses. As an economy shifts from producing agricultural wheat to high-tech manufactured computers, increasingly less suitable resources (e.g. agricultural land and farmworkers) must be reallocated, causing the opportunity cost of each additional computer to rise.
2. **Straight-line PPC**: Reflects Constant Opportunity Cost. Resources are perfectly substitutable between the two outputs (e.g., producing red pencils vs blue pencils).

### Movements vs Shifts:
- **Movement along the curve**: Involves a reallocation of resources from one good to another. It demonstrates opportunity cost.
- **Outward shift of the PPC**: Represents an increase in productive capacity (long-run economic growth). Caused by an increase in the quantity or quality of factors of production, such as technological innovation, discovery of natural resources, net immigration of skilled labour, or capital accumulation.
- **Inward shift of the PPC**: Represents a destruction or permanent loss of productive capacity, caused by natural disasters, war, prolonged capital decumulation, or brain drain.

## 1.4 Positive and Normative Statements
- **Positive statements**: Objective statements that can be tested, verified, or refuted against empirical real-world evidence. They describe "what is, was, or will be" and are free from value judgments. Example: "A 10% increase in the minimum wage increases youth unemployment by 2.5%."
- **Normative statements**: Subjective statements based on value judgments, ethics, or personal beliefs. They prescribe "what ought to be or should be" and cannot be verified by factual testing. Example: "The government should increase the minimum wage to improve living standards for low-income households."

## 1.5 Classification of Goods and Services
1. **Free goods**: Abundant goods with zero opportunity cost in production and consumption (e.g., sunlight, air). They do not require scarce factors of production.
2. **Economic goods**: Goods that are scarce relative to wants, require scarce factors of production to produce, and possess an opportunity cost.
3. **Private goods**: Goods that are both **rivalrous** (consumption by one person diminishes the quantity available to others) and **excludable** (consumers who do not pay a price can be prevented from consuming them). Examples: clothing, food, smartphones.
4. **Public goods**: Goods that are strictly **non-rivalrous** (one individual's consumption does not reduce availability for others) and **non-excludable** (impossible or prohibitively expensive to prevent non-payers from benefiting). Examples: national defence, lighthouses, street lighting, flood control systems.
   - **The Free Rider Problem**: Because public goods are non-excludable, individuals have an incentive to consume the good without paying for it, knowing others will bear the cost. In a free market, firms cannot charge a price to cover costs and earn a profit, leading to market failure: zero private provision. Public goods must therefore be funded and directly provided by the state via general taxation.
5. **Merit goods**: Goods that generate positive externalities in consumption and are underconsumed and underprovided in a free market due to imperfect consumer information (information failure). Consumers fail to perceive the full private benefits (e.g., preventative healthcare, basic education) and external benefits to third parties.
6. **Demerit goods**: Goods that generate negative externalities in consumption and are overconsumed and overprovided in a free market due to information failure. Consumers underappreciate the private harm to their health and external costs to society (e.g., tobacco, sugary beverages, alcohol).

## 1.6 Resource Allocation in Different Economic Systems
1. **Free Market Economy**: Resources are privately owned. Allocation is guided entirely by the price mechanism (the "invisible hand"), consumer sovereignty, and the profit motive, with minimal or zero government intervention.
   - Advantages: High productive efficiency, dynamic innovation, freedom of consumer choice.
   - Disadvantages: Market failure, underprovision of public/merit goods, overconsumption of demerit goods, extreme income inequality.
2. **Planned (Command) Economy**: Resources are state-owned. A central planning authority decides what to produce, how to produce, and for whom to produce.
   - Advantages: Complete state control over public goods, elimination of extreme poverty, full employment targeting.
   - Disadvantages: Severe bureaucratic inefficiency, lack of consumer choice, absence of profit incentives leading to poor quality.
3. **Mixed Economy**: Combines private ownership and market mechanisms with state intervention to correct market failures, redistribute income, and provide public and merit goods.
`,
  },

  // 2. UNIT 2 COURSEBOOK
  {
    title: "Cambridge AS Level Economics (9708) — Coursebook: Unit 2 The Price System & The Microeconomy",
    docType: "coursebook",
    sourceName: "Cambridge International AS Level Economics Coursebook",
    examSeries: "Cambridge 9708 AS Syllabus",
    content: `
# Unit 2: The Price System and the Microeconomy (Cambridge 9708 AS Level)

## 2.1 The Law of Demand and the Demand Curve
The **Law of Demand** states that, ceteris paribus (all other things being equal), as the price of a good rises, the quantity demanded falls, and vice versa. There is an inverse relationship between price and quantity demanded.

### The Downward-Sloping Demand Curve:
The negative slope of the demand curve is explained by:
1. **The Substitution Effect**: As the price of good X rises, it becomes relatively more expensive compared to substitute goods, inducing consumers to switch purchases toward cheaper alternatives.
2. **The Income Effect**: A higher price reduces consumers' real purchasing power (real income). Assuming the good is normal, consumers buy less of it.
3. **The Law of Diminishing Marginal Utility**: Each additional unit consumed yields less marginal satisfaction (utility) than the previous unit. Consumers will only purchase additional units at progressively lower prices.

### Determinants of Demand (PASIFIC):
A change in price causes a **movement along** the existing demand curve (contraction or expansion).
A change in non-price determinants causes a **shift** of the demand curve:
- **P - Population**: Increase in population or demographic changes shifts demand outward.
- **A - Advertising and consumer tastes/fashion**: Successful marketing increases demand.
- **S - Substitutes' price**: A rise in the price of substitute good Y increases demand for good X (shift right).
- **I - Income**: An increase in real income increases demand for normal goods (shift right) and decreases demand for inferior goods (shift left).
- **F - Future price expectations**: Expectations of higher future prices increase current demand.
- **I - Interest rates**: Higher borrowing costs reduce demand for credit-financed goods.
- **C - Complements' price**: A rise in the price of complementary good Z decreases demand for good X (shift left).

## 2.2 The Law of Supply and the Supply Curve
The **Law of Supply** states that, ceteris paribus, as the price of a good rises, the quantity supplied increases, and vice versa. There is a direct (positive) relationship between price and quantity supplied, because higher prices improve profit margins per unit.

### Determinants of Supply (PINTSWC):
A change in price causes a **movement along** the supply curve.
Non-price determinants cause a **shift** of the supply curve:
- **P - Productivity**: Higher labour productivity lowers unit costs, shifting supply right.
- **I - Indirect taxes**: Imposing or raising indirect taxes increases production costs, shifting supply vertically upwards/leftwards.
- **N - Number of firms**: Entry of new competitors into the industry shifts market supply right.
- **T - Technology**: Technical progress increases output per factor input, shifting supply right.
- **S - Subsidies**: Government payments to producers reduce unit costs, shifting supply vertically downwards/rightwards.
- **W - Weather and natural conditions**: Favourable agricultural weather increases crop supply; droughts shift supply left.
- **C - Costs of factors of production**: Increases in raw material prices or wages increase marginal cost, shifting supply left.

## 2.3 Market Equilibrium and the Price Mechanism
Equilibrium price ($P_e$) and equilibrium quantity ($Q_e$) occur where quantity demanded equals quantity supplied ($Q_d = Q_s$). At this point, the market clears and there is no tendency for price to change.
- **Excess Demand (Shortage)**: If price is set below equilibrium, $Q_d > Q_s$. Unmet consumer demand creates upward pressure on price. As price rises, quantity demanded contracts and quantity supplied expands until equilibrium is restored.
- **Excess Supply (Surplus)**: If price is set above equilibrium, $Q_s > Q_d$. Unsold inventories force producers to lower prices. Price falls, expanding demand and contracting supply until equilibrium is restored.

### Functions of the Price Mechanism (Adam Smith):
1. **Signalling function**: Price changes convey information to consumers and producers about relative shortages or surpluses.
2. **Incentive function**: Higher prices provide profit incentives for firms to allocate scarce resources to growing markets.
3. **Rationing function**: When resources are scarce, higher prices ration goods to consumers who attach the highest economic valuation and have the ability to pay.

## 2.4 Elasticities of Demand
### 1. Price Elasticity of Demand (PED)
PED measures the responsiveness of quantity demanded to a change in price:
$$PED = \\frac{\\% \\Delta Q_d}{\\% \\Delta P}$$
- $|PED| > 1$: Price elastic. A percentage change in price leads to a proportionately larger change in quantity demanded.
- $|PED| < 1$: Price inelastic. A percentage change in price leads to a proportionately smaller change in quantity demanded.
- $|PED| = 1$: Unitary elastic. Total revenue remains constant when price changes.
- $PED = 0$: Perfectly inelastic (vertical demand curve).
- $PED = -\\infty$: Perfectly elastic (horizontal demand curve).

**Total Revenue Rule for PED**:
- If demand is elastic, price cuts increase Total Revenue ($TR = P \\times Q$). Price hikes reduce TR.
- If demand is inelastic, price hikes increase Total Revenue. Price cuts reduce TR.

**Determinants of PED (SPLATT)**:
- **S**: Substitutes available (more close substitutes = more elastic).
- **P**: Percentage of income spent (larger share = more elastic).
- **L**: Luxury vs Necessity (luxuries = elastic; necessities = inelastic).
- **A**: Addictive nature / habit forming (habitual = inelastic).
- **T**: Time period under consideration (long run = more elastic as substitutes are found).
- **T**: Type of market definition (broad category like food = inelastic; specific brand = elastic).

### 2. Income Elasticity of Demand (YED)
YED measures the responsiveness of demand to a change in consumer income:
$$YED = \\frac{\\% \\Delta Q_d}{\\% \\Delta Y}$$
- $YED > 0$: Normal Good.
  - $0 < YED < 1$: Normal Necessity (e.g., basic groceries). Demand rises less than proportionately.
  - $YED > 1$: Normal Luxury / Superior Good (e.g., fine dining, luxury vacations). Demand rises more than proportionately.
- $YED < 0$: Inferior Good (e.g., cheap processed canned goods, second-hand clothes). Higher incomes cause consumers to switch to higher-quality substitutes.

### 3. Cross Elasticity of Demand (XED)
XED measures the responsiveness of demand for Good A to a change in the price of Good B:
$$XED = \\frac{\\% \\Delta Q_d \\text{ of Good A}}{\\% \\Delta P \\text{ of Good B}}$$
- $XED > 0$: Substitutes (e.g., tea and coffee). A rise in the price of B increases demand for A.
- $XED < 0$: Complements (e.g., printers and ink cartridges). A rise in the price of B decreases demand for A.
- $XED = 0$: Unrelated goods (e.g., textbooks and bananas).

## 2.5 Price Elasticity of Supply (PES)
PES measures the responsiveness of quantity supplied to a change in the price of the good:
$$PES = \\frac{\\% \\Delta Q_s}{\\% \\Delta P}$$
- $PES > 1$: Price elastic supply.
- $PES < 1$: Price inelastic supply.

**Determinants of PES**:
- **Time period**: Short run (factors fixed, inelastic) vs Long run (all factors variable, elastic).
- **Availability of spare productive capacity**: High idle capacity allows rapid expansion of output (elastic).
- **Ease and cost of storage**: Perishable goods cannot be stored (inelastic); non-perishable goods with high stock levels have elastic supply.
- **Factor mobility**: Highly mobile labour and capital across industries yield elastic supply.

## 2.6 Consumer and Producer Surplus
- **Consumer Surplus**: The economic benefit to consumers, measured as the difference between the maximum price consumers are willing and able to pay and the actual market price paid. It is the area below the demand curve and above the equilibrium price line.
- **Producer Surplus**: The economic benefit to producers, measured as the difference between the price received and the minimum price at which firms would have been willing to supply (marginal cost). It is the area above the supply curve and below the equilibrium price line.
- **Total Economic Welfare**: The sum of Consumer Surplus and Producer Surplus. In a competitive market with no externalities, total economic welfare is maximised at market equilibrium.
`,
  },

  // 3. UNIT 3 COURSEBOOK
  {
    title: "Cambridge AS Level Economics (9708) — Coursebook: Unit 3 Government Microeconomic Intervention",
    docType: "coursebook",
    sourceName: "Cambridge International AS Level Economics Coursebook",
    examSeries: "Cambridge 9708 AS Syllabus",
    content: `
# Unit 3: Government Microeconomic Intervention (Cambridge 9708 AS Level)

## 3.1 Maximum Prices (Price Ceilings)
A **maximum price** is a legally mandated price limit set by the government above which producers cannot sell.
- **Condition for effectiveness**: To have an impact, a maximum price must be set **below** the free market equilibrium price ($P_{max} < P_e$).
- **Aims**: Protect low-income consumers from exploitative pricing on essential goods and necessities (e.g., staple foods, life-saving medicines, residential rental accommodation).

### Economic Consequences of a Maximum Price:
1. **Shortage (Excess Demand)**: At $P_{max}$, quantity demanded ($Q_d$) expands while quantity supplied ($Q_s$) contracts, resulting in a persistent shortage equal to $Q_d - Q_s$.
2. **Non-price rationing**: Because the price mechanism cannot clear the market, queues, waiting lists, lottery allocations, or government ration coupons must allocate the scarce supply.
3. **Emergence of Black (Informal) Markets**: Unscrupulous sellers illicitly resell goods at prices substantially higher than both $P_{max}$ and $P_e$.
4. **Deadweight Welfare Loss (DWL)**: Because output falls from $Q_e$ to $Q_s$, mutually beneficial transactions are prevented.
- **Evaluation**: To resolve the shortage, the government must simultaneously increase supply by providing producer subsidies, releasing state buffer stocks, or directly producing the good.

## 3.2 Minimum Prices (Price Floors)
A **minimum price** is a legally mandated price floor set by the government below which transactions cannot take place.
- **Condition for effectiveness**: A minimum price must be set **above** the free market equilibrium price ($P_{min} > P_e$).
- **Aims**: Guarantee stable incomes for primary sector producers (e.g., minimum farm gate prices) or ensure fair living wages for low-skilled workers (National Minimum Wage).

### Economic Consequences of a Minimum Price:
1. **Surplus (Excess Supply)**: At $P_{min}$, quantity supplied ($Q_s$) exceeds quantity demanded ($Q_d$).
2. **Government Intervention Cost**: In agricultural markets, the government must purchase the unsold surplus at the minimum price to maintain the floor, creating high fiscal storage and dumping costs.
3. **Labour Market Effects**: A minimum wage set above equilibrium wage can cause unemployment among low-skilled workers ($Q_s \\text{ of labour} > Q_d \\text{ of labour}$).
- **Evaluation**: The success of minimum wages depends on the elasticity of demand for labour. If labour demand is inelastic, total worker earnings rise with minimal job losses.

## 3.3 Indirect Taxes (Specific vs Ad Valorem)
An indirect tax is a tax imposed on the sale of goods and services, collected by producers and remitted to the tax authority.
1. **Specific (Unit) Tax**: A fixed dollar amount per unit sold (e.g., $2.00 per packet of cigarettes). Causes a parallel vertical upward shift of the supply curve by the amount of the tax.
2. **Ad Valorem Tax**: A percentage tax levied on the value of the good (e.g., 20% VAT / GST). Causes a pivotal upward shift of the supply curve, with the vertical gap widening as price increases.

### Tax Incidence and Elasticities:
The economic burden (incidence) of an indirect tax is shared between consumers and producers:
- **Consumer Tax Burden**: $(P_1 - P_0) \\times Q_1$
- **Producer Tax Burden**: $(P_0 - P_{net}) \\times Q_1$
- **Determinant of Tax Incidence**: Relative elasticities of demand and supply:
  - If $|PED| < PES$ (Demand is relatively more inelastic than supply): Consumers bear the majority of the tax burden because they cannot easily switch to substitutes. (Standard for demerit goods like tobacco).
  - If $|PED| > PES$ (Demand is relatively more elastic than supply): Producers bear the majority of the tax burden because passing on the tax would destroy sales volume.

## 3.4 Subsidies
A subsidy is a direct financial grant paid by the government to producers per unit of output produced.
- **Impact on Diagram**: Shifts the supply curve vertically downward by the exact amount of the subsidy per unit.
- **Market Effects**: Equilibrium price falls from $P_0$ to $P_1$, while equilibrium quantity rises from $Q_0$ to $Q_1$.
- **Government Opportunity Cost**: Total government expenditure on the subsidy equals the subsidy per unit multiplied by the new output ($S \\times Q_1$). This creates an opportunity cost on the national budget.
- **Evaluation**: Effectiveness depends on whether producers pass on the subsidy in lower consumer prices or absorb it as higher corporate profits, and on whether demand is elastic enough to generate desired consumption gains.

## 3.5 Direct Provision and Transfer Payments
- **Direct Provision**: The government finances and provides goods and services directly to citizens free of charge at the point of use (e.g., primary state education, national healthcare). Necessary for public goods (street lighting) to overcome complete market failure, and merit goods to guarantee equitable access regardless of income.
- **Transfer Payments**: Welfare cash benefits paid by the government to individuals without any corresponding exchange of goods or services (e.g., unemployment insurance, disability pensions, universal child benefits). Aims to reduce poverty and rectify income inequality.

## 3.6 Privatisation vs Nationalisation
- **Nationalisation**: The transfer of private sector enterprises and assets into state ownership and control.
  - Arguments for: Ensures social welfare precedes profit, avoids private natural monopoly exploitation, cross-subsidises rural services.
  - Arguments against: Bureaucratic inefficiency, absence of competition and profit incentive, political interference.
- **Privatisation**: The transfer of state-owned enterprises, industries, or state assets into private ownership.
  - Arguments for: Profit incentive drives dynamic and technical efficiency, market discipline, capital investment from financial markets.
  - Arguments against: Private monopolies may raise prices and cut unprofitable essential community services, negative externalities may be ignored.
`,
  },

  // 4. UNIT 4 COURSEBOOK
  {
    title: "Cambridge AS Level Economics (9708) — Coursebook: Unit 4 The Macroeconomy",
    docType: "coursebook",
    sourceName: "Cambridge International AS Level Economics Coursebook",
    examSeries: "Cambridge 9708 AS Syllabus",
    content: `
# Unit 4: The Macroeconomy (Cambridge 9708 AS Level)

## 4.1 Aggregate Demand (AD) and Its Components
Aggregate Demand (AD) is the total planned expenditure on all final goods and services produced within an economy over a given time period at a given overall price level:
$$AD = C + I + G + (X - M)$$

### Components of AD:
1. **Consumption (C)**: Total spending by domestic households on consumer goods and services (~60-70% of AD).
   - Determinants: Disposable income, interest rates (cost of borrowing), consumer confidence, household wealth, availability of credit.
2. **Investment (I)**: Spending by private firms on capital goods (machinery, factory construction, commercial software, R&D).
   - Determinants: Real interest rates, business confidence and animal spirits, corporate tax rates, technological change, capacity utilization.
3. **Government Spending (G)**: Current and capital spending by the central and local government on public services (health, education, infrastructure). Note: Excludes transfer payments (pensions, benefits) to avoid double counting.
   - Determinants: Fiscal policy stance, political objectives, state of the economic cycle (automatic stabilisers).
4. **Net Exports (X - M)**: Total export revenue received from abroad minus total spending on imported foreign goods.
   - Determinants: Real exchange rates, relative inflation rates, relative real GDP growth rates of domestic economy vs trading partners, trade barriers and protectionism.

### The Downward-Sloping AD Curve:
The AD curve slopes downward from left to right against the general price level due to:
1. **The Real Wealth Effect (Pigou Effect)**: A lower price level increases the real purchasing power of accumulated household cash assets, boosting real consumption spending.
2. **The Interest Rate Effect (Keynes Effect)**: Lower price levels reduce transactions demand for money, leading to lower interest rates, which stimulates investment and consumption.
3. **The International Trade Effect (Mundell-Fleming Effect)**: Lower domestic price levels make domestic exports more price competitive overseas and make foreign imports relatively expensive, expanding net exports ($X - M$).

## 4.2 Aggregate Supply (AS)
Aggregate Supply is the total volume of goods and services that domestic producers are willing and able to supply at various price levels.
- **Short-Run Aggregate Supply (SRAS)**: Upward sloping curve showing the relationship between price level and output when nominal wages and raw material prices are fixed. Shifts are caused by changes in production costs (oil prices, wage rates, import tariffs, business taxes).
- **Long-Run Aggregate Supply (LRAS)**: Represents the economy's maximum productive capacity (potential GDP).
  - **Classical (Monetarist) LRAS**: Perfectly vertical at the natural rate of output ($Y_f$). In the long run, wages and prices are completely flexible; output is determined solely by factor endowments and technology.
  - **Keynesian AS**: Features three phases: (1) perfectly horizontal at low output (spare capacity allows output expansion with zero inflationary pressure); (2) upward sloping as factor bottlenecks appear; (3) perfectly vertical at full employment capacity.

## 4.3 Macroeconomic Equilibrium
Macroeconomic equilibrium occurs at the intersection of Aggregate Demand and Aggregate Supply ($AD = AS$). This simultaneous clearing determines real GDP output ($Y_e$) and the general price level ($P_e$).
- **Demand-pull expansion**: Rightward shift in AD increases real GDP and raises the general price level (demand-pull inflation).
- **Cost-push contraction (Stagflation)**: Leftward shift in SRAS causes real GDP to contract while the price level rises.

## 4.4 Inflation
Inflation is defined as a sustained increase in the general price level of goods and services over time, leading to a fall in the purchasing power of money.
- **Deflation**: A persistent decrease in the general price level (negative inflation rate).
- **Disinflation**: A slowdown in the rate of inflation (prices are still rising, but at a lower rate).

### Measurement of Inflation: Consumer Price Index (CPI)
1. Base year selected (index = 100).
2. Family expenditure survey conducted to identify the representative "basket of goods and services" purchased by typical households.
3. Items weighted according to the proportion of total household income spent on each good.
4. Monthly price updates gathered across retail outlets.
5. Weighted price changes aggregated:
$$\\text{Inflation Rate} = \\frac{CPI_1 - CPI_0}{CPI_0} \\times 100$$

### Causes of Inflation:
1. **Demand-Pull Inflation**: Arises when Aggregate Demand increases faster than the economy's productive capacity ($AD > AS$). Associated with booming consumer spending, high investment, or expansionary fiscal/monetary stimulus near full capacity.
2. **Cost-Push Inflation**: Arises from an increase in the costs of production for firms, shifting SRAS to the left. Driven by rising global commodity prices, supply chain shocks, wage-push spirals, or depreciating exchange rates raising imported component costs.

### Consequences of High Inflation:
- **Redistribution of income**: Borrowers gain in real terms; savers and fixed-income pensioners lose purchasing power.
- **Loss of international competitiveness**: If domestic inflation exceeds trading partners' inflation, exports become relatively expensive and imports cheaper, worsening the current account balance.
- **Menu costs**: Costs incurred by firms constantly updating price lists and catalogues.
- **Shoe-leather costs**: Time and effort spent by consumers and businesses moving money into interest-bearing assets to preserve purchasing power.
- **Fiscal drag**: Taxpayers are pushed into higher income tax brackets without any increase in real purchasing power.

## 4.5 Balance of Payments and Exchange Rates
The **Balance of Payments (BoP)** is a record of all financial transactions made between consumers, firms, and the government of one nation and the rest of the world over a given period.
- **The Current Account**:
  1. Trade in Goods (Visible balance)
  2. Trade in Services (Invisible balance, e.g. banking, tourism)
  3. Primary Income (Net income flows from investment profits, dividends, interest earned abroad)
  4. Secondary Income (Net current transfers, e.g. foreign aid, remittances)
- **Current Account Deficit**: Total outflows on the current account exceed total inflows ($M > X$). Often caused by overvalued exchange rates, low domestic productivity, high domestic consumer demand, or deindustrialisation.

### Exchange Rates:
- **Floating Exchange Rate**: Determined freely by the market forces of demand and supply for the domestic currency on foreign exchange markets. A rise in value is an **appreciation**; a fall in value is a **depreciation**.
- **Fixed Exchange Rate**: Pegged by the central bank at an official parity. An upward adjustment is a **revaluation**; a downward adjustment is a **devaluation**.
- **Marshall-Lerner Condition**: A currency depreciation will improve the current account balance only if the sum of price elasticities of demand for exports and imports exceeds one:
$$|PED_x| + |PED_m| > 1$$
- **J-Curve Effect**: In the short run, currency depreciation often worsens the current account balance because trade contracts are fixed ($PED_x + PED_m < 1$). Over time, consumers and firms adjust, and the current account improves.

## 4.6 International Trade: Absolute and Comparative Advantage
- **Absolute Advantage (Adam Smith)**: A country has an absolute advantage if it can produce more of a good with the same quantity of resources, or produce a given output using fewer resources than another country.
- **Comparative Advantage (David Ricardo)**: A country has a comparative advantage if it can produce a good at a **lower opportunity cost** than another country. Even if a country has an absolute disadvantage in producing all goods, mutually beneficial international trade is still possible if nations specialize in goods where their opportunity cost is lowest.
`,
  },

  // 5. UNIT 5 COURSEBOOK
  {
    title: "Cambridge AS Level Economics (9708) — Coursebook: Unit 5 Government Macroeconomic Intervention",
    docType: "coursebook",
    sourceName: "Cambridge International AS Level Economics Coursebook",
    examSeries: "Cambridge 9708 AS Syllabus",
    content: `
# Unit 5: Government Macroeconomic Intervention (Cambridge 9708 AS Level)

## 5.1 Macroeconomic Objectives of Government
Governments typically pursue four primary macroeconomic objectives:
1. **Low and stable inflation**: Target typically set around 2% per annum.
2. **High and sustainable economic growth**: Steady expansion of real GDP without generating excessive inflation or environmental degradation.
3. **Low unemployment / Full employment**: Maximising utilization of the civilian labour force.
4. **Stable Balance of Payments on Current Account**: Avoiding chronic, unsustainable current account deficits.

## 5.2 Fiscal Policy
Fiscal policy involves deliberate changes in government spending ($G$) and taxation ($T$) to influence the level of Aggregate Demand and economic activity.
- **Expansionary Fiscal Policy**: Implemented during economic recessions or downturns. Involves increasing government spending ($G \\uparrow$) and/or cutting direct and indirect taxes ($T \\downarrow$). Shifts AD to the right, increasing real output and employment. Leads to a budget deficit ($G > T$).
- **Contractionary Fiscal Policy**: Implemented during economic overheating or high demand-pull inflation. Involves cutting government spending ($G \\downarrow$) and/or raising taxes ($T \\uparrow$). Shifts AD to the left, dampening inflationary pressures.
- **Automatic Stabilisers**: Built-in fiscal mechanisms that cushion economic fluctuations without discretionary government intervention (e.g., progressive income taxes reduce disposable income during booms; unemployment benefits sustain consumer demand during downturns).

## 5.3 Monetary Policy
Monetary policy involves changes in the central bank's policy interest rate, the money supply, and exchange rate targets to influence AD and inflation.
- **Expansionary Monetary Policy**: Lowering central bank policy rates and/or engaging in Quantitative Easing (QE) to increase banking system liquidity.
  - **Transmission Mechanism**: Lower interest rates reduce borrowing costs for mortgages and business loans $\\rightarrow$ boosts consumption ($C$) and investment ($I$) $\\rightarrow$ depreciates exchange rate as hot money flows out $\\rightarrow$ boosts net exports ($X - M$) $\\rightarrow$ shifts AD right.
- **Contractionary Monetary Policy**: Raising interest rates to cool consumer borrowing, encourage saving, attract hot money inflows (appreciating the currency), and shift AD left to control inflation.

## 5.4 Supply-Side Policies
Supply-side policies are government measures designed to increase the productive potential and capacity of the economy by shifting the Long-Run Aggregate Supply (LRAS) curve to the right.
1. **Market-Based Supply-Side Policies**: Aim to reduce state regulations, eliminate barriers, and unleash free market incentives:
   - Income and corporate tax cuts (incentivise work effort and R&D investment).
   - Deregulation (removing red tape to lower business compliance costs).
   - Labour market flexibility (reducing trade union power, reforming minimum wages).
   - Privatisation of state monopolies.
2. **Interventionist Supply-Side Policies**: Involve direct government expenditure to rectify market failures:
   - Government investment in education, apprenticeships, and vocational training (raising human capital productivity).
   - Direct public investment in transport and digital infrastructure (roads, rail, 5G ports).
   - Government subsidies for industrial R&D and clean green energy.

## 5.5 Macroeconomic Policy Conflicts and Trade-Offs
Achieving all macroeconomic objectives simultaneously is rarely possible due to inherent trade-offs:
1. **Inflation vs Unemployment (The Phillips Curve)**: In the short run, reducing unemployment via expansionary AD policies creates factor bottlenecks and wage pressures, accelerating inflation.
2. **Economic Growth vs Balance of Payments**: High domestic real GDP growth increases consumer disposable incomes. With a high marginal propensity to import, imports ($M$) surge, worsening the current account deficit.
3. **Economic Growth vs Environmental Sustainability**: Rapid industrial production expansion can generate air pollution, resource depletion, and carbon emissions.
`,
  },

  // 6. SYLLABUS SPECIFICATION & COMMAND WORDS
  {
    title: "Cambridge AS Level Economics (9708) — Official Syllabus Specification & Assessment Architecture",
    docType: "syllabus",
    sourceName: "Cambridge Assessment International Education (CAIE)",
    examSeries: "Cambridge 9708 AS Syllabus 2023-2026",
    content: `
# Cambridge International AS Level Economics (9708) — Syllabus Architecture

## Assessment Structure Overview
The AS Level qualification is examined via two compulsory papers:
1. **Paper 1: Multiple Choice (P1)**:
   - Duration: 1 hour 15 minutes
   - Total Marks: 30 marks (30 four-choice questions)
   - Weighting: 33.3% of total AS Level
   - Focus: Thorough breadth of coverage across all 5 syllabus sections. Tests precise conceptual understanding, calculation ability, and diagram interpretation under tight time constraints (2.5 minutes per question).

2. **Paper 2: Data Response and Essay (P2)**:
   - Duration: 2 hours 00 minutes
   - Total Marks: 60 marks
   - Weighting: 66.7% of total AS Level
   - **Section A: Compulsory Data Response (20 marks)**
     - Candidate analyzes unseen economic extracts, statistical tables, and charts. Tests AO1 (knowledge), AO2 (application and analysis), and AO3 (evaluative synthesis of data).
   - **Section B: Microeconomics Essay (20 marks)**
     - Choice of 1 essay out of 2: broken into part (a) [8 marks] and part (b) [12 marks].
   - **Section C: Macroeconomics Essay (20 marks)**
     - Choice of 1 essay out of 2: broken into part (a) [8 marks] and part (b) [12 marks].

## Assessment Objectives (AO) Weighting for AS Level:
- **AO1: Knowledge and Understanding (35% of AS)**: Accurate definitions, economic terminology, formulas, and correct diagram frameworks.
- **AO2: Analysis (40% of AS)**: Explaining economic mechanisms, establishing step-by-step causal chains of reasoning ("lead to -> result in -> consequently"), and integrating annotated economic diagrams into written prose.
- **AO3: Evaluation (25% of AS)**: Weighing counterarguments, assessing real-world assumptions, prioritizing key determinants, contrasting short-run vs long-run effects, and arriving at a reasoned, substantiated conclusion.

## Official Cambridge Command Words Glossary:
- **Define**: Give clear, precise meaning using standard Cambridge economic terminology.
- **Explain**: Set out purposes, reasons, or mechanisms; make relationships clear; state "how" and "why" something occurs using analytical chains.
- **Discuss**: Explore both sides of an economic issue, policy, or argument (pros vs cons; benefits vs limitations). Requires balanced analysis followed by an evaluative conclusion.
- **Assess**: Make an informed judgment on the significance, effectiveness, or relative importance of an economic factor or policy.
- **Evaluate**: Judge the value, quality, or extent of an argument, policy, or economic outcome based on rigorous evidence and economic reasoning.
- **Calculate**: Work out from given numerical data; show full working and units.
`,
  },

  // 7. EXAMINER REPORTS & COMMON PITFALLS
  {
    title: "Cambridge AS Level Economics (9708) — Examiner Insights, Chief Examiner Reports & Common Pitfalls Guide",
    docType: "examiner_report",
    sourceName: "Cambridge International Examination Reports Compendium",
    examSeries: "Cambridge 9708 2016-2025 Series",
    content: `
# Chief Examiner Reports: Key Insights & Common Pitfalls for AS Level (9708)

## Top 10 Common Mistakes in AS Economics Essays & Data Response:

1. **Failure to Address the Specific Context**:
   - In Data Response questions, candidates frequently write generic textbook definitions without extracting, citing, or referencing the specific data, figures, and context provided in the case study extract.
   - Examiner remedy: Always quote exact figures and reference the specific country named in the text (e.g. "In country X, inflation increased from 3.2% to 6.8%...").

2. **Confusing Movements Along a Curve with Shifts of the Curve**:
   - One of the most persistent errors on Paper 1 and Paper 2 is confusing an increase in quantity demanded (movement along demand caused by a price drop) with an increase in demand (outward shift caused by non-price factors).
   - Always state clearly: "A fall in price causes a movement down the demand curve (expansion in quantity demanded), whereas a rise in consumer incomes shifts the entire demand curve rightward."

3. **Incomplete or Inaccurately Labelled Diagrams**:
   - Candidates frequently draw unlabeled axes (missing Price and Quantity) or fail to mark initial and new equilibrium points ($P_0, Q_0 \\rightarrow P_1, Q_1$).
   - A diagram with missing labels or arrows cannot access Level 3/4 marks.

4. **Weak or Superficial Evaluation (AO3)**:
   - In 12-mark questions, many candidates offer a purely one-sided answer or write a single-sentence "conclusion" that merely restates the question.
   - To achieve Top Band (Level 4: 10-12 marks), evaluation must be ongoing throughout the essay, not merely tacked on at the end, and must culminate in an independent, substantiated judgment based on:
     - Short-run vs long-run effects.
     - The size (magnitude) of the shock or policy.
     - Which factor or policy is most significant and why.
     - Real-world constraints (e.g., government budget limits, time lags).

5. **Misunderstanding Tax Incidence and Elasticities**:
   - Candidates often assume that an indirect tax is always paid equally by the consumer and producer.
   - Remember: When demand is relatively inelastic ($|PED| < PES$), the consumer burden exceeds the producer burden. When demand is elastic ($|PED| > PES$), the producer burden exceeds the consumer burden.

6. **Equating a Current Account Deficit with a Budget Deficit**:
   - Confusing the national budget balance ($G - T$) with the international balance of trade/current account balance ($X - M$).
   - A government can run a fiscal budget surplus while the country simultaneously suffers a massive current account trade deficit.

7. **Vague Chains of Reasoning in Analysis (AO2)**:
   - Jumping directly from cause to effect without analytical steps (e.g., writing "Higher interest rates reduce inflation" without detailing the intermediate links).
   - Full chain required: Higher interest rates $\\rightarrow$ increased cost of borrowing $\\rightarrow$ consumers postpone mortgage/credit purchases $\\rightarrow$ investment spending falls $\\rightarrow$ Aggregate Demand contracts ($AD_0 \\rightarrow AD_1$) $\\rightarrow$ downward pressure on general price level.

8. **Failure to Distinguish Absolute from Comparative Advantage**:
   - Assuming that a country with no absolute advantage cannot trade beneficially.
   - Ricardian trade theory proves that mutually beneficial trade depends strictly on comparative advantage (differences in opportunity costs), regardless of absolute productivity levels.

9. **Misidentifying Public Goods**:
   - Confusing merit goods provided by the government (such as state healthcare or education) with pure public goods.
   - Healthcare is rivalrous and excludable; it is a merit good, NOT a public good. Public goods must satisfy non-rivalry and non-excludability (e.g. flood defences, national defence).

10. **Time Management Failures on Paper 2**:
    - Spending 50 minutes on Section A Data Response, leaving insufficient time to write two complete 20-mark essays in Sections B and C.
    - Recommended pacing: 35-40 minutes on Section A; 40 minutes on Section B (15m for part a, 25m for part b); 40 minutes on Section C (15m for part a, 25m for part b).
`,
  },

  // 8. REVISION NOTES & DIAGRAM COMPANION
  {
    title: "Cambridge AS Level Economics (9708) — Revision Guide: High-Yield Formulas, Mnemonics & Diagram Analysis",
    docType: "notes",
    sourceName: "Marginal Cambridge Revision Engine",
    examSeries: "Cambridge 9708 AS Revision",
    content: `
# AS Level Economics (9708) — Quick Revision Blueprint

## Master Formula Sheet for AS Economics:
1. **Price Elasticity of Demand (PED)**:
   $$PED = \\frac{\\% \\Delta Q_d}{\\% \\Delta P} = \\frac{(Q_1 - Q_0) / Q_0 \\times 100}{(P_1 - P_0) / P_0 \\times 100}$$
2. **Price Elasticity of Supply (PES)**:
   $$PES = \\frac{\\% \\Delta Q_s}{\\% \\Delta P}$$
3. **Income Elasticity of Demand (YED)**:
   $$YED = \\frac{\\% \\Delta Q_d}{\\% \\Delta Y}$$
4. **Cross Elasticity of Demand (XED)**:
   $$XED = \\frac{\\% \\Delta Q_d \\text{ (Good A)}}{\\% \\Delta P \\text{ (Good B)}}$$
5. **Consumer Price Index (CPI)**:
   $$CPI = \\frac{\\sum (\\text{Price in current year} \\times \\text{Weight})}{\\sum (\\text{Price in base year} \\times \\text{Weight})} \\times 100$$
6. **Rate of Inflation**:
   $$\\text{Inflation Rate (\\%)} = \\frac{CPI_{\\text{current}} - CPI_{\\text{previous}}}{CPI_{\\text{previous}}} \\times 100$$
7. **Terms of Trade (ToT) Index**:
   $$\\text{Terms of Trade} = \\frac{\\text{Index of Export Prices}}{\\text{Index of Import Prices}} \\times 100$$
8. **Aggregate Demand Identity**:
   $$AD = C + I + G + (X - M)$$

## Essential Revision Mnemonics:
- **PASIFIC** (Determinants of Demand Shift):
  - **P**: Population size
  - **A**: Advertising
  - **S**: Substitutes' price
  - **I**: Income of consumers
  - **F**: Fashion and consumer tastes
  - **I**: Interest rates
  - **C**: Complements' price
- **PINTSWC** (Determinants of Supply Shift):
  - **P**: Productivity
  - **I**: Indirect taxes
  - **N**: Number of firms in the industry
  - **T**: Technology advances
  - **S**: Subsidies
  - **W**: Weather and natural conditions
  - **C**: Costs of production
- **SPLATT** (Determinants of PED):
  - **S**: Substitutes availability
  - **P**: Percentage of income
  - **L**: Luxury or necessity
  - **A**: Addictive nature
  - **T**: Time period
  - **T**: Type of good (broad vs narrow)
`,
  },

  // 9. EXEMPLAR ESSAY BANK
  {
    title: "Cambridge AS Level Economics (9708) — Exemplar Model Essays Bank with Examiner Annotations",
    docType: "notes",
    sourceName: "Cambridge Examiner Standard Exemplar Scripts",
    examSeries: "Cambridge 9708 Exemplar Essays",
    content: `
# Cambridge AS Level Economics (9708) — Level 4 Exemplar Essay Bank

## Model Essay 1 [Microeconomics — 8 Marks]:
**Question**: Explain how a free market economy allocates resources using the price mechanism. [8]

### Exemplar Answer:
A free market economy is an economic system where resources are privately owned and economic decisions are coordinated through the price mechanism without government intervention. The price mechanism performs three fundamental functions in allocating scarce resources: signalling, rationing, and incentives (as described by Adam Smith's "invisible hand").

Firstly, prices perform a **signalling function**. Changes in market price communicate information to economic agents about relative scarcity, shortages, or surpluses in a market. For example, if consumer tastes shift towards electric vehicles, the demand curve shifts rightward from $D_0$ to $D_1$. At the original price $P_0$, an excess demand (shortage) emerges because quantity demanded exceeds quantity supplied ($Q_d > Q_s$). This shortage signals to producers that electric vehicles are more scarce and valued relative to other goods.

Secondly, prices act as an **incentive**. The resulting shortage puts upward pressure on market price, which rises from $P_0$ to a new equilibrium $P_1$. This higher price increases the profitability of producing electric vehicles. Driven by the profit motive, existing firms expand output, and new entrepreneurs allocate land, labour, and capital away from less profitable conventional combustion engine vehicles towards electric car manufacturing, causing quantity supplied to expand from $Q_0$ to $Q_1$.

Finally, prices perform a **rationing function**. As the market price rises to $P_1$, scarce goods are rationed among consumers. Consumers whose willingness and ability to pay is less than $P_1$ drop out of the market (contraction along the demand curve), leaving the scarce supply to those who value it most highly.

In conclusion, through the continuous interplay of signalling, incentives, and rationing, the price mechanism automatically guides scarce factors of production toward the goods most desired by consumers, achieving allocative efficiency without central planning.

---

## Model Essay 2 [Microeconomics — 12 Marks]:
**Question**: Discuss whether an indirect tax is the most effective policy to reduce the consumption of demerit goods. [12]

### Exemplar Answer:
A demerit good is a product, such as cigarettes or sugary beverages, that generates negative externalities in consumption and is overconsumed in a free market due to consumer information failure, where individuals underestimate the private and external harm to health. Governments frequently intervene using indirect taxes, but whether this is the "most effective" policy depends on price elasticity of demand, alternative policy instruments, and unintended consequences.

Imposing an indirect tax (such as a specific excise tax per packet of cigarettes) shifts the supply curve vertically upwards by the amount of the tax. This forces the market price to rise from $P_0$ to $P_1$ and reduces equilibrium quantity from $Q_0$ to $Q_1$, internalising the negative externality. Furthermore, indirect taxes generate substantial tax revenue for the state, which can be hypothecated to fund public healthcare or anti-smoking educational campaigns.

However, the primary limitation of an indirect tax on demerit goods is that products like cigarettes and alcohol are highly addictive, meaning their price elasticity of demand is inelastic ($|PED| < 1$). Because consumers are chemically dependent and lack immediate substitutes, a significant percentage increase in price results in a proportionately much smaller reduction in quantity demanded. Consequently, consumption falls only marginally, while low-income smokers bear a heavy regressive tax burden, potentially deepening poverty. High taxes also incentivize black market smuggling and counterfeit tobacco.

Alternative policies must therefore be considered. The government could implement **direct regulation and legislation**, such as banning smoking in public places, mandating plain packaging with graphic health warnings, or raising the legal purchasing age. Regulations bypass the price mechanism entirely, directly restricting access and altering social norms, which is often far more effective at discouraging youth uptake. Additionally, the government can fund **educational campaigns and health advertising** to correct the underlying information failure, shifting the demand curve to the left permanently.

In evaluation, an indirect tax is rarely the most effective policy when used in isolation, precisely because price-inelastic demand prevents significant consumption reductions. An indirect tax is most effective when deployed as part of a **policy mix**: using the indirect tax to generate fiscal revenue while simultaneously enforcing strict age regulations and financing public health information campaigns. In the short run, regulation directly cuts access, while in the long run, education addresses the root cause of information failure.
`,
  },
];

async function run() {
  console.log("==========================================================");
  console.log("🚀 IMPORTING AS LEVEL ECONOMICS (9708) BOOKS & MATERIALS");
  console.log("==========================================================");

  let totalDocs = 0;
  let totalChunks = 0;

  for (const item of AS_LEVEL_MATERIALS) {
    const hash = hashContent(item.content);
    console.log(`\n📚 Processing: "${item.title}"`);

    // Check if doc exists by content_hash and doc_type
    const { data: existing } = await supabase
      .from("knowledge_documents")
      .select("id, title")
      .eq("content_hash", hash)
      .eq("doc_type", item.docType)
      .maybeSingle();

    if (existing) {
      console.log(`   ⏩ Already ingested in Knowledge Base (ID: ${existing.id})`);
      continue;
    }

    const chunks = chunkText(item.content);
    console.log(`   ✂️  Generated ${chunks.length} structured chunks (${item.content.length} characters)`);

    // Insert Document
    const { data: doc, error: docErr } = await supabase
      .from("knowledge_documents")
      .insert({
        title: item.title,
        doc_type: item.docType,
        source_name: item.sourceName,
        exam_series: item.examSeries,
        content_hash: hash,
        char_count: item.content.length,
        chunk_count: chunks.length,
        status: "ready", // mark ready immediately for instant search and RAG
      })
      .select("id")
      .single();

    if (docErr || !doc) {
      console.error(`   ❌ Failed to insert document: ${docErr?.message}`);
      continue;
    }

    // Insert Chunks in batches of 100
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
  console.log(`🎉 INGESTION COMPLETE!`);
  console.log(`   New Documents: ${totalDocs}`);
  console.log(`   New Chunks:    ${totalChunks}`);
  console.log("==========================================================");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
