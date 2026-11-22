export interface SampleEssay {
  id: string;
  title: string;
  shortLabel: string;
  tariff: "8_eval" | "8_legacy" | "12" | "20";
  maxMark: "8" | "12" | "20";
  paperLevel: "AS Level" | "A2 Level";
  category: "Macroeconomics" | "Microeconomics";
  question: string;
  essayText: string;
  examinerHighlight: string;
}

export const SAMPLE_ESSAYS: SampleEssay[] = [
  {
    id: "sample-12m-exchange-rate",
    title: "12-Mark: Exchange Rate Depreciation & Current Account",
    shortLabel: "12M • Exchange Rate (AS Macro)",
    tariff: "12",
    maxMark: "12",
    paperLevel: "AS Level",
    category: "Macroeconomics",
    question:
      "Evaluate whether a depreciating exchange rate will always reduce a country's current account deficit. [12]",
    examinerHighlight:
      "Exemplifies Cambridge Level 4 evaluation: incorporates Marshall-Lerner condition, J-Curve short-run lags, and imported cost-push inflation risks.",
    essayText: `A depreciating exchange rate occurs when the external value of a floating currency falls against foreign currencies. The current account of the balance of payments records trade in goods and services, primary income, and secondary transfers. In theory, currency depreciation lowers the foreign currency price of exports (Px) and raises the domestic currency price of imports (Pm), switching expenditure toward domestic producers and improving the trade balance.

According to economic theory, cheaper exports increase foreign quantity demanded (Qx), whilst dearer imports encourage domestic consumers to switch to domestic import substitutes, reducing import volume (Qm). This expenditure-switching effect increases net export earnings (X - M), which shifts aggregate demand (AD) rightward and directly reduces the trade deficit on the current account.

However, whether depreciation successfully reduces a current account deficit depends crucially on the Marshall-Lerner condition. The Marshall-Lerner condition states that currency depreciation will only improve the balance of trade if the sum of the price elasticities of demand for exports and imports is greater than one:
PEDx + PEDm > 1

If demand is price inelastic (PEDx + PEDm < 1), the percentage increase in export volume will not compensate for the lower foreign price received, and import expenditure will rise in domestic currency terms, actually worsening the deficit.

Furthermore, in the short run, trade volumes are frequently constrained by pre-existing contracts, shipping schedules, and habit persistence. This gives rise to the J-Curve effect: immediately following depreciation, the current account deficit temporarily deteriorates because export and import demand remain price inelastic in the short run. Only in the long run, once firms renegotiate contracts and locate substitute suppliers, does demand become sufficiently elastic for the trade balance to recover and improve.

Additionally, if the domestic economy relies heavily on imported raw materials, oil, and capital machinery, depreciation triggers imported cost-push inflation. Rising production costs shift short-run aggregate supply (SRAS) leftward, increasing domestic price levels and eroding export price competitiveness, which neutralises the initial exchange rate advantage.

In conclusion, a depreciating exchange rate will not always reduce a current account deficit. It depends critically on whether the Marshall-Lerner condition is satisfied, the timeframe under consideration (short-run J-curve transition versus long-run adjustment), and whether domestic exporters possess spare production capacity to satisfy higher export demand without triggering domestic demand-pull inflation.`,
  },
  {
    id: "sample-8m-indirect-tax",
    title: "8-Mark: Indirect Tax on Demerit Goods",
    shortLabel: "8M • Indirect Taxes (AS Micro)",
    tariff: "8_eval",
    maxMark: "8",
    paperLevel: "AS Level",
    category: "Microeconomics",
    question:
      "Explain how an indirect tax can be used to correct market failure caused by the consumption of demerit goods, and consider the limitations of this policy. [8]",
    examinerHighlight:
      "Exemplifies explicit AO1 terminology, AO2 transmission mechanism (marginal external cost internalisation), and AO3 limitations (PED elasticity & black markets).",
    essayText: `Demerit goods, such as cigarettes and sugary drinks, are goods whose consumption creates negative externalities and information failure. Consumers underestimate the private health costs to themselves, and their consumption generates negative externalities on third parties, such as passive smoking and higher public healthcare costs. Consequently, marginal social cost (MSC) exceeds marginal private cost (MPC), leading to overconsumption and allocative inefficiency at the free market equilibrium (Qm > Qopt).

A government can intervene by levying a specific or ad valorem indirect tax on producers equal to the marginal external cost (MEC) at the socially optimum output. The indirect tax increases firms' cost of production, shifting the market supply curve upwards and to the left from S1 to S2 (MPC + tax). This raises the equilibrium market price from P1 to P2 and contracts quantity demanded from Qm to Qopt, internalising the externality and eliminating the deadweight welfare loss.

However, the policy has significant limitations:
First, demerit goods like tobacco are addictive, resulting in price inelastic demand (PED < 1). A substantial tax hike leads to a proportionally smaller reduction in consumption, primarily generating government tax revenue rather than eliminating the market failure.
Second, placing high taxes can encourage illegal smuggling and unregulated counterfeit black markets, undermining consumer safety.
Third, indirect taxes are regressive: low-income consumers spend a higher percentage of their disposable income on goods like alcohol and tobacco, worsening income inequality.

Therefore, whilst indirect taxes create incentives to reduce consumption, governments should combine them with information campaigns and subsidies on cessation services to achieve long-term market correction.`,
  },
  {
    id: "sample-20m-monetary-vs-supply",
    title: "20-Mark: Monetary Policy vs. Supply-Side Policies",
    shortLabel: "20M • Growth Policies (A2 Macro)",
    tariff: "20",
    maxMark: "20",
    paperLevel: "A2 Level",
    category: "Macroeconomics",
    question:
      "Assess whether supply-side policies are more effective than monetary policy in achieving sustained long-run economic growth without causing inflation. [20]",
    examinerHighlight:
      "Demonstrates A2 Level 5 synoptic evaluation: compares transmission mechanisms, capacity constraints, time lags, fiscal opportunity costs, and macro policy mix.",
    essayText: `Sustained economic growth requires expanding an economy's productive capacity over time whilst avoiding demand-pull and cost-push inflation. Macroeconomic policymakers can stimulate short-run growth using monetary policy or expand long-run productive potential through interventionist and market-oriented supply-side policies.

Expansionary monetary policy involves lowering the central bank base rate, expanding central bank balance sheets via quantitative easing (QE), or depreciating the currency. When interest rates fall, commercial bank borrowing costs decrease, reducing mortgage and corporate debt repayments. This stimulates consumer expenditure (C) through lower incentive to save and encourages business investment (I) via lower hurdle rates on capital projects. Aggregate demand (AD = C + I + G + (X - M)) shifts rightward from AD1 to AD2, increasing real output (Y).

However, monetary policy suffers from critical limitations when aiming for non-inflationary growth. If an economy operates close to full employment (Yfe), shifting AD outward encounters an inelastic aggregate supply curve, generating demand-pull inflation rather than sustainable real output growth. Furthermore, monetary policy has a transmission lag of 12 to 24 months, and in severe liquidity traps, cutting interest rates fails to boost confidence or bank lending.

In contrast, supply-side policies focus on shifting the Long-Run Aggregate Supply (LRAS) curve rightward by improving the quality, quantity, and productivity of the factors of production.
- Market-oriented policies (such as deregulation, labour market flexibility, and corporate tax cuts) increase competitive pressures, incentivize entrepreneurial risk-taking, and boost capital accumulation.
- Interventionist policies (such as government investment in transport infrastructure, digital connectivity, and education and vocational training) raise human capital and eliminate supply-chain bottlenecks.

When LRAS shifts rightwards from LRAS1 to LRAS2, national productive potential increases. Crucially, this outward shift lowers downward pressure on unit labour costs and average price levels, allowing national output to grow without generating inflationary pressures. Additionally, improved productivity enhances international export competitiveness, strengthening the balance of payments.

Nonetheless, supply-side policies are not without drawbacks. Infrastructure projects and educational reforms entail extensive implementation time lags (often 5 to 10 years before productivity gains materialize) and substantial government fiscal expenditure, risking ballooning national debt. Moreover, market deregulation can increase income inequality and worker insecurity.

In evaluation, supply-side policies are undeniably superior for securing non-inflationary long-run growth because they expand the physical capacity ceiling (Yfe) of the economy. However, they cannot operate in isolation: without adequate monetary policy maintaining stable aggregate demand and low inflation expectations, firms lack the business certainty to invest in new capacity. The most effective economic management employs a coordinated policy mix: supply-side reforms to expand productive potential, complemented by independent monetary policy to keep aggregate demand growing steadily alongside capacity.`,
  },
];
