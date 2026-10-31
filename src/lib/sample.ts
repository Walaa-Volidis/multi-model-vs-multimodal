// A built-in sample so anyone can run the race without hunting for files:
// a chart image plus a memo that contradicts it. Data is invented.
import type { RaceFile } from "./race";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const SIGNUPS = [420, 510, 640, 720, 690, 480];

const MEMO = `Q2 growth update (internal)

Sign-ups grew every single month this year and peaked in June.
April and May were strong, and June was our best month yet.
Recommendation: keep the current campaign budget unchanged.`;

export const SAMPLE_QUESTION = "Does the memo match the chart? Point out anything that doesn't add up.";

/** Draws the sign-up chart on a canvas and returns it as a PNG. */
async function chartPng(): Promise<RaceFile> {
  const w = 900;
  const h = 520;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#111827";
  ctx.font = "600 26px sans-serif";
  ctx.fillText("Monthly sign-ups, Jan–Jun 2026", 48, 56);

  const left = 90;
  const bottom = h - 70;
  const top = 100;
  const max = 800;
  const barW = 90;
  const gap = (w - left - 40 - barW * MONTHS.length) / (MONTHS.length - 1);

  // Grid + y labels
  ctx.font = "16px sans-serif";
  ctx.textAlign = "right";
  for (let v = 0; v <= max; v += 200) {
    const y = bottom - (v / max) * (bottom - top);
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(w - 40, y);
    ctx.stroke();
    ctx.fillStyle = "#6b7280";
    ctx.fillText(String(v), left - 12, y + 5);
  }

  // Bars + values + month labels
  ctx.textAlign = "center";
  SIGNUPS.forEach((v, i) => {
    const x = left + i * (barW + gap);
    const barH = (v / max) * (bottom - top);
    ctx.fillStyle = "#4f46e5";
    ctx.fillRect(x, bottom - barH, barW, barH);
    ctx.fillStyle = "#111827";
    ctx.font = "600 17px sans-serif";
    ctx.fillText(String(v), x + barW / 2, bottom - barH - 10);
    ctx.fillStyle = "#374151";
    ctx.font = "17px sans-serif";
    ctx.fillText(MONTHS[i], x + barW / 2, bottom + 28);
  });

  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  const data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(blob);
  });
  return { name: "signups-chart.png", mediaType: "image/png", data, size: blob.size };
}

function memoFile(): RaceFile {
  const bytes = new TextEncoder().encode(MEMO);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return { name: "q2-memo.txt", mediaType: "text/plain", data: btoa(binary), size: bytes.length };
}

export async function loadSample(): Promise<{ question: string; files: RaceFile[] }> {
  return { question: SAMPLE_QUESTION, files: [await chartPng(), memoFile()] };
}
