import type { DiagramPreset } from "./diagram-lab/types";

export type ExampleSection = "Microeconomics" | "Macroeconomics" | "International & Development";

export interface EconomicsExample {
  id: string;
  title: string;
  region: string;
  yearOrPeriod: string;
  section: ExampleSection;
  topic: string;
  level: "AS" | "A Level" | "AS & A Level";
  markBands: ("8m" | "12m" | "20m")[];
  keyData: string;
  summary: string;
  essayQuestions: string[];
  /** Step-by-step AO2 causal chain showing how to weave the case into theory */
  integrationChain: string[];
  /** Weak name-drop vs A* examiner-grade integrated sentence */
  weakMention: string;
  aStarIntegration: string;
  /** AO3 evaluation pivot ("Depends on..." / counter-argument / limitation) */
  ao3Evaluation: string;
  /** Matching interactive CAD diagram preset */
  cadPreset?: DiagramPreset;
  /** Keywords for matching pasted essay prompts */
  keywords: string[];
}

export const INTEGRATION_STEPS = [
  {
    step: 1,
    title: "Lead with Theory, Never the Story",
    rule: "State the economic mechanism first (e.g., PED < 1 means consumers bear the majority of an indirect tax burden), then introduce the case study as proof.",
    avoid: "Do NOT open a paragraph with 'In 2018 the UK government introduced a sugar tax...' — Cambridge rewards applied theory, not journalism.",
  },
  {
    step: 2,
    title: "Anchor to One Concrete Detail + Mechanism",
    rule: "Name the country/market, the specific policy or shock, and one verifiable outcome (e.g., UK SDIL tiered levy → 46% drop in sugar content via producer reformulation).",
    avoid: "Avoid vague one-liners like 'e.g. cigarettes' or 'like in the USA' — examiners classify these as uncredited assertions.",
  },
  {
    step: 3,
    title: "Tie Directly to Your Diagram",
    rule: "Reference your labelled axes and shifts inside the same sentence: 'This mirrors the inward supply shift from S₁ to S₂, raising price from P₁ to P₂ with minimal contraction in Q.'",
    avoid: "Never draw a diagram and cite a real-world example in separate paragraphs without connecting the labels.",
  },
  {
    step: 4,
    title: "Pivot Immediately to AO3 Evaluation",
    rule: "Use the case study's real-world friction (time lags, elasticity, black markets, fiscal cost, government failure, or ceteris paribus breakdown) to build a 'However, this depends on...' judgement.",
    avoid: "Do not treat an example as absolute proof; show why the same policy succeeded in one country and struggled in another.",
  },
];

