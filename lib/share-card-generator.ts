import { nim } from "@/lib/message";

export type ExperimentType = "split" | "trust" | "ultimatum";
export type ShareType = "result" | "invite";

export interface SplitResultData {
  give: number; // luna
  stake: number; // luna
  givePct: number;
  predict: number; // percent
  benchmark: number; // percent
  gap: number;
  mode?: "house" | "self";
  session?: string;
}

export interface TrustResultData {
  stake: number; // luna
  pot: number; // luna
  returned: number; // luna
  returnPct: number;
  predictPct: number;
  expectedPct?: number;
  role: "a" | "b";
  tier: string;
  verdict?: string;
  settlementHash?: string | null;
}

export interface UltimatumResultData {
  stake: number; // luna
  offer: number; // luna
  offerPct: number;
  thresholdPct: number;
  yourGuess: number;
  accepted: boolean;
  role: "a" | "b";
  payoffA: number;
  payoffB: number;
  tier: string;
  verdict?: string;
  settlementHash?: string | null;
}

export interface InviteData {
  experiment: ExperimentType;
  stake?: number;
  waiting?: number;
  id?: string;
  path: string;
}

export interface ShareCardPayload {
  shareType: ShareType;
  experiment: ExperimentType;
  url: string;
  splitData?: SplitResultData;
  trustData?: TrustResultData;
  ultimatumData?: UltimatumResultData;
  inviteData?: InviteData;
}

const COLORS = {
  paper: "#12110e",
  card: "#181612",
  cardInner: "#1f1d17",
  border: "#2e2920",
  borderSubtle: "#242018",
  ink: "#efe2c9",
  inkSoft: "#c8bc9f",
  inkFaint: "#877d67",
  splitAccent: "#e2823f",
  trustAccent: "#4eb075",
  ultimatumAccent: "#e2724f",
  highlight: "#ffd84d",
  hlInk: "#171614",
};

function getExperimentAccent(exp: ExperimentType): string {
  switch (exp) {
    case "split":
      return COLORS.splitAccent;
    case "trust":
      return COLORS.trustAccent;
    case "ultimatum":
      return COLORS.ultimatumAccent;
  }
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth: number = 2
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawHunchDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + radius, cy);
  ctx.lineTo(cx, cy + radius);
  ctx.lineTo(cx - radius, cy);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, Math.round(radius * 0.16));
  ctx.stroke();

  // Top-right solid triangle (Hunch signature mark)
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + radius, cy);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
}

/**
 * Renders the 1080 x 1350 canvas share card.
 */
