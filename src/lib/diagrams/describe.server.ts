/**
 * Describes an economics diagram supplied as an image URL (e.g. a photo of a
 * textbook diagram, or a diagram exported from another tool) into the same
 * structured [DIAGRAM: ...] tag format the handwriting OCR pipeline uses, so
 * a typed online essay can get the same diagram credit as a scanned script.
 *
 * V7 Multimodal Upgrade: Runs Dual-Pass Parallel Cross-Verification 100% on
 * NVIDIA NIM `nemotron-3.5-super-vl-120b-a12b` (Pass A fast structure read +
 * Pass B adversarial visual shift/axis audit with thinking enabled) and
 * reconciles axes, curve shifts, equilibrium labels, and factual accuracy notes
 * to catch mislabelled axes or inverted shifts that single-pass reads miss.
 */
import { resolveNvidiaVisionKeys, visionChat, visionChatViaNvidia } from "../ai.server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SYSTEM_PROMPT = [
  "You are looking at an image of an economics diagram supplied by a Cambridge International AS/A Level Economics student, alongside their typed essay.",
  "Describe ONLY what is actually drawn — visually verify curve positions (1 vs 2), arrow directions (left/up vs right/down), and P1/P2, Q1/Q2 coordinates. Never assume a shift matches the title without checking the actual arrow and curve positions.",
  "Respond with a single structured tag, and nothing else, in this exact format:",
  "[DIAGRAM: <best-guess standard name, e.g. AD/AS, demand and supply with price ceiling, PPC, monopoly, Lorenz curve>",
  "| axes: <x-axis label / y-axis label exactly as shown, or 'unlabelled'>",
  "| curves: <curves shown and exact visual shifts/directions, e.g. 'S1 shifts left/up to S2' or 'S1 shifts right/down to S2'>",
  "| labels: <equilibrium points, prices, quantities, shaded areas, annotations shown on the diagram>",
  "| accuracy: <short factual note on what is correct, missing, mislabelled, or shifted in the wrong direction — no marks, no praise>]",
].join("\n");

const USER_PROMPT =
  "Describe this economics diagram using the exact [DIAGRAM: ...] tag format from the system prompt. Output only the tag.";

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function assertSafeRemoteImageUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("That doesn't look like a valid image URL.");
  }
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Diagram URLs must be http or https links.");
  }
  if (parsed.username || parsed.password) throw new Error("Image URLs cannot contain credentials.");
  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    throw new Error("That image URL uses an unsupported port.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const blockedName =
    hostname === "localhost" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal");
  const blockedIpv6 =
    hostname === "::" ||
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe8") ||
    hostname.startsWith("fe9") ||
    hostname.startsWith("fea") ||
    hostname.startsWith("feb");
  if (blockedName || blockedIpv6 || isPrivateIpv4(hostname)) {
    throw new Error("Private or local network image URLs are not allowed.");
  }
  return parsed;
}

