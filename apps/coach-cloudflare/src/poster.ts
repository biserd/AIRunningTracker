export type PosterEvidence = {
  totalRuns: number;
  totalKm: number;
  from?: string;
  to?: string;
};

export function posterStats(data: PosterEvidence) {
  if (!Number.isInteger(data.totalRuns) || data.totalRuns < 0 ||
      !Number.isFinite(data.totalKm) || data.totalKm < 0) {
    throw new Error("The running summary is unavailable. Please try again.");
  }
  const number = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
  const date = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(value + "T12:00:00Z");
    return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    }).format(parsed) : null;
  };
  const from = date(data.from), to = date(data.to);
  return {
    distance: number(data.totalKm),
    runs: number(data.totalRuns),
    average: data.totalRuns ? number(data.totalKm / data.totalRuns) : "N/A",
    period: from && to ? `${from} to ${to}` : "Available activity history",
  };
}

/** Typography and statistics stay deterministic, separate from generated artwork. */
export async function renderPoster(imageUrl: string, evidence: PosterEvidence) {
  const stats = posterStats(evidence);
  const image = new Image();
  image.src = imageUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  canvas.height = 1800;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the download.");
  const ctx: CanvasRenderingContext2D = context;
  const ink = "#173d36", paper = "#f4f1e8", muted = "#61726a", orange = "#db552e";
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 1440, 1800);
  function text(value: string, x: number, y: number, size: number, color = ink, weight = "400", maxWidth = 1280) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    ctx.fillText(value, x, y, maxWidth);
  }
  function line(y: number) {
    ctx.fillStyle = "#cbd0c4";
    ctx.fillRect(80, y, 1280, 2);
  }
  text("AITracker", 80, 100, 32, ink, "700");
  ctx.textAlign = "right";
  text("THE RUNNING JOURNAL / 01", 1360, 100, 22, muted, "700");
  ctx.textAlign = "left";
  line(136);
  text("YOUR DISTANCE. YOUR STORY.", 80, 204, 23, orange, "700");
  ctx.font = "92px Georgia, serif";
  ctx.fillStyle = ink;
  ctx.fillText("Every run adds up.", 74, 313);
  text(stats.period, 80, 368, 26, muted);

  // A deliberate panoramic crop leaves the quantitative recap in its own quiet space.
  const cropHeight = image.width * (480 / 1280);
  const sourceHeight = Math.min(cropHeight, image.height);
  ctx.drawImage(image, 0, (image.height - sourceHeight) / 2,
    image.width, sourceHeight, 80, 418, 1280, 480);
  ctx.fillStyle = orange;
  ctx.fillRect(80, 898, 90, 7);

  text("DISTANCE COVERED", 80, 982, 23, muted, "700");
  text(stats.distance, 70, 1190, 208, ink, "700", 950);
  ctx.textAlign = "right";
  text("KILOMETRES", 1360, 1176, 27, ink, "700");
  ctx.textAlign = "left";
  line(1230);
  text("RUNS LOGGED", 80, 1293, 23, muted, "700");
  text(stats.runs, 76, 1410, 100, ink, "700", 540);
  ctx.fillStyle = "#cbd0c4";
  ctx.fillRect(719, 1270, 2, 180);
  text("AVERAGE RUN", 790, 1293, 23, muted, "700");
  text(stats.average, 786, 1410, 100, ink, "700", 420);
  text("km", 1250, 1408, 30, muted);
  line(1485);
  text("Small efforts. A story worth keeping.", 80, 1570, 34);
  text("Totals reflect the available activity history, not a performance rating.", 80, 1620, 23, muted);
  ctx.fillStyle = ink;
  ctx.fillRect(0, 1690, 1440, 110);
  text("FICTIONAL SAMPLE DATA", 80, 1755, 23, paper, "700");
  ctx.textAlign = "right";
  text("AI-generated artwork · new.aitracker.run", 1360, 1755, 23, paper);
  return canvas.toDataURL("image/png");
}