export async function generateShareCardBlob(
  payload: ShareCardPayload
): Promise<{ blob: Blob; dataUrl: string; file: File }> {
  if (typeof document === "undefined") {
    throw new Error("Canvas generation requires browser environment.");
  }

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Font loading error ignore
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  const { shareType, experiment } = payload;
  const accentColor = getExperimentAccent(experiment);

  // 1. Canvas Base Background
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, 1080, 1350);

  // Subtle background glow around edges
  const bgGrad = ctx.createRadialGradient(540, 675, 200, 540, 675, 750);
  bgGrad.addColorStop(0, "#191712");
  bgGrad.addColorStop(1, "#100f0c");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1350);

  // 2. Main Card Frame
  const cardX = 64;
  const cardY = 64;
  const cardW = 952;
  const cardH = 1222;
  const cardR = 36;
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR, COLORS.card, COLORS.border, 2.5);

  // 3. Header: Brand mark + Experiment Name Badge
  const headerY = 145;
  drawHunchDiamond(ctx, cardX + 54, headerY - 2, 22, COLORS.ink);

  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 36px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("HUNCH", cardX + 90, headerY);

  // Right-aligned Experiment Badge
  const expLabel = experiment.toUpperCase();
  ctx.font = "700 24px 'Public Sans', system-ui, -apple-system, sans-serif";
  const expMetrics = ctx.measureText(expLabel);
  const badgeW = expMetrics.width + 36;
  const badgeH = 44;
  const badgeX = cardX + cardW - badgeW - 48;
  const badgeY = headerY - badgeH / 2;

  drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12, undefined, accentColor, 2);
  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.fillText(expLabel, badgeX + badgeW / 2, headerY + 1);

  // Header Divider
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 48, headerY + 48);
  ctx.lineTo(cardX + cardW - 48, headerY + 48);
  ctx.stroke();

  // 4. Body Content Rendering
  if (shareType === "invite") {
    renderInviteCard(ctx, payload, cardX, cardY, cardW, cardH, accentColor);
  } else {
    renderResultCard(ctx, payload, cardX, cardY, cardW, cardH, accentColor);
  }

  // 5. Card Footer: URL + subtle tagline
  const footerY = cardY + cardH - 68;
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 48, footerY - 32);
  ctx.lineTo(cardX + cardW - 48, footerY - 32);
  ctx.stroke();

  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "600 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const displayHost = payload.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  ctx.fillText(displayHost, cardX + 48, footerY);

  ctx.textAlign = "right";
  ctx.fillText("Can you predict people?", cardX + cardW - 48, footerY);

  // 6. Produce Blob, DataURL, and File
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas blob conversion failed"));
    }, "image/png");
  });

  const filename = `hunch-${experiment}-${shareType}-${Date.now()}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  return { blob, dataUrl, file };
}

/**
 * Render an Invitation Share Card (Section 5 requirement).
 * NEVER shows results, predictions, outcomes, or settlement.
 */
function renderInviteCard(
  ctx: CanvasRenderingContext2D,
  payload: ShareCardPayload,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  accentColor: string
) {
  const contentX = cardX + 54;
  const maxW = cardW - 108;

  // Eyebrow
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("YOU'VE BEEN INVITED TO MAKE A DECISION", contentX, cardY + 240);

  // Huge Title
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 76px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  const expTitle =
    payload.experiment === "split"
      ? "Split."
      : payload.experiment === "trust"
      ? "Trust."
      : "Ultimatum.";
  ctx.fillText(expTitle, contentX, cardY + 285);

  // Tagline under title
  ctx.fillStyle = accentColor;
  ctx.font = "700 36px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  const tagline =
    payload.experiment === "split"
      ? "What would you keep?"
      : payload.experiment === "trust"
      ? "Hand it over, or keep it?"
      : "Offer a share, or lose it all?";
  ctx.fillText(tagline, contentX, cardY + 385);

  // Main Explanation Card Box
  const boxY = cardY + 465;
  const boxH = 340;
  drawRoundRect(ctx, contentX, boxY, maxW, boxH, 20, COLORS.cardInner, COLORS.border, 2);

  ctx.fillStyle = COLORS.ink;
  ctx.font = "400 32px/1.55 'Public Sans', system-ui, -apple-system, sans-serif";

  let explanation = "";
  if (payload.experiment === "split") {
    explanation =
      "Someone was given real NIM and decided how much to pass on. That turned out to be you. " +
      "Decide what to keep for yourself and what to pass on to the next person.";
  } else if (payload.experiment === "trust") {
    explanation =
      "A stranger is trusting you with real NIM that tripled in your hands. " +
      "How much comes back to them is entirely your call, and keeping all of it costs you nothing.";
  } else {
    explanation =
      "A stranger is offering you a share of real NIM. " +
      "You set the least you'll accept before you see what they offered. " +
      "If their offer falls below your line, neither of you gets anything.";
  }

  drawWrappedText(ctx, explanation, contentX + 36, boxY + 48, maxW - 72, 48);

  // Prominent CTA Button Box
  const ctaY = cardY + 860;
  const ctaW = maxW;
  const ctaH = 92;
  drawRoundRect(ctx, contentX, ctaY, ctaW, ctaH, 18, accentColor, undefined);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 34px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PLAY THIS HUNCH →", contentX + ctaW / 2, ctaY + ctaH / 2);

  // Subtext under CTA
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 24px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(
    "Played with real NIM · No app install required to view",
    contentX + ctaW / 2,
    ctaY + ctaH + 50
  );
}

/**
 * Render a Completed Result Share Card (Section 3, 4, 8, 9, 10).
 */
function renderResultCard(
  ctx: CanvasRenderingContext2D,
  payload: ShareCardPayload,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  accentColor: string
) {
  const contentX = cardX + 54;
  const maxW = cardW - 108;

  if (payload.experiment === "split") {
    renderSplitResult(ctx, payload.splitData, contentX, cardY, maxW);
  } else if (payload.experiment === "trust") {
    renderTrustResult(ctx, payload.trustData, contentX, cardY, maxW);
  } else if (payload.experiment === "ultimatum") {
    renderUltimatumResult(ctx, payload.ultimatumData, contentX, cardY, maxW);
  }
}

/**
 * Split Result Card (Section 8)
 */
function renderSplitResult(
  ctx: CanvasRenderingContext2D,
  data: SplitResultData | undefined,
  contentX: number,
  cardY: number,
  maxW: number
) {
  const give = data?.give ?? 0;
  const givePct = data?.givePct ?? 0;
  const predict = data?.predict ?? 0;
  const benchmark = data?.benchmark ?? 31;
  const gap = data?.gap ?? 0;

  // Headline
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 54px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Passed on ${givePct}% of the stake`, contentX, cardY + 230);

  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 28px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(`Decided over ${nim(data?.stake ?? 0)} NIM with a stranger.`, contentX, cardY + 298);

  // Section 1: 2-column stats box
  const box1Y = cardY + 365;
  const colW = (maxW - 24) / 2;
  const colH = 175;

  // Box Left: Your Call
  drawRoundRect(ctx, contentX, box1Y, colW, colH, 18, COLORS.cardInner, COLORS.border, 2);
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText("YOUR DECISION", contentX + 28, box1Y + 28);
  ctx.fillStyle = COLORS.splitAccent;
  ctx.font = "800 42px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.fillText(`${nim(give)} NIM`, contentX + 28, box1Y + 64);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(`Kept ${100 - givePct}% for self`, contentX + 28, box1Y + 118);

  // Box Right: Your Prediction
  const col2X = contentX + colW + 24;
  drawRoundRect(ctx, col2X, box1Y, colW, colH, 18, COLORS.cardInner, COLORS.border, 2);
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText("YOUR HUNCH", col2X + 28, box1Y + 28);
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 42px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.fillText(`${predict}%`, col2X + 28, box1Y + 64);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText("Predicted human average", col2X + 28, box1Y + 118);

  // Section 2: Full-width Comparison Box
  const box2Y = box1Y + colH + 24;
  const box2H = 240;
  drawRoundRect(ctx, contentX, box2Y, maxW, box2H, 18, COLORS.cardInner, COLORS.border, 2);

  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText("HOW CLOSE WAS YOUR HUNCH?", contentX + 32, box2Y + 28);

  ctx.fillStyle = COLORS.ink;
  ctx.font = "700 32px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  const verdictText =
    Math.abs(gap) <= 3
      ? "Almost exactly right against published research."
      : gap < 0
      ? `You were ${Math.abs(gap)} points low. You thought people were stingier than they are.`
      : `You were ${Math.abs(gap)} points high. You thought people were more generous than they are.`;
  drawWrappedText(ctx, verdictText, contentX + 32, box2Y + 68, maxW - 64, 42);

  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "500 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(
    `Research average: ${benchmark}% given (Engel 2011 meta-analysis across 20,000+ participants)`,
    contentX + 32,
    box2Y + 185
  );

  // Challenge Banner at Bottom
  const bannerY = cardY + 855;
  drawRoundRect(ctx, contentX, bannerY, maxW, 120, 18, "#251c14", COLORS.splitAccent, 2);
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 34px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Think you can predict people better?", contentX + maxW / 2, bannerY + 60);
}

