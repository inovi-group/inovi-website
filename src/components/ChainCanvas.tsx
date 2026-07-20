"use client";

import { useEffect, useRef } from "react";

const HEX = "0123456789abcdef";

function randomHash(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}

/** Subtle animated hash-chain: linked blocks committing new records. */
export function ChainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const styles = () => {
      const cs = getComputedStyle(document.documentElement);
      return {
        line: cs.getPropertyValue("--color-line").trim() || "#1f2735",
        accent: cs.getPropertyValue("--color-accent").trim() || "#4593ff",
        muted: cs.getPropertyValue("--color-dim").trim() || "#5c6678",
      };
    };

    const BLOCK_W = 118;
    const BLOCK_H = 44;
    const GAP = 46;
    const SPEED = 0.35;

    type Block = { hash: string; born: number };
    const blocks: Block[] = Array.from({ length: 12 }, () => ({
      hash: randomHash(10),
      born: 1,
    }));
    let offset = 0;

    const draw = () => {
      const { line, accent, muted } = styles();
      ctx.clearRect(0, 0, width, height);
      const cy = height / 2;
      const total = BLOCK_W + GAP;

      offset += SPEED;
      if (offset >= total) {
        offset -= total;
        blocks.shift();
        blocks.push({ hash: randomHash(10), born: 0 });
      }

      ctx.font = "10px var(--font-jbmono), monospace";
      ctx.textBaseline = "middle";

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.born < 1) b.born = Math.min(1, b.born + 0.02);
        const x = width - (i + 1) * total + offset + total;
        if (x + BLOCK_W < -total || x > width + total) continue;

        const isHead = i === blocks.length - 1;
        const alpha = b.born * (0.25 + 0.55 * (x / width));

        // link line
        if (i > 0) {
          ctx.strokeStyle = line;
          ctx.globalAlpha = Math.min(alpha + 0.1, 0.8);
          ctx.beginPath();
          ctx.moveTo(x + BLOCK_W, cy);
          ctx.lineTo(x + BLOCK_W + GAP, cy);
          ctx.stroke();
          // chain dot
          ctx.fillStyle = isHead ? accent : muted;
          ctx.beginPath();
          ctx.arc(x + BLOCK_W + GAP / 2, cy, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // block
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = isHead ? accent : line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, cy - BLOCK_H / 2, BLOCK_W, BLOCK_H, 8);
        ctx.stroke();

        // hash text
        ctx.fillStyle = isHead ? accent : muted;
        ctx.fillText(`#${b.hash}`, x + 12, cy - 8);
        ctx.fillStyle = muted;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillText(`← ${i > 0 ? blocks[i - 1].hash.slice(0, 6) : "genesis"}`, x + 12, cy + 8);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="h-24 w-full opacity-80 sm:h-28"
    />
  );
}