export const ECONOMICS_EXAMPLES: EconomicsExample[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MICROECONOMICS (AS & A LEVEL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "uk-sugar-tax-sdil",
    title: "UK Soft Drinks Industry Levy (SDIL) — Tiered Indirect Tax",
    region: "United Kingdom",
    yearOrPeriod: "2018–present",
    section: "Microeconomics",
    topic: "Government microeconomic intervention",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "Two tiers (18p/L at 5g sugar, 24p/L at 8g+); sugar content in taxed drinks fell by ~46% via reformulation.",
    summary:
      "A tiered specific indirect tax designed to internalise the negative consumption externalities of sugary drinks (NHS obesity/diabetes costs) while incentivising firms to reformulate below the tax threshold.",
    essayQuestions: [
      "Assess whether indirect taxation is the most effective method to reduce the consumption of demerit goods.",
      "Evaluate the impact of a specific indirect tax on consumers, producers, and government revenue.",
    ],
    integrationChain: [
      "Identify sugary drinks as demerit goods with negative consumption externalities (MPB > MSB), causing overconsumption (Qm > Q*).",
      "Show that the specific levy shifts supply left (S₁ → S₂), raising price to internalise the external cost.",
      "Cite the UK SDIL's tiered design: rather than solely passing the tax onto price-inelastic consumers, major brands (e.g. Fanta, Irn-Bru) cut sugar below 5g/100ml to avoid the levy.",
    ],
    weakMention: "For example, the UK put a sugar tax on fizzy drinks to stop people drinking them.",
    aStarIntegration:
      "While an indirect tax shifts supply inward from S₁ to S₂ and raises price from P₁ to P₂, its effectiveness in correcting demerit-good overconsumption depends on policy design. Under the UK's tiered Soft Drinks Industry Levy (2018), producers faced 18p–24p/L charges above 5g/8g of sugar per 100ml; rather than absorbing lower margins, firms reformulated recipes, cutting total sugar sold in soft drinks by ~46% without relying solely on price-inelastic consumer responses.",
    ao3Evaluation:
      "However, indirect taxes are regressive (taking a higher % of low-income household budgets), and consumers may substitute toward untaxed high-sugar snacks (fruit juices, confectionery), limiting net health gains unless paired with information campaigns.",
    cadPreset: "tax",
    keywords: ["indirect tax", "demerit good", "sugar tax", "negative externality", "ped", "inelastic", "tax incidence", "obesity", "government intervention"],
  },
  {
    id: "eu-ets-carbon-pricing",
    title: "EU Emissions Trading System (EU ETS) — Tradable Permits",
    region: "European Union",
    yearOrPeriod: "2005–present",
    section: "Microeconomics",
    topic: "Consumer choice, efficiency and market failure",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "Covers ~40% of EU GHG emissions; power-sector emissions fell >45% since 2005; permit prices rose from €5/t (2013) to €60–€95/t (2022–24).",
    summary:
      "The world's largest cap-and-trade market for carbon emissions. A fixed, shrinking cap on allowances creates a market price for carbon, internalising negative production externalities.",
    essayQuestions: [
      "Evaluate whether tradable pollution permits are superior to carbon taxes in correcting negative production externalities.",
      "Discuss the effectiveness of market-based policies in tackling climate change.",
    ],
    integrationChain: [
      "Explain negative production externalities (MSC > MPC) in power generation and heavy industry.",
      "Show how a fixed permit cap makes supply of pollution permits perfectly inelastic, allowing clean firms to sell surplus permits to high-abatement-cost firms (achieving abatement at lowest social cost).",
      "Contrast early EU ETS over-allocation (€5/t in 2013) with post-reform tightening (€60–€95/t), which accelerated coal-to-renewable switching.",
    ],
    weakMention: "The EU has a carbon trading scheme to reduce pollution from factories.",
    aStarIntegration:
      "Tradable permits internalise negative production externalities (MSC > MPC) by capping total emissions and letting the price mechanism allocate abatement to lowest-cost firms. In the EU Emissions Trading System, once excess permits were removed via the Market Stability Reserve, carbon prices rose from ~€5/tonne in 2013 to €60–€95/tonne in 2022–24, driving a >45% drop in covered power-sector emissions.",
    ao3Evaluation:
      "However, permit schemes suffer from government failure if caps are initially over-allocated (as in EU ETS Phase 1–2) and risk 'carbon leakage' as energy-intensive firms relocate outside the EU unless paired with border adjustments (CBAM).",
    cadPreset: "externality",
    keywords: ["externality", "negative production externality", "tradable permits", "cap and trade", "carbon", "pollution", "market failure", "msc", "mpc"],
  },
  {
    id: "berlin-rent-cap-ceiling",
    title: "Berlin Rent Freeze (Mietendeckel) — Maximum Price Failure",
    region: "Germany (Berlin)",
    yearOrPeriod: "2020–2021",
    section: "Microeconomics",
    topic: "Government microeconomic intervention",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "Capped rents on ~1.5 million flats below market equilibrium; advertised rental supply in regulated flats plunged by >40% within months.",
    summary:
      "A strict maximum price (price ceiling) imposed below equilibrium rent to improve affordability, which triggered a sharp contraction in rental supply and severe excess demand.",
    essayQuestions: [
      "Assess the microeconomic consequences of imposing a maximum price in the housing market.",
      "Evaluate whether maximum prices are an effective way to help low-income households.",
    ],
    integrationChain: [
      "Draw a binding price ceiling (P_max) below free-market equilibrium (P*), creating excess demand (Qd − Qs).",
      "Explain why landlords withdraw properties, defer maintenance, or convert rentals into owner-occupied sales, making supply even more inelastic/left-shifted over time.",
      "Cite Berlin's 2020 Mietendeckel: regulated rental listings fell >40% while rents in unregulated neighbouring cities surged.",
    ],
    weakMention: "Rent controls in Berlin caused a shortage of flats.",
    aStarIntegration:
      "A binding maximum price set below equilibrium (P_max < P*) lowers rents for incumbent tenants but creates persistent excess demand (Qd > Qs) and deadweight welfare loss. When Berlin introduced its 2020 Mietendeckel rent freeze covering 1.5 million apartments, landlords withdrew units from the market and halted renovations, causing advertised supply of regulated flats to plunge by over 40% and pushing excluded renters into unregulated suburbs.",
    ao3Evaluation:
      "While short-run affordability improves for existing tenants, long-run dynamic efficiency worsens as housing investment dries up. Supply-side policies (social housebuilding, planning deregulation) shift S right and lower equilibrium rent sustainably without shortages.",
    cadPreset: "price_ceiling",
    keywords: ["maximum price", "price ceiling", "rent control", "housing", "shortage", "excess demand", "black market", "government failure"],
  },
  {
    id: "scotland-alcohol-mup-floor",
    title: "Scotland Minimum Unit Pricing (MUP) on Alcohol — Price Floor",
    region: "United Kingdom (Scotland)",
    yearOrPeriod: "2018–present",
    section: "Microeconomics",
    topic: "Government microeconomic intervention",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "50p per unit of alcohol (raised to 65p in 2024); alcohol-specific deaths fell ~13.4% relative to England, with largest cuts among heavy drinkers.",
    summary:
      "A binding minimum price floor targeted specifically at high-strength, low-cost alcohol rather than all drinks, reducing demerit-good consumption without requiring government buffer-stock purchases.",
    essayQuestions: [
      "Evaluate the effectiveness of a minimum price in reducing the consumption of demerit goods.",
      "Compare minimum prices with indirect taxes as methods of government intervention.",
    ],
    integrationChain: [
      "Show P_min set above equilibrium for cheap high-strength cider/spirits, contracting quantity demanded from Q* to Qd.",
      "Highlight the key distinction from agricultural price floors: retailers simply reduce orders rather than the government buying surpluses.",
      "Cite Scotland's 50p/unit MUP (2018, raised to 65p in 2024): Public Health Scotland estimated a ~13.4% reduction in alcohol-attributable deaths.",
    ],
    weakMention: "Scotland set a minimum price for alcohol to reduce drinking.",
    aStarIntegration:
      "Setting a binding minimum price (P_min > P*) contracts quantity demanded from Q* to Qd and targets the cheapest, highest-harm products. Following Scotland's 50p Minimum Unit Price in 2018 (raised to 65p in 2024), cheap high-strength cider prices jumped sharply, reducing off-trade alcohol sales by ~3% and cutting alcohol-specific deaths by an estimated 13.4% compared with England.",
    ao3Evaluation:
      "Unlike an indirect tax, a minimum price transfers extra windfall revenue to supermarkets and producers rather than to the Treasury (meaning no hypothecated funding for NHS treatment), and remains regressive for dependent low-income drinkers with highly inelastic PED.",
    cadPreset: "price_floor",
    keywords: ["minimum price", "price floor", "alcohol", "demerit good", "surplus", "excess supply", "tax vs minimum price"],
  },
  {
    id: "eu-cap-buffer-stock",
    title: "EU Common Agricultural Policy (CAP) — Price Floors & Buffer Stocks",
    region: "European Union",
    yearOrPeriod: "1970s–2000s (reformed)",
    section: "Microeconomics",
    topic: "Government microeconomic intervention",
    level: "AS",
    markBands: ["8m", "12m"],
    keyData: "Guaranteed intervention prices created 'butter mountains' and 'wine lakes', consuming >60% of the EU budget at peak before shifting to direct income decoupled payments.",
    summary:
      "Classic illustration of guaranteed minimum prices in agriculture generating persistent excess supply (Qs > Qd), massive government storage/disposal costs, and global market distortion via subsidised export dumping.",
    essayQuestions: [
      "Explain how a minimum guaranteed price affects farmers, consumers, and taxpayers.",
      "Discuss whether buffer stock schemes are an effective way to stabilise agricultural prices.",
    ],
    integrationChain: [
      "Draw P_min above equilibrium, identifying excess supply (Qs − Qd) and the shaded rectangle of government purchase cost (P_min × (Qs − Qd)).",
      "Cite the historic EU CAP where guaranteed prices incentivised overproduction ('butter mountains'), draining >60% of the EU budget in storage and export subsidies.",
      "Explain why the EU later reformed CAP toward direct decoupled farmer payments instead of price floors.",
    ],
    weakMention: "The EU CAP created butter mountains because prices were too high.",
    aStarIntegration:
      "When a government enforces a minimum guaranteed price above equilibrium (P_min > P*) and commits to buying the resulting excess supply (Qs − Qd), taxpayer expenditure equals P_min × (Qs − Qd). Under the EU's historic Common Agricultural Policy, guaranteed intervention prices triggered chronic agricultural surpluses ('butter mountains' and 'wine lakes') that absorbed over 60% of the EU budget in storage and export-subsidy disposal costs.",
    ao3Evaluation:
      "Buffer stocks can stabilise volatile farm incomes caused by inelastic PES and weather shocks, but only if the target price tracks the long-run equilibrium; setting P_min persistently too high creates government failure and harms developing-country farmers when surpluses are dumped abroad.",
    cadPreset: "price_floor",
    keywords: ["minimum price", "price floor", "agriculture", "buffer stock", "cap", "surplus", "excess supply", "inelastic pes"],
  },
  {
    id: "china-ev-subsidies",
    title: "China & Norway Electric Vehicle (EV) Subsidies — Merit Good / Green Subsidy",
    region: "China & Norway",
    yearOrPeriod: "2010–2024",
    section: "Microeconomics",
    topic: "Government microeconomic intervention",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "Norway VAT/import tax exemptions lifted EVs to >88% of new car sales (2024); China's ~$230bn cumulative EV support drove battery costs down >80% and made BYD the global volume leader.",
    summary:
      "Demonstrates how per-unit producer subsidies and consumer tax exemptions shift supply right (S₁ → S₂), unlock dynamic economies of scale, and correct positive externalities / underconsumption of green tech.",
    essayQuestions: [
      "Evaluate the effectiveness of government subsidies in promoting renewable energy or electric vehicles.",
      "Assess the impact of a per-unit subsidy on consumer surplus, producer revenue, and government finances.",
    ],
    integrationChain: [
      "Show S₁ shifting down/right to S₂ (S − subsidy), lowering price from P₁ to P₂ and expanding output from Q₁ to Q₂ toward the social optimum Q*.",
      "Explain how higher output triggers dynamic economies of scale (learning-by-doing in battery manufacturing), shifting long-run supply further right even after subsidies phase out.",
      "Cite Norway (>88% EV share via VAT exemptions) and China (scale economies driving BYD's cost advantage).",
    ],
    weakMention: "China subsidised electric cars so more people bought them.",
    aStarIntegration:
      "A per-unit subsidy shifts supply outward from S₁ to S₂, lowering consumer price from P₁ to P₂ while raising producer revenue per unit to P_p. In the EV market, China's long-term industrial subsidies and Norway's VAT exemptions accelerated adoption (reaching >88% of new Norwegian car sales in 2024), allowing manufacturers like BYD to exploit massive dynamic economies of scale and cut lithium-ion battery costs by over 80%.",
    ao3Evaluation:
      "However, subsidies carry high fiscal opportunity costs (funded by higher taxes or borrowing), may disproportionately benefit wealthy early adopters (regressive incidence), and risk trade retaliation (such as EU/US tariffs on subsidised Chinese EVs).",
    cadPreset: "subsidy",
    keywords: ["subsidy", "electric vehicles", "ev", "merit good", "positive externality", "economies of scale", "green", "renewable"],
  },
  {
    id: "opec-oil-ped-pes",
    title: "OPEC+ Oil Production Cuts — Inelastic PED & PES",
    region: "Global (OPEC+)",
    yearOrPeriod: "2020–2024",
    section: "Microeconomics",
    topic: "The price system and the microeconomy",
    level: "AS",
    markBands: ["8m", "12m"],
    keyData: "Short-run PED of crude oil ≈ −0.05 to −0.10; OPEC+ cuts of ~2m barrels/day (~2% of global supply) routinely move Brent crude prices by 15%–25%.",
    summary:
      "Gold-standard AS example proving why a small leftward shift in supply causes a disproportionately large price surge and higher total producer revenue when PED is highly price inelastic.",
    essayQuestions: [
      "Explain why primary commodity prices are more volatile than prices of manufactured goods.",
      "Assess the usefulness of Price Elasticity of Demand (PED) to producers when setting output or price.",
    ],
    integrationChain: [
      "Define PED and explain why crude oil has few immediate substitutes and is a necessity for transport/petrochemicals (|PED| ≈ 0.05–0.10 in the short run).",
      "Draw steep D and S curves: a small inward supply shift (S₁ → S₂) causes a sharp jump in P₁ → P₂ with a tiny drop in Q₁ → Q₂, raising total revenue (P × Q).",
      "Cite OPEC+ output cuts (~2% of world supply) triggering 15%–25% price spikes.",
    ],
    weakMention: "Oil is inelastic so OPEC makes more money when they cut supply.",
    aStarIntegration:
      "Because crude oil is an essential input with few immediate substitutes, its short-run PED is highly inelastic (estimated at −0.05 to −0.10). Consequently, when OPEC+ restricts supply by just ~2 million barrels/day (~2% of global supply), the leftward shift from S₁ to S₂ triggers a disproportionately large price surge of 15%–25% with minimal contraction in quantity, substantially increasing total revenue for member states.",
    ao3Evaluation:
      "In the long run, however, PED becomes more elastic as high oil prices accelerate EV adoption, fuel efficiency, and non-OPEC shale production (e.g. US Permian Basin), eroding OPEC+'s pricing power and revenue gains.",
    cadPreset: "supply_demand",
    keywords: ["ped", "pes", "elasticity", "oil", "opec", "commodity", "price volatility", "total revenue", "supply shift"],
  },
  {
    id: "nhs-education-merit-goods",
    title: "Free Childhood Vaccination & Public Healthcare — Merit Goods",
    region: "Global / UK NHS",
    yearOrPeriod: "Ongoing",
    section: "Microeconomics",
    topic: "Consumer choice, efficiency and market failure",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "WHO estimates every $1 invested in childhood immunisation returns ~$26 in economic & healthcare savings via herd immunity (positive consumption externality).",
    summary:
      "Illustrates both causes of merit-good underconsumption: information failure (individuals underestimate private long-run benefits) and positive consumption externalities (MSB > MPB via herd immunity).",
    essayQuestions: [
      "Evaluate whether healthcare and education should be provided free at the point of use by the state.",
      "Explain why merit goods are underconsumed in a free market and assess policies to correct this.",
    ],
    integrationChain: [
      "Draw Positive Consumption Externality (MSB > MPB): free market consumes at Qm (MPC = MPB) instead of social optimum Q* (MSC = MSB), creating a welfare loss triangle.",
      "Explain herd immunity: one vaccinated individual lowers infection risk for third parties (MEB > 0).",
      "Cite WHO's ~$26-per-$1 return on immunisation justifying free state provision and subsidies.",
    ],
    weakMention: "Vaccines are a merit good because they help everyone stay healthy.",
    aStarIntegration:
      "In a free market, vaccines are underconsumed at Qm < Q* both because individuals ignore positive consumption externalities (herd immunity, where MSB > MPB) and due to imperfect information. The WHO estimates every $1 spent on childhood immunisation generates ~$26 in wider health and productivity gains, justifying free state provision or full subsidies to close the Qm → Q* welfare loss triangle.",
    ao3Evaluation:
      "However, free state provision (e.g. UK NHS) faces government failure: zero price creates excess demand (long waiting lists), X-inefficiency due to lack of profit motive, and high fiscal opportunity cost for taxpayers.",
    cadPreset: "externality",
    keywords: ["merit good", "positive externality", "healthcare", "vaccine", "education", "msb", "mpb", "state provision", "nhs", "information failure"],
  },
  {
    id: "uk-water-natural-monopoly",
    title: "UK Water Utilities (Thames Water) & Ofwat — Natural Monopoly & Regulation",
    region: "United Kingdom",
    yearOrPeriod: "1989–2024",
    section: "Microeconomics",
    topic: "Costs, revenue and market structures",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "Regulated via RPI/CPI − X price caps (Ofwat); Thames Water accumulated ~£15bn debt alongside sewage-spill fines, highlighting regulatory capture and investment trade-offs.",
    summary:
      "Definitive A Level case study for Natural Monopoly (massive fixed pipe infrastructure, falling LRAC), price-cap regulation (CPI − X), and privatisation vs nationalisation debates.",
    essayQuestions: [
      "Evaluate whether natural monopolies should always be nationalised rather than regulated in the private sector.",
      "Assess the effectiveness of price-cap regulation (RPI − X) in controlling monopoly power.",
    ],
    integrationChain: [
      "Explain why duplicating underground water mains is productively inefficient — a single firm achieves lowest LRAC (Natural Monopoly where MC < AC across market demand).",
      "Show that an unregulated monopolist sets MC = MR, charging Pm > MC (allocative inefficiency) and earning supernormal profit.",
      "Cite Ofwat's CPI − X price-cap regulation and Thames Water's £15bn debt/sewage crisis as evidence of asymmetric information between regulator and firm.",
    ],
    weakMention: "Thames Water is a natural monopoly regulated by Ofwat.",
    aStarIntegration:
      "Water supply is a classic natural monopoly because huge fixed network costs mean LRAC falls across the entire market output, making competition productively wasteful. While Ofwat uses CPI − X price caps to mimic competitive efficiency and force real price reductions, Thames Water's ~£15bn debt pile and chronic sewage spills illustrate regulatory failure: asymmetric information allowed shareholders to extract dividends while underinvesting in infrastructure.",
    ao3Evaluation:
      "Nationalisation removes the profit-dividend conflict and lowers borrowing costs, yet state-owned monopolies often suffer from X-inefficiency, political interference, and chronic underfunding when Treasury budgets tighten.",
    cadPreset: "monopoly",
    keywords: ["monopoly", "natural monopoly", "regulation", "rpi-x", "privatisation", "nationalisation", "thames water", "ofwat", "allocative efficiency"],
  },
  {
    id: "google-search-tech-monopoly",
    title: "Google Search & Apple App Store — Dynamic Efficiency vs Monopoly Abuse",
    region: "Global / US & EU",
    yearOrPeriod: "2020–2024",
    section: "Microeconomics",
    topic: "Costs, revenue and market structures",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "~90% global search market share; US court ruled Google maintained an illegal monopoly via >$20bn/yr default-placement deals; EU Digital Markets Act (DMA) fines up to 10% of global turnover.",
    summary:
      "Balances Schumpeterian dynamic efficiency (huge R&D reinvestment from supernormal profits) against high entry barriers, network effects, and anti-competitive foreclosure.",
    essayQuestions: [
      "Discuss whether monopolies are always harmful to consumers.",
      "Evaluate the effectiveness of competition policy in controlling dominant digital firms.",
    ],
    integrationChain: [
      "Use the Monopoly diagram (MC = MR → Pm, Qm) to show supernormal profit ((Pm − AC) × Qm) and static deadweight loss.",
      "Apply dynamic efficiency: Google reinvests billions in AI, Maps, and free zero-price consumer tools funded by ad-market supernormal profits.",
      "Contrast with entry barriers: paying >$20bn/yr to Apple/Samsung for default search placement locks out rivals (DuckDuckGo, Bing), prompting the 2024 US antitrust ruling and EU DMA.",
    ],
    weakMention: "Google is a monopoly with 90% of search, which is bad for rivals.",
    aStarIntegration:
      "Although monopoly theory predicts allocative inefficiency (P > MC) and deadweight loss, digital monopolies complicate this trade-off through dynamic efficiency. Google's ~90% search share generates supernormal profits that fund continuous R&D in free consumer services; however, the 2024 US antitrust ruling found that its >$20bn annual default-placement payments created artificial barriers to entry, harming contestability and prompting structural intervention under the EU Digital Markets Act.",
    ao3Evaluation:
      "Whether a monopoly harms welfare depends on contestability and innovation pace: generative AI search rivals are now eroding search barriers faster than multi-year antitrust litigation.",
    cadPreset: "monopoly",
    keywords: ["monopoly", "dynamic efficiency", "barriers to entry", "competition policy", "antitrust", "google", "supernormal profit", "contestable"],
  },
  {
    id: "uk-supermarkets-oligopoly",
    title: "UK Supermarkets (Tesco, Sainsbury's, Aldi) — Oligopoly & Non-Price Competition",
    region: "United Kingdom",
    yearOrPeriod: "2015–2024",
    section: "Microeconomics",
    topic: "Costs, revenue and market structures",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "Top 4 concentration ratio (CR4) ≈ 65%; incumbents rely on Clubcard loyalty schemes, Aldi Price Match, and store experience rather than destructive price wars.",
    summary:
      "Real-world illustration of the Kinked Demand Curve (price rigidity, interdependence), non-price competition (loyalty apps, branding), and how discounter entry (Aldi/Lidl) increases contestability.",
    essayQuestions: [
      "Evaluate the extent to which oligopolistic markets benefit consumers.",
      "Explain why prices in oligopolistic markets often remain rigid even when costs change.",
    ],
    integrationChain: [
      "Draw the Kinked Demand Curve showing elastic upper AR (rivals ignore price hikes) and inelastic lower AR (rivals match price cuts), creating a vertical MR discontinuity.",
      "Cite UK grocery (CR4 ≈ 65%): Tesco's 'Aldi Price Match' explicitly guarantees matching cuts, disincentivising price wars and channelling rivalry into non-price competition (Clubcard, delivery speed).",
      "Show that MC can shift within the MR gap without changing P*.",
    ],
    weakMention: "Tesco and Sainsbury's are an oligopoly that use Clubcards.",
    aStarIntegration:
      "In the UK grocery oligopoly (CR4 ≈ 65%), high interdependence creates kinked-demand incentives: if Sainsbury's raises prices unilaterally it loses share along the elastic upper AR, whereas price cuts are instantly matched (formalised by Tesco's 'Aldi Price Match'). Because marginal cost shifts within the discontinuous MR gap leave P* unchanged, firms compete heavily via non-price differentiation such as loyalty-card pricing and rapid delivery.",
    ao3Evaluation:
      "However, the kinked demand model cannot explain how P* was initially set, and sustained entry by low-cost discounters (Aldi/Lidl growing past 18% combined share) proves that oligopolies can still face fierce price competition when barriers are overcome.",
    cadPreset: "kinked_demand",
    keywords: ["oligopoly", "kinked demand", "price rigidity", "non-price competition", "concentration ratio", "supermarket", "tesco", "game theory", "collusion"],
  },
  {
    id: "coffee-shops-monopolistic-comp",
    title: "Independent & Chain Coffee Shops — Monopolistic Competition (SR vs LR)",
    region: "Global / High-Street Retail",
    yearOrPeriod: "Ongoing",
    section: "Microeconomics",
    topic: "Costs, revenue and market structures",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "Low capital barriers to entry, thousands of local cafés, product differentiation (origin beans, ambiance, location), high churn rate as new entrants erode abnormal profits.",
    summary:
      "Textbook application of Monopolistic Competition: downward-sloping elastic AR/MR, short-run supernormal profit attracting new entrants, shifting AR left until long-run tangency (AR = AC, normal profit, excess capacity).",
    essayQuestions: [
      "Compare the efficiency of monopolistic competition with perfect competition in the long run.",
      "Explain why firms in monopolistic competition earn only normal profit in the long run.",
    ],
    integrationChain: [
      "Draw Monopolistic Competition in SR (AR > AC at MC = MR, supernormal profit).",
      "Explain that low entry barriers allow new specialty cafés to open on the same high street, stealing customers and shifting each incumbent's AR/MR leftward until AR is tangent to AC (normal profit only).",
      "Identify excess capacity (Q_LR < Q at min AC) as the efficiency cost of consumer variety.",
    ],
    weakMention: "Coffee shops are monopolistically competitive because there are lots of them.",
    aStarIntegration:
      "High-street specialty coffee shops operate in monopolistic competition: low barriers to entry mean short-run supernormal profits earned by an innovative café attract nearby rivals, shifting the incumbent's elastic AR curve inward until long-run tangency (AR = AC, normal profit). Although firms operate with excess capacity (failing productive efficiency), consumers gain substantial welfare from variety in roast, seating, and location.",
    ao3Evaluation:
      "In practice, dominant chains (Starbucks, Costa) exploit bulk-buying economies of scale and prime-site leases that create local barriers to entry, blurring the boundary between monopolistic competition and oligopoly.",
    cadPreset: "monopolistic_comp",
    keywords: ["monopolistic competition", "product differentiation", "excess capacity", "normal profit", "long run", "coffee", "restaurants"],
  },
  {
    id: "uk-nlw-minimum-wage-monopsony",
    title: "UK National Living Wage (NLW) & NHS/Care Monopsony — Labour Markets",
    region: "United Kingdom",
    yearOrPeriod: "2016–2024",
    section: "Microeconomics",
    topic: "Labour markets and income distribution",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "UK NLW rose to £11.44/hr (2024, two-thirds of median earnings) with minimal aggregate unemployment; NHS employs >1.3m staff as a classic state monopsonist.",
    summary:
      "Reconciles why a binding minimum wage causes unemployment in a competitive labour market (Ls > Ld) yet can simultaneously raise BOTH wages AND employment in a monopsony labour market.",
    essayQuestions: [
      "Evaluate whether a National Minimum Wage will inevitably increase unemployment.",
      "Assess the impact of a monopsony employer on wages and employment.",
    ],
    integrationChain: [
      "Draw competitive labour market with W_min > W* showing excess supply of labour (Ls − Ld = unemployment).",
      "Contrast with the Monopsony diagram (MC_L > AC_L): a monopsonist sets MC_L = MRP, paying W_m < W* and hiring L_m < L*.",
      "Cite the UK National Living Wage rising to £11.44/hr (2024) with negligible aggregate job losses — consistent with local monopsony power (supermarkets/care homes) and higher worker productivity/retention.",
    ],
    weakMention: "The UK raised the minimum wage and unemployment did not go up much.",
    aStarIntegration:
      "Standard competitive labour theory predicts that a binding minimum wage (W_min > W*) creates real-wage unemployment (Ls − Ld). However, when the UK lifted the National Living Wage to £11.44/hr in 2024 (two-thirds of median pay), aggregate employment remained resilient; in local monopsony markets (such as regional care homes or hospitality), a minimum wage flattens the MC_L curve up to W_min, allowing both wages and employment to rise simultaneously.",
    ao3Evaluation:
      "This benign outcome depends heavily on the level of W_min relative to regional MRP and the elasticity of labour demand: in low-margin youth retail or hospitality, steep hikes can still trigger hours cuts, automation (self-checkouts), or pass-through inflation.",
    cadPreset: "labour_market",
    keywords: ["minimum wage", "labour market", "monopsony", "unemployment", "mrp", "nlw", "nhs", "trade union", "wages"],
  },
  {
    id: "global-wheat-perfect-comp",
    title: "Global Commodity Grain Markets (Wheat / Soybeans) — Perfect Competition",
    region: "Global (CBOT)",
    yearOrPeriod: "Ongoing",
    section: "Microeconomics",
    topic: "Costs, revenue and market structures",
    level: "A Level",
    markBands: ["8m", "12m"],
    keyData: "Thousands of price-taking farms producing standardised Grade-1 wheat; horizontal firm demand (P = AR = MR) determined by Chicago Board of Trade spot price.",
    summary:
      "Closest real-world benchmark for Perfect Competition: homogeneous product, price-taking firms, rapid entry/exit of acreage across seasons driving long-run normal profit.",
    essayQuestions: [
      "Evaluate whether perfect competition is the most desirable market structure.",
      "Explain how a firm in perfect competition adjusts from short-run supernormal profit to long-run equilibrium.",
    ],
    integrationChain: [
      "Draw side-by-side industry (D & S) and price-taking firm (horizontal P = AR = MR = D).",
      "Show how a grain price spike (e.g. 2022 Black Sea supply shock) creates SR supernormal profit (P > AC), prompting farmers globally to plant more wheat next season, shifting industry S right until P falls back to min AC (LR normal profit).",
    ],
    weakMention: "Wheat farmers are in perfect competition because wheat is identical.",
    aStarIntegration:
      "Standardised grain markets such as Grade-1 wheat approximate perfect competition: individual farms are price takers facing a horizontal demand curve (P = AR = MR) set on global exchanges. When the 2022 supply shock pushed prices above AC, surviving farms earned short-run supernormal profits, incentivising expanded global planting that shifted industry supply rightward and restored long-run normal profit (P = min AC).",
    ao3Evaluation:
      "Even though perfect competition achieves static allocative (P = MC) and productive efficiency (min AC), tiny price-taking farms lack supernormal profits for large-scale R&D (dynamic inefficiency) and cannot exploit huge economies of scale.",
    cadPreset: "perfect_competition",
    keywords: ["perfect competition", "price taker", "homogeneous", "normal profit", "allocative efficiency", "productive efficiency", "wheat", "agriculture"],
  },
  {
    id: "vietnam-ppc-growth",
    title: "Vietnam's Industrialisation & FDI Boom — Outward PPC Shift",
    region: "Vietnam",
    yearOrPeriod: "1990–2024",
    section: "Microeconomics",
    topic: "Basic economic ideas and resource allocation",
    level: "AS",
    markBands: ["8m", "12m"],
    keyData: "GDP per capita rose >8× since 1990; FDI inflows (~$23bn/yr) and education investment shifted productive capacity outward in electronics (Samsung) and manufacturing.",
    summary:
      "Concrete case of an outward shift in the Production Possibility Curve (PPC₁ → PPC₂) driven by capital accumulation, FDI technology transfer, and human capital improvement.",
    essayQuestions: [
      "Explain the factors that cause a country's Production Possibility Curve (PPC) to shift outward.",
      "Discuss the opportunity cost of prioritising capital goods over consumer goods.",
    ],
    integrationChain: [
      "Draw PPC₁ shifting outward to PPC₂, distinguishing movement from inside the curve (reducing unemployment) from an outward shift (long-run potential growth).",
      "Cite Vietnam's sustained investment in ports, STEM education, and Samsung electronics FDI (~$23bn/yr), expanding both quantity and quality of factors of production.",
    ],
    weakMention: "Vietnam's PPC shifted out because its economy grew.",
    aStarIntegration:
      "An outward shift of the PPC from PPC₁ to PPC₂ requires an increase in the quantity or quality of factors of production rather than merely absorbing spare capacity. Vietnam achieved this by prioritising capital-goods accumulation, human-capital investment, and inward FDI (~$23bn/year from firms like Samsung), permanently raising potential output across both manufactured exports and domestic consumer goods.",
    ao3Evaluation:
      "Choosing a point higher up the capital-goods axis involves a short-run opportunity cost of foregone current consumption (lower immediate living standards), and rapid industrialisation can deplete natural capital (pollution), shrinking future sustainable capacity.",
    cadPreset: "ppc",
    keywords: ["ppc", "ppf", "opportunity cost", "economic growth", "capital goods", "productive capacity", "vietnam", "fdi"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MACROECONOMICS (AS & A LEVEL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "eurozone-2022-cost-push",
    title: "2022–23 Global Energy Shock (Ukraine War) — Cost-Push Inflation",
    region: "Eurozone & UK",
    yearOrPeriod: "2022–2023",
    section: "Macroeconomics",
    topic: "The macroeconomy: measures and performance",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "European natural gas prices spiked >5×; UK CPI peaked at 11.1% and Eurozone at 10.6% in Oct 2022 alongside stagnant GDP growth (stagflation).",
    summary:
      "Definitive modern example of a leftward SRAS shift (SRAS₁ → SRAS₂) causing cost-push inflation AND lower real GDP simultaneously — exposing the policy dilemma of interest-rate hikes.",
    essayQuestions: [
      "Distinguish between demand-pull and cost-push inflation and evaluate which is harder for policymakers to control.",
      "Assess whether raising interest rates is the best response to rising inflation.",
    ],
    integrationChain: [
      "Draw SRAS shifting left (SRAS₁ → SRAS₂): Price Level rises (PL₁ → PL₂) while Real GDP contracts (Y₁ → Y₂), producing stagflation.",
      "Cite the 2022 European gas price shock driving UK CPI to 11.1% and Eurozone inflation to 10.6%.",
      "Explain why tightening monetary policy (shifting AD left) cools inflation only at the cost of deeper recession and unemployment.",
    ],
    weakMention: "Inflation hit 11% in the UK in 2022 because of energy prices.",
    aStarIntegration:
      "Unlike demand-pull inflation, cost-push inflation shifts SRAS leftward from SRAS₁ to SRAS₂, simultaneously raising the price level (PL₁ → PL₂) and contracting real GDP (Y₁ → Y₂). Following the 2022 European natural gas shock, UK CPI surged to 11.1% and Eurozone CPI to 10.6%, confronting central banks with stagflation where hiking interest rates to curb AD risked worsening the recession.",
    ao3Evaluation:
      "However, once energy shocks trigger 'second-round' wage-price spirals, central banks (BoE, ECB) still had to raise interest rates to anchor inflation expectations and prevent the Short-Run Phillips Curve from shifting permanently outward.",
    cadPreset: "macro_ad_as",
    keywords: ["cost-push", "inflation", "sras", "stagflation", "energy shock", "ad/as", "interest rates", "cpi"],
  },
  {
    id: "us-2021-demand-pull-stimulus",
    title: "US Post-COVID Fiscal Stimulus (ARP 2021) — Demand-Pull & Inflationary Gap",
    region: "United States",
    yearOrPeriod: "2021–2022",
    section: "Macroeconomics",
    topic: "Macroeconomic policy",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "$1.9 trillion American Rescue Plan (2021) injected cash while unemployment was already falling toward 3.5%; US CPI surged to 9.1% (June 2022).",
    summary:
      "Demonstrates an outward AD shift (AD₁ → AD₂) near full employment (inelastic/vertical portion of LRAS), generating a positive inflationary output gap and rapid demand-pull inflation.",
    essayQuestions: [
      "Evaluate the effectiveness of expansionary fiscal policy in stimulating economic growth.",
      "Discuss the macroeconomic consequences of a positive output gap.",
    ],
    integrationChain: [
      "Draw AD₁ → AD₂ on Classical/Keynesian LRAS near Y_fe: because spare capacity was exhausted, higher G and C translated mainly into higher PL rather than real output.",
      "Cite the $1.9trn US American Rescue Plan (2021): unemployment fell to a 50-year low (3.5%) while CPI hit 9.1%.",
    ],
    weakMention: "US stimulus cheques caused inflation to rise to 9%.",
    aStarIntegration:
      "The impact of expansionary fiscal policy depends critically on the economy's spare capacity. When the US enacted the $1.9 trillion American Rescue Plan in 2021 as labour markets were already tightening toward 3.5% unemployment, the outward shift from AD₁ to AD₂ pushed output beyond Y_fe (an inflationary gap), contributing to US CPI peaking at 9.1% in June 2022.",
    ao3Evaluation:
      "By contrast, fiscal stimulus during deep recessions (on the horizontal Keynesian LRAS range, e.g. 2009 or 2020 lockdowns) raises real GDP with minimal inflation — proving that macroeconomic context dictates fiscal effectiveness.",
    cadPreset: "macro_ad_as",
    keywords: ["fiscal policy", "demand-pull", "inflation", "output gap", "ad shift", "stimulus", "keynesian", "lras", "multiplier"],
  },
  {
    id: "fed-boe-rate-hikes-monetary",
    title: "Federal Reserve & Bank of England Rate Cycle (0.1% → 5.25%) — Monetary Policy",
    region: "US & UK",
    yearOrPeriod: "2022–2024",
    section: "Macroeconomics",
    topic: "Macroeconomic policy",
    level: "AS & A Level",
    markBands: ["12m", "20m"],
    keyData: "Policy rates raised by >500 bps in 18 months; UK/US inflation fell from 9%–11% back toward 2%–3% by mid-2024, though mortgage/borrowing costs surged with a 12–18 month transmission lag.",
    summary:
      "Tracks the full monetary transmission mechanism (Money Market Ms contraction → higher r → lower C, I, and stronger currency → AD shifts left) alongside time lags and fixed-rate mortgage friction.",
    essayQuestions: [
      "Evaluate the effectiveness of monetary policy in achieving price stability.",
      "Discuss the limitations of using interest rates to manage Aggregate Demand.",
    ],
    integrationChain: [
      "Start in the Money Market (Ms₁ → Ms₂ left, raising interest rate r₁ → r₂).",
      "Trace the 4 transmission channels: higher mortgage/loan costs cut C; higher borrowing hurdle cuts I; higher savings reward reduces MPC; hot-money inflows appreciate currency (cutting X − M) → AD shifts left.",
      "Cite the 2022–24 Fed/BoE tightening (>500 bps) bringing CPI from ~10% down toward 2%–3%.",
    ],
    weakMention: "The Bank of England raised interest rates to 5.25% to lower inflation.",
    aStarIntegration:
      "Contractionary monetary policy reduces AD via higher borrowing costs, increased savings incentives, and exchange-rate appreciation. Between 2022 and 2024, the Federal Reserve and Bank of England lifted policy rates by over 500 basis points to 5.25%–5.5%, cooling credit growth and helping bring headline inflation down from 9%–11% toward 2%–3% by mid-2024.",
    ao3Evaluation:
      "However, monetary policy suffers from long and variable time lags (12–18 months, lengthened because >80% of UK/US mortgages were on fixed-rate deals), is a blunt instrument that depresses business investment (harming LRAS), and cannot directly fix supply-side energy shocks.",
    cadPreset: "money_market",
    keywords: ["monetary policy", "interest rates", "money market", "liquidity preference", "bank of england", "federal reserve", "transmission mechanism", "time lag"],
  },
  {
    id: "japan-qe-liquidity-trap",
    title: "Japan's Quantitative Easing & Negative Rates — Liquidity Trap & Deflation",
    region: "Japan",
    yearOrPeriod: "2001–2024",
    section: "Macroeconomics",
    topic: "A Level macroeconomics",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "Bank of Japan held rates at 0% to −0.1% and expanded its balance sheet above 120% of GDP, yet core inflation stayed near 0% for two decades due to deflationary expectations.",
    summary:
      "Classic A Level evaluation of monetary policy limits: once nominal interest rates hit the zero lower bound (liquidity trap), expanding Money Supply (Ms₁ → Ms₂) fails to lower r or boost C/I.",
    essayQuestions: [
      "Evaluate whether Quantitative Easing (QE) is always effective in stimulating an economy out of recession.",
      "Assess the causes and consequences of deflation.",
    ],
    integrationChain: [
      "Draw Liquidity Preference (Money Market) with a horizontal liquidity-trap section at very low r: shifting Ms right fails to cut r further.",
      "Explain Fisher's debt-deflation spiral and deferred consumption when households expect lower future prices.",
      "Cite Japan's 20+ years of near-zero/negative rates and massive QE (>120% of GDP) failing to ignite sustained 2% inflation until 2023–24.",
    ],
    weakMention: "Japan had low interest rates for a long time and still had deflation.",
    aStarIntegration:
      "When an economy enters a liquidity trap at the zero lower bound, expansionary monetary policy loses potency because households and banks hoard cash rather than spend or lend. Despite the Bank of Japan holding rates at 0% to −0.1% and expanding QE to over 120% of GDP, entrenched deflationary expectations kept Japanese core inflation near zero for two decades.",
    ao3Evaluation:
      "This demonstrates why Keynesians argue fiscal policy (direct government infrastructure spending) is far more effective than monetary policy during a balance-sheet recession or liquidity trap.",
    cadPreset: "money_market",
    keywords: ["quantitative easing", "qe", "liquidity trap", "deflation", "japan", "monetary policy", "money supply", "keynesian"],
  },
  {
    id: "singapore-supply-side-lras",
    title: "Singapore SkillsFuture & Infrastructure — Interventionist Supply-Side Policy",
    region: "Singapore",
    yearOrPeriod: "2015–present",
    section: "Macroeconomics",
    topic: "Macroeconomic policy",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "SkillsFuture credits ($500–$4,000+ for mid-career reskilling), world-leading port/digital infrastructure, and competitive 17% corporate tax; GDP per capita >$84,000 with low structural unemployment.",
    summary:
      "Gold-standard example of combining interventionist (education/reskilling) and market-based (low corporate tax, ease of doing business) supply-side policies to shift LRAS outward non-inflationarily.",
    essayQuestions: [
      "Evaluate whether supply-side policies are the most effective way to achieve long-run economic growth without inflation.",
      "Compare market-based and interventionist supply-side policies.",
    ],
    integrationChain: [
      "Draw LRAS shifting right (LRAS₁ → LRAS₂): potential output rises (Y_fe1 → Y_fe2) while downward pressure is placed on the price level (non-inflationary growth).",
      "Cite Singapore's SkillsFuture lifelong reskilling credits (raising human capital and occupational mobility, lowering NAIRU) alongside low corporate taxes (17%) attracting high-tech FDI.",
    ],
    weakMention: "Singapore invested in education to shift its LRAS to the right.",
    aStarIntegration:
      "Unlike demand-side stimulus, supply-side policies shift LRAS rightward (LRAS₁ → LRAS₂), enabling non-inflationary long-run growth and reducing structural unemployment. Singapore pairs interventionist human-capital policy — providing universal SkillsFuture credits (up to S$4,000 for mid-career reskilling) to boost occupational mobility — with market-based incentives like a 17% corporate tax rate, sustaining one of the world's highest GDP-per-capita levels (>US$84,000).",
    ao3Evaluation:
      "However, education and infrastructure supply-side policies carry severe time lags (5–15 years), high upfront fiscal costs, and will not boost actual real GDP during a demand-deficient recession unless AD also expands.",
    cadPreset: "macro_ad_as",
    keywords: ["supply-side", "lras", "economic growth", "singapore", "human capital", "education", "productivity", "structural unemployment", "nairu"],
  },
  {
    id: "us-1970s-2023-phillips-curve",
    title: "1970s Stagflation vs 2023–24 US 'Immaculate Disinflation' — Phillips Curve",
    region: "United States",
    yearOrPeriod: "1973–1981 & 2022–2024",
    section: "Macroeconomics",
    topic: "A Level macroeconomics",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "1970s: US inflation >13% AND unemployment >7% (SRPC shifted right); 2023–24: US CPI fell from 9.1% to ~3% while unemployment stayed ~3.7%–4.1% (supply-chain normalisation + anchored expectations).",
    summary:
      "Masterclass A Level evaluation of the Short-Run vs Expectations-Augmented Long-Run Phillips Curve (NAIRU), proving why the inflation–unemployment trade-off can break down or flatten.",
    essayQuestions: [
      "Evaluate whether there is always a trade-off between inflation and unemployment.",
      "Discuss the usefulness of the Phillips Curve to macroeconomic policymakers.",
    ],
    integrationChain: [
      "Draw downward-sloping SRPC₁ intersecting vertical LRPC at NAIRU (U_n).",
      "Show 1970s oil shocks & adaptive expectations shifting SRPC₁ → SRPC₂ outward (higher inflation AND higher unemployment — stagflation, validating Friedman's LRPC).",
      "Contrast with 2023–24 US disinflation: anchored central-bank credibility and supply-chain recovery brought CPI down from 9.1% to ~3% without triggering mass unemployment.",
    ],
    weakMention: "In the 1970s stagflation showed the Phillips curve broke down.",
    aStarIntegration:
      "While demand management implies a short-run trade-off along SRPC₁, Friedman's expectations-augmented model shows that adaptive inflation expectations shift SRPC₁ outward to SRPC₂, restoring unemployment to NAIRU at permanently higher inflation — as seen during 1970s US stagflation (inflation >13%, unemployment >7%). Conversely, in 2023–24, anchored central-bank credibility and healing supply chains allowed US CPI to fall from 9.1% to ~3% while unemployment remained near 4%, showing that favourable supply shifts can flatten or shift the SRPC inward.",
    ao3Evaluation:
      "The Phillips Curve is therefore a useful short-run heuristic, but unreliable for fine-tuning because NAIRU itself is unobservable and shifts with labour-market reforms, AI/automation, and globalisation.",
    cadPreset: "phillips_curve",
    keywords: ["phillips curve", "srpc", "lrpc", "nairu", "inflation", "unemployment", "trade-off", "stagflation", "friedman"],
  },
  {
    id: "nordic-vs-south-africa-lorenz-gini",
    title: "Nordic Redistribution (Denmark/Norway) vs South Africa — Lorenz Curve & Gini",
    region: "Denmark / Norway vs South Africa",
    yearOrPeriod: "2020–2024",
    section: "Macroeconomics",
    topic: "Labour markets and income distribution",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "South Africa Gini ≈ 0.63 (world's highest); Denmark's pre-tax market Gini (~0.42) drops to ~0.27 post-tax via progressive income taxes & universal welfare.",
    summary:
      "Sharpest A Level empirical contrast for the Lorenz Curve: shows how progressive fiscal policy shifts the Lorenz curve inward toward the 45° line of perfect equality.",
    essayQuestions: [
      "Evaluate the effectiveness of fiscal policy in reducing income inequality.",
      "Discuss whether high economic growth inevitably leads to greater income inequality.",
    ],
    integrationChain: [
      "Draw the 45° Line of Perfect Equality and two Lorenz Curves (L₁ pre-tax, L₂ post-tax closer to 45°), defining Gini = A / (A + B).",
      "Cite Denmark: progressive income taxes (top rate >50%) and universal healthcare/education shift its Gini from ~0.42 (market income) down to ~0.27 (disposable income), contrasting sharply with South Africa (~0.63).",
    ],
    weakMention: "Denmark has a low Gini coefficient because it has high taxes.",
    aStarIntegration:
      "Progressive taxation and targeted transfers shift the Lorenz curve inward toward the 45° line of perfect equality, shrinking Area A and lowering the Gini coefficient. Denmark demonstrates this starkly: while its pre-tax market Gini is ~0.42, progressive income taxation and universal welfare reduce its post-tax Gini to ~0.27 — compared with ~0.63 in South Africa where structural unemployment and weaker redistribution leave the Lorenz curve heavily bowed.",
    ao3Evaluation:
      "However, excessive marginal tax rates can create equity–efficiency trade-offs (Laffer Curve disincentives, brain drain, tax avoidance), so redistribution is most sustainable when paired with pre-distribution (equal access to quality schooling and training).",
    cadPreset: "lorenz_curve",
    keywords: ["lorenz curve", "gini", "inequality", "progressive tax", "redistribution", "income distribution", "fiscal policy", "welfare"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. INTERNATIONAL TRADE & DEVELOPMENT (AS & A LEVEL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "us-china-steel-ev-tariffs",
    title: "US–China Steel, Solar & EV Tariffs — Protectionism & Deadweight Loss",
    region: "United States & China",
    yearOrPeriod: "2018–2024",
    section: "International & Development",
    topic: "International trade and exchange rates",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "25% US steel tariffs (2018) & 100% Chinese EV tariffs (2024); studies estimated US steel tariffs cost domestic consumers ~$900,000 per steel job saved and triggered retaliatory agricultural tariffs.",
    summary:
      "Premier case study for the Import Tariff diagram: illustrates domestic producer expansion, government tariff revenue, both DWL triangles, higher input costs for downstream firms, and retaliation.",
    essayQuestions: [
      "Evaluate the economic arguments for and against the use of tariffs to protect domestic industries.",
      "Compare tariffs, import quotas, and domestic production subsidies as forms of protectionism.",
    ],
    integrationChain: [
      "Draw the Tariff diagram (Pw → Pw+t): domestic supply expands (Q₁ → Q₂), domestic demand contracts (Q₄ → Q₃), imports shrink, yielding government revenue plus production & consumption DWL triangles.",
      "Cite the 2018 US 25% steel tariffs: while domestic steel output rose, downstream US auto/machinery makers faced higher input costs (~$900k consumer cost per job saved) and China retaliated against US soybean exports.",
    ],
    weakMention: "The US put tariffs on Chinese steel and EVs to protect US jobs.",
    aStarIntegration:
      "Imposing a tariff shifts world supply up from Pw to Pw+t, expanding domestic production (Q₁ → Q₂) and generating government revenue, but imposing two deadweight welfare loss triangles. When the US levied 25% steel tariffs in 2018, empirical studies estimated the policy cost US consumers and downstream manufacturers roughly $900,000 per steel job protected, while triggering retaliatory Chinese tariffs on US agricultural exports.",
    ao3Evaluation:
      "Strategic tariffs (such as 2024 100% US EV tariffs) may still be defended on infant-industry or national-security grounds — yet domestic production subsidies avoid the consumption DWL triangle because consumers continue paying Pw.",
    cadPreset: "tariff",
    keywords: ["tariff", "protectionism", "trade", "quota", "retaliation", "deadweight loss", "us china", "infant industry", "free trade"],
  },
  {
    id: "uk-brexit-gbp-depreciation-jcurve",
    title: "Post-Brexit Sterling Depreciation (2016) & Yen Slump (2022–24) — Forex & J-Curve",
    region: "United Kingdom & Japan",
    yearOrPeriod: "2016–2018 & 2022–2024",
    section: "International & Development",
    topic: "International trade and exchange rates",
    level: "AS & A Level",
    markBands: ["8m", "12m", "20m"],
    keyData: "GBP fell ~15% against USD in 2016; UK current account deficit initially stayed wide (~5% of GDP) as import bills jumped (imported inflation hit 3.1%) before export volumes slowly adjusted.",
    summary:
      "Connects the Foreign Exchange diagram (D_£ shifts left / S_£ shifts right → depreciation) directly to the J-Curve and Marshall-Lerner condition (`|PEDx| + |PEDm| > 1`).",
    essayQuestions: [
      "Evaluate whether a depreciation in the exchange rate will always improve a country's current account balance.",
      "Assess the macroeconomic effects of a sharp currency depreciation.",
    ],
    integrationChain: [
      "Show currency depreciation on the Forex diagram (lower $/£) — exports become cheaper abroad, imports dearer at home (WPIDEC).",
      "Invoke the Marshall-Lerner condition and J-Curve: in the short run, trade contracts and inelastic import demand (energy/food) cause the import bill to rise faster than export volumes, worsening the current account before long-run elasticity improves it.",
      "Cite the 2016 15% post-Brexit sterling drop: UK import prices spiked (lifting CPI to 3.1%) while the current account deficit barely narrowed initially.",
    ],
    weakMention: "After Brexit the pound fell, which made UK exports cheaper.",
    aStarIntegration:
      "A currency depreciation only improves the current account if the Marshall-Lerner condition holds (|PEDx| + |PEDm| > 1), and typically follows a J-Curve trajectory. Following the UK's 15% sterling depreciation in 2016, short-run price inelasticity of imported food, fuel, and components kept the UK current account deficit wide (~5% of GDP) and fuelled imported cost-push inflation (CPI reaching 3.1%) before export volumes gradually responded.",
    ao3Evaluation:
      "Moreover, if a country's exports rely heavily on imported intermediate components (global supply chains) or face non-price barriers (post-Brexit customs friction), even long-run depreciation fails to deliver a full current account surplus.",
    cadPreset: "j_curve",
    keywords: ["exchange rate", "depreciation", "appreciation", "forex", "j-curve", "marshall-lerner", "current account", "balance of payments", "brexit", "sterling"],
  },
  {
    id: "swiss-franc-appreciation-forex",
    title: "Swiss Franc Safe-Haven Appreciation & SNB Intervention — Managed Float",
    region: "Switzerland",
    yearOrPeriod: "2011–2024",
    section: "International & Development",
    topic: "International trade and exchange rates",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "Safe-haven capital inflows shifted D_CHF sharply right; Swiss National Bank (SNB) built >$800bn in FX reserves selling CHF to cap appreciation and protect Swiss exporters.",
    summary:
      "Demonstrates floating appreciation (D shifts right), SPICED effects (cheaper imports keeping Swiss CPI <2%, squeezed export margins), and central-bank foreign-exchange intervention.",
    essayQuestions: [
      "Evaluate the advantages and disadvantages of a floating exchange rate versus a fixed or managed exchange rate.",
      "Assess the impact of a sustained currency appreciation on an economy.",
    ],
    integrationChain: [
      "Draw the Forex diagram with D_CHF shifting right (D₁ → D₂) due to safe-haven capital inflows, appreciating the franc.",
      "Trace SPICED: cheaper imports kept Swiss inflation below 2% even during the 2022 global surge, while pressuring export competitiveness (watches, pharma).",
      "Show how the SNB intervened by supplying CHF (shifting S_CHF right) and accumulating >$800bn in foreign reserves.",
    ],
    weakMention: "Switzerland bought foreign currency to stop the Swiss franc rising too much.",
    aStarIntegration:
      "Strong safe-haven capital inflows shift demand for a currency rightward (D₁ → D₂), driving appreciation that lowers imported inflation but squeezes export margins (SPICED). To shield Swiss exporters from excessive appreciation, the Swiss National Bank repeatedly sold francs (shifting S_CHF right) and accumulated over $800bn in foreign-exchange reserves — demonstrating how a managed float trades monetary autonomy and balance-sheet risk for exchange-rate stability.",
    ao3Evaluation:
      "Defending a ceiling against appreciation is easier than defending a floor against depreciation (since a central bank can print its own currency, whereas defending a floor exhausts finite FX reserves, as in the UK's 1992 ERM exit).",
    cadPreset: "forex",
    keywords: ["exchange rate", "appreciation", "managed float", "fixed exchange rate", "floating", "snb", "switzerland", "forex", "spiced"],
  },
  {
    id: "africa-commodity-tot-prebisch",
    title: "Sub-Saharan Commodity Exporters (Zambia Copper / Ghana Cocoa) — Terms of Trade",
    region: "Zambia & Ghana",
    yearOrPeriod: "2015–2024",
    section: "International & Development",
    topic: "International economics and development",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "Copper accounts for >70% of Zambia's export earnings; volatile primary prices caused sharp Terms of Trade swings and sovereign debt distress (2020 default), illustrating the Prebisch-Singer hypothesis.",
    summary:
      "High-value Paper 4 development example tying primary-product dependence, low YED/inelastic PED, volatile Terms of Trade (`Export Price Index / Import Price Index × 100`), and diversification barriers.",
    essayQuestions: [
      "Evaluate whether specialisation in primary commodities is a barrier to economic development.",
      "Assess the impact of deteriorating Terms of Trade on a developing economy.",
    ],
    integrationChain: [
      "Define Terms of Trade (ToT = Index of Export Prices / Index of Import Prices × 100) and explain the Prebisch-Singer hypothesis (low YED for primary commodities vs high YED for manufactured imports).",
      "Cite Zambia (>70% copper export dependence): when global copper prices fell, export revenues and fiscal receipts collapsed, worsening the current account and contributing to its 2020 sovereign debt default.",
    ],
    weakMention: "Zambia relies on copper so its economy suffers when copper prices drop.",
    aStarIntegration:
      "Heavy specialisation in primary commodities exposes developing economies to severe Terms of Trade volatility and the Prebisch-Singer effect (low YED for raw commodities relative to manufactured imports). Because copper generates over 70% of Zambia's export earnings, cyclical drops in global copper prices sharply reduced export revenues and tax receipts, widening its current account deficit and contributing to its 2020 sovereign debt default.",
    ao3Evaluation:
      "However, commodity booms (e.g. 2023–24 cocoa surges or Botswana's sovereign wealth management of diamond revenues) show that natural resources are not automatically a 'resource curse' if revenues are transparently invested in diversification, infrastructure, and human capital.",
    cadPreset: "supply_demand",
    keywords: ["terms of trade", "prebisch-singer", "primary commodities", "development", "developing economy", "zambia", "copper", "diversification", "debt"],
  },
  {
    id: "microfinance-kenya-mpesa-dev",
    title: "Kenya M-Pesa Mobile Money & Grameen Microfinance — Development Finance",
    region: "Kenya & Bangladesh",
    yearOrPeriod: "2007–present",
    section: "International & Development",
    topic: "International economics and development",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "M-Pesa lifted Kenyan financial inclusion from ~26% (2006) to >83% and lifted an estimated 2% of Kenyan households (~194,000) out of extreme poverty, especially female-headed micro-enterprises.",
    summary:
      "Modern A Level development case study showing how financial-market innovation breaks the Harrod-Domar savings gap and empowers small-scale entrepreneurship without relying on tied foreign aid.",
    essayQuestions: [
      "Evaluate the role of microfinance and financial development in promoting economic development.",
      "Compare foreign aid, FDI, and domestic institutional reform as strategies for economic development.",
    ],
    integrationChain: [
      "Identify the savings/credit gap (Harrod-Domar) that traps low-income households without collateral outside formal banking.",
      "Cite Kenya's M-Pesa mobile banking network: lowered transaction costs, enabled micro-savings and credit for >83% of adults, and lifted ~2% of households out of extreme poverty by allowing women to transition from subsistence farming into retail.",
    ],
    weakMention: "M-Pesa in Kenya helped poor people use mobile phones to send money.",
    aStarIntegration:
      "Addressing the financial-exclusion savings gap is critical for breaking the poverty cycle in developing economies. Kenya's M-Pesa mobile-money platform expanded financial inclusion from ~26% in 2006 to over 83%, enabling unbanked households to save securely, insure against shocks, and access micro-credit — lifting an estimated 194,000 households (~2% of the population) out of extreme poverty.",
    ao3Evaluation:
      "However, microfinance alone cannot overcome macroeconomic bottlenecks such as unreliable electricity grids, poor roads, or weak property rights, and unregulated digital microloans have also triggered over-indebtedness among vulnerable borrowers.",
    cadPreset: "ppc",
    keywords: ["development", "microfinance", "m-pesa", "kenya", "poverty", "savings gap", "harrod-domar", "aid", "fdi", "financial inclusion"],
  },
  {
    id: "bangladesh-rmg-fdi-export-led",
    title: "Bangladesh Garment Exports & Comparative Advantage — Export-Led Growth",
    region: "Bangladesh",
    yearOrPeriod: "1990–2024",
    section: "International & Development",
    topic: "International economics and development",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "Ready-Made Garments (RMG) generate >80% of Bangladesh's merchandise exports (~$45bn/yr), employing >4 million workers (mostly women) and helping cut extreme poverty from >40% to <10%.",
    summary:
      "Shows comparative advantage in labour-intensive manufacturing driving export-led growth, female labour-force participation, and HDI gains — alongside vulnerability to over-specialisation.",
    essayQuestions: [
      "Evaluate whether export-led growth based on comparative advantage is the best path to economic development.",
      "Assess the benefits and drawbacks of globalisation for developing economies.",
    ],
    integrationChain: [
      "Apply comparative advantage (lower opportunity cost in labour-intensive textiles) → specialisation and export earnings boost AD (X − M) and fund capital imports (LRAS).",
      "Cite Bangladesh's RMG sector (>80% of exports, >4m jobs, major female employment) driving sharp reductions in extreme poverty and gains in Human Development Index (HDI).",
    ],
    weakMention: "Bangladesh exports clothes, which helped reduce poverty.",
    aStarIntegration:
      "Exploiting comparative advantage in labour-intensive manufacturing can catalyse both GDP growth and broader human development (HDI). Bangladesh's Ready-Made Garment sector accounts for over 80% of merchandise exports (~$45bn/year) and employs over 4 million workers — predominantly women — helping slash extreme poverty from >40% in 1991 to below 10% while boosting female schooling and life expectancy.",
    ao3Evaluation:
      "Yet extreme concentration in one low-margin sector leaves Bangladesh vulnerable to global demand shocks, automation, poor working conditions (highlighted by the 2013 Rana Plaza collapse), and loss of LDC duty-free EU access upon graduation.",
    cadPreset: "ppc",
    keywords: ["comparative advantage", "export-led growth", "globalisation", "bangladesh", "hdi", "development", "specialisation", "trade"],
  },
  {
    id: "uk-2022-mini-budget-crowding-out",
    title: "UK 2022 'Mini-Budget' — Fiscal Credibility, Bond Yields & Crowding Out",
    region: "United Kingdom",
    yearOrPeriod: "September–October 2022",
    section: "Macroeconomics",
    topic: "Macroeconomic policy",
    level: "A Level",
    markBands: ["12m", "20m"],
    keyData: "£45bn of unfunded tax cuts triggered a >100 bps spike in UK gilt yields within days, GBP fell to $1.03, and mortgage rates surged above 6%, forcing a rapid policy reversal.",
    summary:
      "Unbeatable A Level evaluation of expansionary fiscal policy: shows financial crowding out in real time when bond markets doubt fiscal sustainability.",
    essayQuestions: [
      "Evaluate the risks of financing expansionary fiscal policy through government borrowing.",
      "Discuss whether cutting taxes is an effective supply-side policy.",
    ],
    integrationChain: [
      "Explain financial crowding out: higher government borrowing increases demand for loanable funds, pushing up bond yields and private interest rates, crowding out private C and I.",
      "Cite the UK's September 2022 'Mini-Budget' (£45bn unfunded tax cuts): gilt yields spiked >100 bps, sterling hit a record low ($1.03), and mortgage rates surged past 6%, offsetting the intended stimulus.",
    ],
    weakMention: "The UK 2022 mini-budget made interest rates go up.",
    aStarIntegration:
      "Unfunded expansionary fiscal policy risks severe financial crowding out if bond markets question sovereign debt sustainability. When the UK announced £45bn of unfunded tax cuts in September 2022 amid already-high inflation, 10-year gilt yields spiked by over 100 basis points within days, pushing mortgage rates above 6% and forcing the Bank of England into emergency bond-market intervention — demonstrating that higher private borrowing costs can rapidly offset fiscal stimulus.",
    ao3Evaluation:
      "Crowding out is far less severe during deep recessions when private investment demand is weak and central banks keep rates low (e.g. 2020 COVID furlough borrowing), underscoring that fiscal space depends on cyclical timing and credibility.",
    cadPreset: "macro_ad_as",
    keywords: ["crowding out", "fiscal policy", "budget deficit", "national debt", "tax cuts", "mini-budget", "bond yields", "borrowing"],
  },
];

export const EXAMPLE_SECTIONS: ExampleSection[] = [
  "Microeconomics",
  "Macroeconomics",
  "International & Development",
];

/**
 * Ranks real-world examples against any pasted Cambridge essay question or search query.
 */
export function matchExamplesToQuestion(
  query: string,
  sectionFilter: ExampleSection | "All" = "All",
): { example: EconomicsExample; score: number }[] {
  const cleaned = query.trim().toLowerCase();
  const pool =
    sectionFilter === "All"
      ? ECONOMICS_EXAMPLES
      : ECONOMICS_EXAMPLES.filter((e) => e.section === sectionFilter);

  if (!cleaned) {
    return pool.map((example) => ({ example, score: 1 }));
  }

  const tokens = cleaned
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  const scored = pool.map((example) => {
    let score = 0;
    const haystack = [
      example.title,
      example.region,
      example.topic,
      example.summary,
      example.keyData,
      ...example.essayQuestions,
      ...example.keywords,
    ]
      .join(" ")
      .toLowerCase();

    // Direct phrase match
    if (haystack.includes(cleaned)) score += 12;

    // Keyword exact/substring hits (weighted heavily)
    for (const kw of example.keywords) {
      if (cleaned.includes(kw.toLowerCase())) score += 8;
    }

    // Individual token hits
    for (const token of tokens) {
      if (example.keywords.some((k) => k.toLowerCase().includes(token))) score += 4;
      else if (example.topic.toLowerCase().includes(token)) score += 3;
      else if (example.title.toLowerCase().includes(token)) score += 3;
      else if (haystack.includes(token)) score += 1;
    }

    return { example, score };
  });

  return scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
}