/**
 * Trust Result Card (Section 9)
 */
function renderTrustResult(
  ctx: CanvasRenderingContext2D,
  data: TrustResultData | undefined,
  contentX: number,
  cardY: number,
  maxW: number
) {
  const stake = data?.stake ?? 0;
  const pot = data?.pot ?? stake * 3;
  const returned = data?.returned ?? 0;
  const returnPct = data?.returnPct ?? 0;
  const predictPct = data?.predictPct ?? 0;
  const role = data?.role ?? "a";
  const tier = data?.tier ?? (returnPct >= 40 ? "A good-faith return." : "Ice cold.");

  // Big Verdict Headline
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 52px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(tier, contentX, cardY + 230);

  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 28px 'Public Sans', system-ui, -apple-system, sans-serif";
  const contextLine =
    role === "a"
      ? `Trusted a stranger with ${nim(stake)} NIM. Tripled to ${nim(pot)} NIM.`
      : `A stranger trusted me with ${nim(stake)} NIM, which tripled in my hands.`;
  ctx.fillText(contextLine, contentX, cardY + 298);

  // 2-column metrics
  const box1Y = cardY + 365;
  const colW = (maxW - 24) / 2;
  const colH = 175;

  // Box Left: What was returned
  drawRoundRect(ctx, contentX, box1Y, colW, colH, 18, COLORS.cardInner, COLORS.border, 2);
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(role === "a" ? "WHAT CAME BACK" : "YOU SENT BACK", contentX + 28, box1Y + 28);
  ctx.fillStyle = COLORS.trustAccent;
  ctx.font = "800 42px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.fillText(`${returnPct}%`, contentX + 28, box1Y + 64);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(`${nim(returned)} NIM of the pot`, contentX + 28, box1Y + 118);

  // Box Right: Prediction
  const col2X = contentX + colW + 24;
  drawRoundRect(ctx, col2X, box1Y, colW, colH, 18, COLORS.cardInner, COLORS.border, 2);
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(role === "a" ? "YOUR HUNCH" : "THEIR HOPE", col2X + 28, box1Y + 28);
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 42px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.fillText(`${predictPct}%`, col2X + 28, box1Y + 64);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(role === "a" ? "Expected return" : "What they hoped for", col2X + 28, box1Y + 118);

  // Full-width comparison
  const box2Y = box1Y + colH + 24;
  const box2H = 240;
  drawRoundRect(ctx, contentX, box2Y, maxW, box2H, 18, COLORS.cardInner, COLORS.border, 2);
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText("READING THE STRANGER", contentX + 32, box2Y + 28);

  ctx.fillStyle = COLORS.ink;
  ctx.font = "700 32px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  const compText =
    data?.verdict ??
    (Math.abs(returnPct - predictPct) <= 10
      ? "Pretty close to your prediction. You read their reciprocity well."
      : returnPct < predictPct
      ? "They returned less than you hoped for. Trust was tested."
      : "They returned more than you expected. Genuinely generous.");
  drawWrappedText(ctx, compText, contentX + 32, box2Y + 68, maxW - 64, 42);

  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "500 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(
    "Research average: 37% returned across 1,500+ participants (Berg et al. 1995 / Johnson 2011)",
    contentX + 32,
    box2Y + 185
  );

  // Challenge Banner at Bottom
  const bannerY = cardY + 855;
  drawRoundRect(ctx, contentX, bannerY, maxW, 120, 18, "#15241b", COLORS.trustAccent, 2);
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 34px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    role === "a" ? "Could you have read them?" : "What would you have done?",
    contentX + maxW / 2,
    bannerY + 60
  );
}

