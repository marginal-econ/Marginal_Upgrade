import { loadPdfjs, type StemBlob } from "@/lib/mcq-pdf-text";

export type TopicalVisualType =
  | "Supply & Demand Graph"
  | "Data Table"
  | "Bar Chart"
  | "4-Diagram Grid";

export type TopicalQuestionSlice = {
  /** Sequential question number in the compiled topical paper (1..N) */
  number: number;
  /** Short Cambridge paper code, e.g. "9708/12/O/N/22" */
  sourcePaperCode: string;
  /** Full human-readable paper title */
  sourcePaperTitle: string;
  /** Original question number in the source Cambridge PDF */
  originalQuestionNumber: number;
  /** Public URL of the official Cambridge PDF in Supabase storage */
  qpUrl: string;
  /** 1-indexed page number in the source PDF */
  pageNumber: number;
  /** Top Y coordinate in PDF points (origin at bottom-left of 842pt A4 page) */
  yTop: number;
  /** Bottom Y coordinate in PDF points (origin at bottom-left of 842pt A4 page) */
  yBottom: number;
  /** Official Cambridge mark-scheme answer */
  correctAnswer: "A" | "B" | "C" | "D";
  /** Visual element included in the real PDF slice */
  visualType: TopicalVisualType;
  /** Specific 9708 syllabus subtopic */
  subtopic: string;
  /** Assessment objective skill category */
  skill: "knowledge" | "application" | "analysis";
  /** Full extracted text of the question stem for AI explanations & review */
  stemText: string;
};

export type TopicalMcqPaper = {
  id: string;
  syllabusCode: string;
  topicNumber: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  level: "as" | "a2";
  durationSeconds: number;
  questionCount: number;
  answerKey: Record<string, "A" | "B" | "C" | "D">;
  sourceYearsLabel: string;
  visualSummaryLabel: string;
  questions: TopicalQuestionSlice[];
};

const W22_QP12_URL =
  "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/35d2d756-380a-4db4-b62e-9e6f23c3542b-9708_w22_qp_12.pdf";
const S23_QP12_URL =
  "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf";
const M25_QP12_URL =
  "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf";