async function readResponseWithLimit(response: Response): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new Error("That image is too large — please use an image under 8MB.");
  }
  if (!response.body) return new ArrayBuffer(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("That image is too large — please use an image under 8MB.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

async function fetchAsDataUrl(url: string): Promise<string> {
  let parsed = assertSafeRemoteImageUrl(url);
  let response: Response | null = null;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    response = await fetch(parsed.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location || redirects === 3) throw new Error("That image URL redirected too many times.");
    parsed = assertSafeRemoteImageUrl(new URL(location, parsed).toString());
  }
  if (!response) throw new Error("Could not fetch that image.");
  if (!response.ok) throw new Error(`Could not fetch that image (${response.status}).`);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("That URL doesn't point directly at an image file.");
  }

  const buffer = await readResponseWithLimit(response);

  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

const MAX_DATA_URL_BYTES = MAX_IMAGE_BYTES;

export type ParsedDiagramTag = {
  name: string;
  axes: string;
  curves: string;
  labels: string;
  accuracy: string;
};

/** Normalises raw VLM output into a canonical `[DIAGRAM: ...]` tag string. */
export function extractDiagramTag(rawText: string): string | null {
  const text = (rawText || "").trim();
  if (!text) return null;
  const match = text.match(/\[DIAGRAM:[\s\S]*?\]/i);
  if (match) return match[0];
  if (/^\[DIAGRAM:/i.test(text)) return `${text.replace(/\]*$/, "")}]`;
  if (text.length > 10) {
    const sanitized = text.replace(/[\[\]]/g, "").trim();
    return `[DIAGRAM: Economics Diagram | accuracy: ${sanitized}]`;
  }
  return null;
}

/** Parses a `[DIAGRAM: name | axes: ... | curves: ... | labels: ... | accuracy: ...]` tag. */
export function parseDiagramTag(tag: string): ParsedDiagramTag {
  const inner = tag
    .trim()
    .replace(/^\[DIAGRAM:\s*/i, "")
    .replace(/\]$/, "")
    .trim();
  const parts = inner.split("|").map((p) => p.trim()).filter(Boolean);
  const parsed: ParsedDiagramTag = {
    name: "Economics Diagram",
    axes: "",
    curves: "",
    labels: "",
    accuracy: "",
  };
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const kv = /^(axes|curves|labels|accuracy)\s*:\s*(.*)$/i.exec(part);
    if (kv) {
      const key = kv[1]!.toLowerCase() as keyof Omit<ParsedDiagramTag, "name">;
      parsed[key] = kv[2]!.trim();
    } else if (i === 0) {
      parsed.name = part;
    }
  }
  return parsed;
}

const DIAGRAM_ERROR_RE =
  /\b(error|incorrect|wrong|inverted|mislabel(?:led|ed)?|missing|swapped|unlabelled|unlabeled|opposite\s+direction|backwards?|flaw(?:ed)?)\b/i;

function pickRicherField(a: string, b: string): string {
  const cleanA = (a || "").trim();
  const cleanB = (b || "").trim();
  const aWeak = !cleanA || /^(none|n\/a|unlabelled|unlabeled|unknown)$/i.test(cleanA);
  const bWeak = !cleanB || /^(none|n\/a|unlabelled|unlabeled|unknown)$/i.test(cleanB);
  if (aWeak && !bWeak) return cleanB;
  if (bWeak && !aWeak) return cleanA;
  return cleanB.length > cleanA.length ? cleanB : cleanA;
}

/**
 * Reconciles Dual-VLM diagram readings (e.g. Google Gemini Vision + NVIDIA Super VL 120B)
 * into a single verified `[DIAGRAM: ...]` tag. Preserves the richer axis/curve/label details
 * AND retains any visual error/mislabelling flagged by either model.
 */
export function reconcileDiagramTags(
  primaryTag: string | null,
  secondaryTag: string | null,
): string | null {
  if (!primaryTag && !secondaryTag) return null;
  if (!primaryTag) return secondaryTag;
  if (!secondaryTag) return primaryTag;

  const p = parseDiagramTag(primaryTag);
  const s = parseDiagramTag(secondaryTag);

  const pHasErr = DIAGRAM_ERROR_RE.test(p.accuracy);
  const sHasErr = DIAGRAM_ERROR_RE.test(s.accuracy);
  const SHIFT_ERROR_RE = /\b(shift|direction|inverted|opposite|wrong\s+curve|backwards?)\b/i;
  const pHasShiftErr = SHIFT_ERROR_RE.test(p.accuracy);
  const sHasShiftErr = SHIFT_ERROR_RE.test(s.accuracy);

  const name = pickRicherField(p.name, s.name) || "Economics Diagram";
  const axes = pickRicherField(p.axes, s.axes) || "unlabelled";
  // If one pass caught an explicit curve-shift error, prefer its curve description so curves & accuracy never contradict
  const curves =
    pHasShiftErr && !sHasShiftErr && p.curves
      ? p.curves
      : sHasShiftErr && !pHasShiftErr && s.curves
        ? s.curves
        : pickRicherField(p.curves, s.curves) || "unspecified";
  const labels = pickRicherField(p.labels, s.labels) || "none";

  // Check shift-direction contradiction between the two VLMs
  const pLeft = /\bshifts?\s+(?:to\s+the\s+)?left\b|\binward\b/i.test(p.curves);
  const pRight = /\bshifts?\s+(?:to\s+the\s+)?right\b|\boutward\b/i.test(p.curves);
  const sLeft = /\bshifts?\s+(?:to\s+the\s+)?left\b|\binward\b/i.test(s.curves);
  const sRight = /\bshifts?\s+(?:to\s+the\s+)?right\b|\boutward\b/i.test(s.curves);
  const shiftContradiction = (pLeft && !pRight && sRight && !sLeft) || (pRight && !pLeft && sLeft && !sRight);

  let accuracy: string;
  if (pHasErr && sHasErr) {
    accuracy = p.accuracy.toLowerCase() === s.accuracy.toLowerCase()
      ? p.accuracy
      : `${p.accuracy}; cross-check: ${s.accuracy}`;
  } else if (pHasErr) {
    accuracy = p.accuracy;
  } else if (sHasErr) {
    accuracy = s.accuracy;
  } else {
    accuracy = pickRicherField(p.accuracy, s.accuracy) || "verified by dual-VLM inspection";
  }

  if (shiftContradiction) {
    accuracy = `${accuracy} (dual-VLM note: shift direction ambiguous — check curve arrow carefully)`.trim();
  }

  const compactAccuracy = accuracy.slice(0, 380);
  return `[DIAGRAM: ${name} | axes: ${axes} | curves: ${curves} | labels: ${labels} | accuracy: ${compactAccuracy}]`;
}

const ADVERSARIAL_AUDIT_SYSTEM_PROMPT = [
  "You are a strict Cambridge 9708 Economics Diagram Visual Auditor inspecting a student's economics diagram image.",
  "Carefully inspect the ACTUAL visual positions of the curves, arrowheads, axes, and equilibrium points — do NOT assume a shift is right just because the title says 'tax' or 'subsidy'!",
  "Check explicitly:",
  "1. Axis labels: Are both axes labelled accurately (e.g. Price / Quantity, Price Level / Real GDP)? Are they swapped or unlabelled?",
  "2. Curve shift direction: Visually compare curve 1 (e.g. S1, D1, AD1) to curve 2 (e.g. S2, D2, AD2) AND the arrowhead direction:",
  "   - Is curve 2 visually to the LEFT/UP or to the RIGHT/DOWN of curve 1?",
  "   - Does P2 sit ABOVE or BELOW P1? Does Q2 sit LEFT or RIGHT of Q1?",
  "   - Does that visual shift match economic theory for the titled policy (e.g. an indirect tax MUST shift supply LEFT/UP raising price and reducing quantity; a subsidy shifts supply RIGHT/DOWN)?",
  "Respond with a single structured tag and nothing else:",
  "[DIAGRAM: <diagram name> | axes: <exact axes shown> | curves: <exact visual shift direction e.g. 'S1 shifts right/down to S2'> | labels: <visible labels> | accuracy: <explicit factual verdict — state 'inverted' or 'wrong shift direction' clearly if the drawn arrow/curve violates theory>]",
].join("\n");

/**
 * Shared describe step once we already have the image as a data URL —
 * runs 100% on NVIDIA NIM (`nvidia/nemotron-3.5-super-vl-120b-a12b`, ZERO Gemini)
 * using Dual-Pass Parallel Cross-Verification:
 *   - Pass A (fast structural read, enableThinking=false, ~1.5s)
 *   - Pass B (deep visual shift/axis adversarial audit, enableThinking=true, ~3-5s)
 * Reconciles both readings so inverted curve shifts and mislabelled axes are caught reliably.
 */
export async function describeDiagramFromDataUrl(dataUrl: string): Promise<string> {
  const commaIndex = dataUrl.indexOf(",");
  const base64Length = commaIndex >= 0 ? dataUrl.length - commaIndex - 1 : dataUrl.length;
  const approxBytes = Math.floor((base64Length * 3) / 4);
  if (approxBytes > MAX_DATA_URL_BYTES) {
    throw new Error("That image is too large — please use an image under 8MB.");
  }

  const nvKeys = await resolveNvidiaVisionKeys();

  const runFastStructurePass = async (): Promise<string | null> => {
    try {
      if (nvKeys.length > 0) {
        const result = await visionChatViaNvidia({
          systemPrompt: SYSTEM_PROMPT,
          prompt: USER_PROMPT,
          imageDataUrls: [dataUrl],
          maxCompletionTokens: 800,
          temperature: 0.0,
          enableThinking: false,
          timeoutMs: 16_000,
          keys: nvKeys,
        });
        return extractDiagramTag(result.text);
      }
      const result = await visionChat({
        model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
        systemPrompt: SYSTEM_PROMPT,
        prompt: USER_PROMPT,
        imageDataUrls: [dataUrl],
        maxCompletionTokens: 800,
        feature: "diagram_describe_structure",
      });
      return extractDiagramTag(result.text);
    } catch {
      return null;
    }
  };

  const runDeepVisualAuditPass = async (): Promise<string | null> => {
    if (nvKeys.length === 0) return null;
    try {
      const result = await visionChatViaNvidia({
        systemPrompt: ADVERSARIAL_AUDIT_SYSTEM_PROMPT,
        prompt:
          "Visually verify the exact axis labels, curve positions (1 vs 2), arrow direction (left vs right), P1/P2 and Q1/Q2 positions, and economic accuracy of this diagram. Output only the [DIAGRAM: ...] tag.",
        imageDataUrls: [dataUrl],
        maxCompletionTokens: 2600,
        temperature: 0.0,
        enableThinking: true,
        timeoutMs: 25_000,
        keys: nvKeys,
      });
      return extractDiagramTag(result.text);
    } catch {
      return null;
    }
  };

  // Run fast structural read + deep visual error audit in parallel (100% NVIDIA NIM, ZERO Gemini!)
  const [structureTag, auditTag] = await Promise.all([
    runFastStructurePass(),
    runDeepVisualAuditPass(),
  ]);
  const reconciled = reconcileDiagramTags(structureTag, auditTag);
  if (reconciled) {
    return reconciled;
  }

  console.error("Diagram description failed on NVIDIA Super VL 120B");
  throw new Error("Couldn't make out a diagram in that image — try a clearer, closer photo.");
}

export async function describeDiagramFromUrl(url: string): Promise<string> {
  const dataUrl = await fetchAsDataUrl(url);
  return describeDiagramFromDataUrl(dataUrl);
}