/**
 * Ultimatum Result Card (Section 1, 10, 12)
 * Correctly renders the fixed "YOU BOTH GET 0 NIM" state with clean yellow accent lines.
 */
function renderUltimatumResult(
  ctx: CanvasRenderingContext2D,
  data: UltimatumResultData | undefined,
  contentX: number,
  cardY: number,
  maxW: number
) {
  const stake = data?.stake ?? 0;
  const offer = data?.offer ?? 0;
  const offerPct = data?.offerPct ?? 0;
  const thresholdPct = data?.thresholdPct ?? 0;
  const yourGuess = data?.yourGuess ?? 0;
  const accepted = data?.accepted ?? false;
  const payoffA = data?.payoffA ?? 0;
  const payoffB = data?.payoffB ?? 0;
  const role = data?.role ?? "a";

  if (accepted) {
    // Accepted Deal
    ctx.fillStyle = COLORS.ink;
    ctx.font = "800 52px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("DEAL ACCEPTED", contentX, cardY + 230);

    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = "500 28px 'Public Sans', system-ui, -apple-system, sans-serif";
    ctx.fillText(
      `Offer of ${offerPct}% cleared the ${thresholdPct}% minimum.`,
      contentX,
      cardY + 298
    );
  } else {
    // REJECTED DEAL: URGENT YELLOW-LINE ACCENT FRAME AROUND "YOU BOTH GET 0 NIM"
    const frameY = cardY + 235;

    ctx.font = "800 44px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
    const textStr = "YOU BOTH GET 0 NIM";
    const textWidth = ctx.measureText(textStr).width;
    const spacing = 32;
    const availableLineWidth = (maxW - textWidth - spacing * 2) / 2;
    const lineY = frameY + 24;

    // Left Yellow Accent Line
    ctx.strokeStyle = COLORS.highlight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(contentX, lineY);
    ctx.lineTo(contentX + availableLineWidth, lineY);
    ctx.stroke();

    // Centered Ivory Text
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(textStr, contentX + maxW / 2, lineY);

    // Right Yellow Accent Line
    ctx.beginPath();
    ctx.moveTo(contentX + maxW - availableLineWidth, lineY);
    ctx.lineTo(contentX + maxW, lineY);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = "500 26px 'Public Sans', system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(
      `Offer of ${offerPct}% fell short of what was accepted (${thresholdPct}%). Deal failed.`,
      contentX,
      cardY + 302
    );
  }

  // 2-column metrics
  const box1Y = cardY + 365;
  const colW = (maxW - 24) / 2;
  const colH = 175;

  // Box Left: The Offer
  drawRoundRect(ctx, contentX, box1Y, colW, colH, 18, COLORS.cardInner, COLORS.border, 2);
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(role === "a" ? "YOUR OFFER" : "THEIR OFFER", contentX + 28, box1Y + 28);
  ctx.fillStyle = COLORS.ultimatumAccent;
  ctx.font = "800 42px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.fillText(`${offerPct}%`, contentX + 28, box1Y + 64);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(`${nim(offer)} NIM of ${nim(stake)} NIM`, contentX + 28, box1Y + 118);

  // Box Right: Minimum Line
  const col2X = contentX + colW + 24;
  drawRoundRect(ctx, col2X, box1Y, colW, colH, 18, COLORS.cardInner, COLORS.border, 2);
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText(role === "a" ? "THEIR LINE" : "YOUR LINE", col2X + 28, box1Y + 28);
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 42px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.fillText(`${thresholdPct}%`, col2X + 28, box1Y + 64);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 22px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText("Minimum acceptable share", col2X + 28, box1Y + 118);

  // Full-width outcome breakdown
  const box2Y = box1Y + colH + 24;
  const box2H = 240;
  drawRoundRect(ctx, contentX, box2Y, maxW, box2H, 18, COLORS.cardInner, COLORS.border, 2);

  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = "700 20px 'Public Sans', system-ui, -apple-system, sans-serif";
  ctx.fillText("FINAL SETTLEMENT & HUMAN INSIGHT", contentX + 32, box2Y + 28);

  ctx.fillStyle = COLORS.ink;
  ctx.font = "700 30px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  const outcomeText = accepted
    ? `Settled: You received ${nim(payoffA)} NIM, they received ${nim(payoffB)} NIM.`
    : `Zero payout: Both walked away with 0 NIM rather than take an offer perceived as unfair.`;
  ctx.fillText(outcomeText, contentX + 32, box2Y + 70);

  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "400 24px/1.45 'Public Sans', system-ui, -apple-system, sans-serif";
  const noteText =
    "In economic experiments worldwide, people routinely reject offers under 30%, " +
    "choosing to lose money rather than accept an unfair deal (Güth et al. 1982).";
  drawWrappedText(ctx, noteText, contentX + 32, box2Y + 124, maxW - 64, 36);

  // Challenge Banner
  const bannerY = cardY + 855;
  drawRoundRect(ctx, contentX, bannerY, maxW, 120, 18, "#281b16", COLORS.ultimatumAccent, 2);
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 34px 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    role === "a" ? "Could you have read them?" : "Would you have taken it?",
    contentX + maxW / 2,
    bannerY + 60
  );
}

/**
 * Downloads a Blob as a file in the browser.
 */
export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