const PRICE_SYSTEM_QUESTIONS: TopicalQuestionSlice[] = [
  {
    number: 1,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 6,
    qpUrl: W22_QP12_URL,
    pageNumber: 3,
    yTop: 447,
    yBottom: 254,
    correctAnswer: "D",
    visualType: "Data Table",
    subtopic: "Price Elasticity of Demand & Tax Expenditure",
    skill: "analysis",
    stemText:
      "An indirect tax is imposed on a product, causing total expenditure by consumers to increase. Which row identifies this situation? [Table comparing price elasticity of demand (elastic vs inelastic) and who bears the majority of the tax burden (consumers vs producers)].",
  },
  {
    number: 2,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 8,
    qpUrl: W22_QP12_URL,
    pageNumber: 4,
    yTop: 785,
    yBottom: 428,
    correctAnswer: "C",
    visualType: "Supply & Demand Graph",
    subtopic: "Consumer Surplus & Market Equilibrium",
    skill: "application",
    stemText:
      "The diagram shows the market demand for and supply of a good. Which statement is correct? (Comparing consumer surplus and producer surplus areas across equilibrium price levels).",
  },
  {
    number: 3,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 9,
    qpUrl: W22_QP12_URL,
    pageNumber: 4,
    yTop: 426,
    yBottom: 107,
    correctAnswer: "D",
    visualType: "Supply & Demand Graph",
    subtopic: "Price Elasticity of Supply (PES) Curves",
    skill: "analysis",
    stemText:
      "The diagram shows two linear supply curves labelled S1 and S2, where S2 is a 45° line starting from the origin. Which statement about the price elasticity of supply is correct?",
  },
  {
    number: 4,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 10,
    qpUrl: W22_QP12_URL,
    pageNumber: 5,
    yTop: 785,
    yBottom: 417,
    correctAnswer: "B",
    visualType: "Supply & Demand Graph",
    subtopic: "Government Provision & Excess Demand",
    skill: "analysis",
    stemText:
      "A country has health care provided by the free market. This is replaced by the government provision of Sg free health care. What is the change in consumer surplus or shortage/rationing impact shown in the diagram?",
  },
  {
    number: 5,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 14,
    qpUrl: W22_QP12_URL,
    pageNumber: 6,
    yTop: 646,
    yBottom: 382,
    correctAnswer: "C",
    visualType: "Data Table",
    subtopic: "Price Elasticity of Demand (PED) Comparisons",
    skill: "application",
    stemText:
      "The table shows Lee's and Yim's price elasticity of demand for restaurant meals and cinema tickets when prices rise. Which statement correctly interprets the table?",
  },
  {
    number: 6,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 16,
    qpUrl: W22_QP12_URL,
    pageNumber: 7,
    yTop: 785,
    yBottom: 522,
    correctAnswer: "C",
    visualType: "Supply & Demand Graph",
    subtopic: "Indirect Tax Incidence & Revenue Areas",
    skill: "analysis",
    stemText:
      "The diagram shows demand and supply curves for a good. S1 is the original supply curve, S2 is supply after a tax is added. How much tax revenue is paid by consumers and producers?",
  },
  {
    number: 7,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 7,
    qpUrl: S23_QP12_URL,
    pageNumber: 3,
    yTop: 659,
    yBottom: 305,
    correctAnswer: "C",
    visualType: "Bar Chart",
    subtopic: "Market Shortages, Surpluses & Disequilibrium",
    skill: "application",
    stemText:
      "There is a worldwide shortage of oil. The diagram shows the consumption and production of oil (billion tonnes) for selected countries. What can be concluded from the bar chart?",
  },
  {
    number: 8,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 8,
    qpUrl: S23_QP12_URL,
    pageNumber: 3,
    yTop: 303,
    yBottom: 93,
    correctAnswer: "A",
    visualType: "Data Table",
    subtopic: "Cross Elasticity of Demand (XED)",
    skill: "application",
    stemText:
      "The cross elasticity of demand between bus travel and rail travel is +2. A rise in the price of bus fares causes the demand for rail travel to increase by 10%. Which row shows the correct price and quantity changes?",
  },
  {
    number: 9,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 10,
    qpUrl: S23_QP12_URL,
    pageNumber: 4,
    yTop: 592,
    yBottom: 312,
    correctAnswer: "B",
    visualType: "Supply & Demand Graph",
    subtopic: "Specific Tax & Consumer/Producer Incidence",
    skill: "analysis",
    stemText:
      "A specific tax is placed upon each bottle of perfume sold. In the diagram, S is the supply curve before tax, St is the supply curve after tax. Which area represents the tax revenue paid by producers/consumers?",
  },
  {
    number: 10,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 11,
    qpUrl: S23_QP12_URL,
    pageNumber: 5,
    yTop: 785,
    yBottom: 486,
    correctAnswer: "D",
    visualType: "Supply & Demand Graph",
    subtopic: "Price Elasticity of Supply Along a Curve",
    skill: "knowledge",
    stemText:
      "The diagram shows the supply curve of a firm. Which statement about the price elasticity of supply (PES) along this curve is correct?",
  },
  {
    number: 11,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 12,
    qpUrl: S23_QP12_URL,
    pageNumber: 5,
    yTop: 484,
    yBottom: 186,
    correctAnswer: "C",
    visualType: "4-Diagram Grid",
    subtopic: "Simultaneous Shifts in Demand & Supply",
    skill: "analysis",
    stemText:
      "The diagram shows the market for electric cars with X as the initial equilibrium. What will be the new equilibrium when the price of electric car batteries falls and consumers become more environmentally aware?",
  },
  {
    number: 12,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 14,
    qpUrl: S23_QP12_URL,
    pageNumber: 6,
    yTop: 608,
    yBottom: 302,
    correctAnswer: "A",
    visualType: "Supply & Demand Graph",
    subtopic: "Unitary Price Elasticity & Total Expenditure Areas",
    skill: "analysis",
    stemText:
      "In the diagram, area OP1M1Q1 is equal to area OP2M2Q2. What is the value of the price elasticity of demand between P1 and P2?",
  },
  {
    number: 13,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 15,
    qpUrl: S23_QP12_URL,
    pageNumber: 7,
    yTop: 785,
    yBottom: 427,
    correctAnswer: "D",
    visualType: "Data Table",
    subtopic: "Income Elasticity of Demand (YED) & Normal/Inferior Goods",
    skill: "application",
    stemText:
      "The table shows changes in a consumer's expenditure on various goods when her income increases from $20,000 to $24,000. Assuming prices remain unchanged, which row correctly classifies the goods?",
  },
  {
    number: 14,
    sourcePaperCode: "9708/12/F/M/25",
    sourcePaperTitle: "9708 Feb/March 2025 Paper 12",
    originalQuestionNumber: 7,
    qpUrl: M25_QP12_URL,
    pageNumber: 4,
    yTop: 785,
    yBottom: 445,
    correctAnswer: "D",
    visualType: "Supply & Demand Graph",
    subtopic: "Price Mechanism & Producer Surplus Areas",
    skill: "application",
    stemText:
      "The diagram represents the market for a good. Which statement correctly identifies the market areas shown in the supply and demand diagram?",
  },
  {
    number: 15,
    sourcePaperCode: "9708/12/F/M/25",
    sourcePaperTitle: "9708 Feb/March 2025 Paper 12",
    originalQuestionNumber: 8,
    qpUrl: M25_QP12_URL,
    pageNumber: 4,
    yTop: 443,
    yBottom: 166,
    correctAnswer: "A",
    visualType: "Supply & Demand Graph",
    subtopic: "Cost of Production Shifts & Consumer Burden",
    skill: "analysis",
    stemText:
      "The diagram shows the impact on equilibrium due to an increase in the costs of production. The original price is $72. What is the change in consumer and producer surplus / expenditure?",
  },
];

