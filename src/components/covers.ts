import type { Project } from "@/content/site";

export const COVER_W = 1280;
export const COVER_H = 720;

type Ctx = CanvasRenderingContext2D;

const round = (c: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

function website(c: Ctx, font: string) {
  c.fillStyle = "#ece8df";
  c.fillRect(0, 0, COVER_W, COVER_H);
  c.fillStyle = "#ffffff";
  round(c, 150, 70, 980, 650, 18);
  c.fill();
  c.fillStyle = "#1f1e21";
  round(c, 150, 70, 980, 54, 18);
  c.fill();
  c.fillRect(150, 100, 980, 24);
  ["#f4ce15", "#379777", "#8b8f8c"].forEach((col, i) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(186 + i * 30, 97, 9, 0, Math.PI * 2);
    c.fill();
  });
  c.fillStyle = "#1f1e21";
  c.font = `500 92px ${font}`;
  c.fillText("Best UX", 214, 262);
  c.fillText("of the year.", 214, 362);
  c.font = `400 26px ${font}`;
  c.fillStyle = "#6f716e";
  c.fillText("From UX process to Figma prototype", 216, 418);
  c.fillStyle = "#379777";
  round(c, 214, 462, 300, 68, 34);
  c.fill();
  c.fillStyle = "#ffffff";
  c.font = `500 26px ${font}`;
  c.fillText("Faculty Excellence", 248, 505);
  c.fillStyle = "#e3e0d8";
  [[760, 196, 300, 150], [760, 366, 142, 170], [918, 366, 142, 170]].forEach(([x, y, w, h]) => {
    round(c, x, y, w, h, 12);
    c.fill();
  });
}

function dating(c: Ctx, font: string) {
  const g = c.createLinearGradient(0, 0, COVER_W, COVER_H);
  g.addColorStop(0, "#6d2f47");
  g.addColorStop(1, "#c8604f");
  c.fillStyle = g;
  c.fillRect(0, 0, COVER_W, COVER_H);
  const screens: Array<[string, string, string]> = [
    ["Hello.", "What should we call you?", "Continue"],
    ["Who are", "you hoping to meet?", "Next"],
    ["Ready.", "One step at a time.", "Start"],
  ];
  screens.forEach(([big, small, cta], i) => {
    const x = 170 + i * 330;
    const y = 70 + (i === 1 ? -26 : 26);
    c.fillStyle = "#fff8f2";
    round(c, x, y, 280, 580, 38);
    c.fill();
    c.fillStyle = "#2a1820";
    c.font = `500 58px ${font}`;
    c.fillText(big, x + 28, y + 120);
    c.font = `400 27px ${font}`;
    c.fillText(small.slice(0, 16), x + 28, y + 178);
    c.fillText(small.slice(16), x + 28, y + 214);
    c.fillStyle = "#6d2f47";
    round(c, x + 28, y + 462, 224, 84, 22);
    c.fill();
    c.fillStyle = "#ffffff";
    c.font = `500 32px ${font}`;
    const w = c.measureText(cta).width;
    c.fillText(cta, x + 140 - w / 2, y + 516);
  });
}

function game(c: Ctx, font: string) {
  const g = c.createLinearGradient(0, 0, 0, COVER_H);
  g.addColorStop(0, "#1a7f8e");
  g.addColorStop(1, "#0a2a45");
  c.fillStyle = g;
  c.fillRect(0, 0, COVER_W, COVER_H);
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  c.fillStyle = "rgba(255,255,255,.26)";
  for (let i = 0; i < 46; i++) {
    c.beginPath();
    c.arc(rnd() * COVER_W, rnd() * COVER_H, 2 + rnd() * 9, 0, Math.PI * 2);
    c.fill();
  }
  const fish = (x: number, y: number, s: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(x, y, 76 * s, 38 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(x - 66 * s, y);
    c.lineTo(x - 124 * s, y - 36 * s);
    c.lineTo(x - 124 * s, y + 36 * s);
    c.closePath();
    c.fill();
    c.fillStyle = "#0a2a45";
    c.beginPath();
    c.arc(x + 44 * s, y - 8 * s, 6 * s, 0, Math.PI * 2);
    c.fill();
  };
  fish(280, 180, 1.2, "#f4ce15");
  fish(1020, 250, 0.9, "#ff8a5c");
  fish(240, 520, 0.8, "#7fe0c3");
  fish(1060, 560, 1.3, "#f4ce15");
  c.fillStyle = "rgba(255,255,255,.95)";
  round(c, 410, 210, 460, 300, 26);
  c.fill();
  c.fillStyle = "#0a2a45";
  c.font = `500 46px ${font}`;
  c.fillText("Catch the Fish", 462, 290);
  c.font = `400 26px ${font}`;
  c.fillText("Which answer is correct?", 462, 340);
  ["A", "B", "C"].forEach((l, i) => {
    c.fillStyle = i === 1 ? "#379777" : "#dcecef";
    round(c, 462 + i * 124, 380, 106, 86, 16);
    c.fill();
    c.fillStyle = i === 1 ? "#ffffff" : "#0a2a45";
    c.font = `500 40px ${font}`;
    c.fillText(l, 502 + i * 124, 438);
  });
}

function brand(c: Ctx, font: string) {
  c.fillStyle = "#0c0c0d";
  c.fillRect(0, 0, COVER_W, COVER_H);
  c.fillStyle = "#f0f2f0";
  c.font = `500 150px ${font}`;
  const w = c.measureText("4THECROWD").width;
  c.fillText("4THECROWD", COVER_W / 2 - w / 2, COVER_H / 2 + 52);
}

const painters: Record<Project["id"], (c: Ctx, font: string) => void> = { website, dating, game, brand };

export async function paintCover(id: Project["id"]) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const ctx = canvas.getContext("2d")!;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-inter-tight").trim();
  painters[id](ctx, family || "sans-serif");
  return canvas;
}