export const TOPICAL_MCQ_PAPERS: TopicalMcqPaper[] = [
  {
    id: "topical-9708-as-price-system-micro",
    syllabusCode: "9708",
    topicNumber: "Topic 2 & 3",
    title: "Topical Past Paper: The Price System, Elasticities & Market Intervention",
    shortTitle: "The Price System, Elasticities & Intervention",
    subtitle:
      "15 real Cambridge 9708 exam questions (10 Supply/Demand & Tax Diagrams, 4 Elasticity Tables, 1 Market Bar Chart) sliced directly from official 2022–2025 papers.",
    level: "as",
    durationSeconds: 30 * 60,
    questionCount: PRICE_SYSTEM_QUESTIONS.length,
    answerKey: Object.fromEntries(
      PRICE_SYSTEM_QUESTIONS.map((q) => [String(q.number), q.correctAnswer]),
    ),
    sourceYearsLabel: "2022 – 2025 Real Papers",
    visualSummaryLabel: "11 Diagrams & 4 Tables",
    questions: PRICE_SYSTEM_QUESTIONS,
  },
];

export function isTopicalPaperId(paperId: string | null | undefined): boolean {
  if (!paperId) return false;
  return TOPICAL_MCQ_PAPERS.some((p) => p.id === paperId);
}

export function getTopicalPaperById(paperId: string | null | undefined): TopicalMcqPaper | null {
  if (!paperId) return null;
  return TOPICAL_MCQ_PAPERS.find((p) => p.id === paperId) ?? null;
}

/**
 * Converts a TopicalMcqPaper into the standard McqPaperSummary shape used by
 * `/mcq-live` so drafts, resume banners, and `beginPractice` work identically.
 */
export function toMcqPaperSummaryFromTopical(topical: TopicalMcqPaper) {
  return {
    id: topical.id,
    title: topical.title,
    level: topical.level,
    examYear: 2025,
    examSeries: "Topical" as unknown as "May/June" | "Oct/Nov" | "Feb/March" | null,
    qpUrl: topical.questions[0]?.qpUrl ?? "",
    msUrl: null,
    questionCount: topical.questionCount,
    answerKey: topical.answerKey,
    createdAt: new Date(0).toISOString(),
  };
}

/**
 * Slices each question (with its original printed Cambridge graph/table/options)
 * directly from the official PDFs and stitches them into clean 2-questions-per-page
 * exam canvases, masking the old question number and stamping the new sequential
 * number + source paper badge.
 */
export async function renderTopicalPaperPages(options: {
  topicalPaper: TopicalMcqPaper;
  scale: number;
  fetchPdfBuffer: (qpUrl: string) => Promise<ArrayBuffer>;
  onProgress?: (label: string) => void;
}): Promise<{
  pages: Array<{ pageNumber: number; canvas: HTMLCanvasElement }>;
  stems: StemBlob[];
  questionPages: Record<number, number>;
}> {
  const { topicalPaper, scale, fetchPdfBuffer, onProgress } = options;
  const pdfjs = await loadPdfjs();

  // 1. Download each unique source PDF in parallel (only 3 PDFs for 15 questions)
  const uniqueUrls = Array.from(new Set(topicalPaper.questions.map((q) => q.qpUrl)));
  onProgress?.(`Fetching ${uniqueUrls.length} official Cambridge papers…`);

  const docEntries = await Promise.all(
    uniqueUrls.map(async (url) => {
      const buf = await fetchPdfBuffer(url);
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      return [url, doc] as const;
    }),
  );
  const docsByUrl = new Map(docEntries);

  // 2. Render each unique (qpUrl, pageNumber) once at `scale`
  const uniquePageKeys = Array.from(
    new Set(topicalPaper.questions.map((q) => `${q.qpUrl}::${q.pageNumber}`)),
  );
  onProgress?.(`Extracting ${topicalPaper.questions.length} diagram & table questions…`);

  const renderedSourcePages = new Map<
    string,
    { canvas: HTMLCanvasElement; widthPt: number; heightPt: number }
  >();

  for (const key of uniquePageKeys) {
    const [url, pageStr] = key.split("::");
    const pageNum = Number(pageStr);
    const doc = docsByUrl.get(url);
    if (!doc) continue;
    const page = await doc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = Math.ceil(viewport.width);
    srcCanvas.height = Math.ceil(viewport.height);
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) continue;

    srcCtx.fillStyle = "#ffffff";
    srcCtx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);
    await (page.render({ canvasContext: srcCtx, viewport } as any) as any).promise;

    renderedSourcePages.set(key, {
      canvas: srcCanvas,
      widthPt: unscaledViewport.width,
      heightPt: unscaledViewport.height,
    });
  }

  // 3. Group questions into virtual pages (2 questions per page, like a real 9708 booklet)
  const QUESTIONS_PER_PAGE = 2;
  const totalVirtualPages = Math.ceil(topicalPaper.questions.length / QUESTIONS_PER_PAGE);
  const builtPages: Array<{ pageNumber: number; canvas: HTMLCanvasElement }> = [];
  const questionPages: Record<number, number> = {};
  const stems: StemBlob[] = topicalPaper.questions.map((q) => ({
    number: q.number,
    text: `[${q.sourcePaperCode} Q${q.originalQuestionNumber} · ${q.subtopic}] ${q.stemText}`,
  }));

  const PAGE_WIDTH_PT = 595.28;
  const HEADER_HEIGHT_PT = 44;
  const QUESTION_BANNER_PT = 24;
  const QUESTION_GAP_PT = 18;
  const FOOTER_PAD_PT = 28;

  for (let vPage = 1; vPage <= totalVirtualPages; vPage++) {
    const startIdx = (vPage - 1) * QUESTIONS_PER_PAGE;
    const pageQuestions = topicalPaper.questions.slice(startIdx, startIdx + QUESTIONS_PER_PAGE);

    // Compute exact height required for this virtual page
    let totalHeightPt = HEADER_HEIGHT_PT + FOOTER_PAD_PT;
    for (let i = 0; i < pageQuestions.length; i++) {
      const q = pageQuestions[i];
      const sliceHeightPt = Math.max(120, q.yTop - q.yBottom);
      totalHeightPt += QUESTION_BANNER_PT + sliceHeightPt;
      if (i < pageQuestions.length - 1) {
        totalHeightPt += QUESTION_GAP_PT;
      }
    }
    // Keep at least A4 height so pages look uniform
    const finalHeightPt = Math.max(760, totalHeightPt);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = Math.round(PAGE_WIDTH_PT * scale);
    outCanvas.height = Math.round(finalHeightPt * scale);
    const ctx = outCanvas.getContext("2d");
    if (!ctx) continue;

    // Crisp white paper background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

    // Draw Cambridge-style Topical Paper top header bar
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, outCanvas.width, Math.round(HEADER_HEIGHT_PT * scale));
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = Math.max(1, Math.round(1 * scale));
    ctx.beginPath();
    ctx.moveTo(0, Math.round(HEADER_HEIGHT_PT * scale));
    ctx.lineTo(outCanvas.width, Math.round(HEADER_HEIGHT_PT * scale));
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${Math.round(9.5 * scale)}px Arial, Helvetica, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(
      `CAMBRIDGE INTERNATIONAL 9708 · TOPICAL PAST PAPER (${topicalPaper.topicNumber.toUpperCase()})`,
      Math.round(36 * scale),
      Math.round(16 * scale),
    );

    ctx.fillStyle = "#475569";
    ctx.font = `${Math.round(8.5 * scale)}px Arial, Helvetica, sans-serif`;
    ctx.fillText(
      `${topicalPaper.shortTitle} · Real Past Paper Slices (2022–2025)`,
      Math.round(36 * scale),
      Math.round(31 * scale),
    );

    const pageBadge = `Page ${vPage} of ${totalVirtualPages}`;
    ctx.fillStyle = "#334155";
    ctx.font = `bold ${Math.round(9 * scale)}px Arial, Helvetica, sans-serif`;
    const badgeMetrics = ctx.measureText(pageBadge);
    ctx.fillText(
      pageBadge,
      outCanvas.width - Math.round(36 * scale) - badgeMetrics.width,
      Math.round(23 * scale),
    );

    let cursorYPt = HEADER_HEIGHT_PT + 10;

    for (let i = 0; i < pageQuestions.length; i++) {
      const q = pageQuestions[i];
      questionPages[q.number] = vPage;

      // 1. Draw subtle metadata pill strip above the question slice
      const bannerY = Math.round(cursorYPt * scale);
      const bannerH = Math.round(QUESTION_BANNER_PT * scale);
      const leftMarginX = Math.round(36 * scale);
      const rightMarginX = outCanvas.width - Math.round(36 * scale);

      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(leftMarginX, bannerY, rightMarginX - leftMarginX, bannerH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = Math.max(1, Math.round(0.75 * scale));
      ctx.strokeRect(leftMarginX, bannerY, rightMarginX - leftMarginX, bannerH);

      ctx.fillStyle = "#0f172a";
      ctx.font = `bold ${Math.round(8.5 * scale)}px Arial, Helvetica, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(
        `QUESTION ${q.number}  ·  ${q.subtopic} (${q.visualType})`,
        leftMarginX + Math.round(10 * scale),
        bannerY + Math.round(bannerH / 2),
      );

      const sourceLabel = `Source: ${q.sourcePaperCode} · Original Q${q.originalQuestionNumber}`;
      ctx.fillStyle = "#475569";
      ctx.font = `bold ${Math.round(8 * scale)}px Consolas, Monaco, monospace`;
      const srcWidth = ctx.measureText(sourceLabel).width;
      ctx.fillText(
        sourceLabel,
        rightMarginX - Math.round(10 * scale) - srcWidth,
        bannerY + Math.round(bannerH / 2),
      );

      cursorYPt += QUESTION_BANNER_PT + 4;

      // 2. Copy the exact PDF slice from the rendered source page
      const srcEntry = renderedSourcePages.get(`${q.qpUrl}::${q.pageNumber}`);
      const sliceHeightPt = Math.max(120, q.yTop - q.yBottom);
      if (srcEntry) {
        const srcY = Math.max(0, Math.round((srcEntry.heightPt - q.yTop) * scale));
        const srcH = Math.min(
          srcEntry.canvas.height - srcY,
          Math.round(sliceHeightPt * scale),
        );
        const destY = Math.round(cursorYPt * scale);

        ctx.drawImage(
          srcEntry.canvas,
          0,
          srcY,
          srcEntry.canvas.width,
          srcH,
          0,
          destY,
          srcEntry.canvas.width,
          srcH,
        );

        // 3. Mask the original left-margin question number (x = 38..67pt, top 36pt of slice)
        // and draw the new sequential question number in Cambridge 11pt bold Arial.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          Math.round(36 * scale),
          destY,
          Math.round(32 * scale),
          Math.round(34 * scale),
        );

        ctx.fillStyle = "#000000";
        ctx.font = `bold ${Math.round(11 * scale)}px Arial, Helvetica, sans-serif`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(
          String(q.number),
          Math.round(49.6 * scale),
          destY + Math.round(18.5 * scale),
        );
      }

      cursorYPt += sliceHeightPt;

      // 4. Draw separator line between questions on the same page
      if (i < pageQuestions.length - 1) {
        const sepY = Math.round((cursorYPt + QUESTION_GAP_PT / 2) * scale);
        ctx.save();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = Math.max(1, Math.round(1 * scale));
        ctx.setLineDash([Math.round(4 * scale), Math.round(4 * scale)]);
        ctx.beginPath();
        ctx.moveTo(Math.round(36 * scale), sepY);
        ctx.lineTo(outCanvas.width - Math.round(36 * scale), sepY);
        ctx.stroke();
        ctx.restore();
        cursorYPt += QUESTION_GAP_PT;
      }
    }

    builtPages.push({ pageNumber: vPage, canvas: outCanvas });
  }

  return {
    pages: builtPages,
    stems,
    questionPages,
  };
}
