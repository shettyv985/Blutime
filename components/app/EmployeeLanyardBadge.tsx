"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

type EmployeeLanyardBadgeProps = {
  departmentName?: string | null;
  email: string;
  name: string;
  photoUrl?: string | null;
};

type CardData = {
  fullName: string;
  role: string;
  initials: string;
  image?: string | null;
};

type CardState = {
  angle: number;
  av: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type DragState = {
  active: boolean;
  lastX: number;
  lastY: number;
  ox: number;
  oy: number;
  pvx: number;
  pvy: number;
  smoothVx: number;
};

const CARD_IMAGES: Record<string, HTMLImageElement> = {};
const BASE_CW = 192;
const BASE_CH = 280;
const CR = 16;
const HOOK_H = 28;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizePhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return null;
  const trimmed = photoUrl.trim();
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const openMatch = trimmed.match(/[?&]id=([^&]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  if (trimmed.includes("drive.google.com") && openMatch?.[1])
    return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  return trimmed;
}

function loadImage(src: string) {
  if (CARD_IMAGES[src]) return;
  const img = new Image();
  img.onload = () => { CARD_IMAGES[src] = img; };
  img.onerror = () => { delete CARD_IMAGES[src]; };
  img.src = src;
}

function getScale(cssW: number) {
  const target = (cssW * 0.78) / BASE_CW;
  if (target >= 1) return 1;
  if (target < 0.58) return 0.58;
  return Math.round(target * 100) / 100;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStrap(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, hx: number, hy: number
) {
  const mx = (ax + hx) / 2;
  const sag = 20 + Math.abs(hx - ax) * 0.07;
  const by = ay + sag + Math.max(0, (hy - ay) * 0.15);

  ctx.save();
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(mx, by, hx, hy);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 25;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(mx, by, hx, hy);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 28;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(mx, by, hx, hy);
  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

function drawHook(
  ctx: CanvasRenderingContext2D,
  cx: number, cardTopY: number, scale: number
) {
  const hw = 14 * scale;
  const hh = HOOK_H * scale;
  const hx = cx - hw / 2;
  const hy = cardTopY - hh;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  const metalGradient = ctx.createLinearGradient(hx, hy, hx + hw, hy + hh);
  metalGradient.addColorStop(0, "#e5e7eb");
  metalGradient.addColorStop(0.3, "#ffffff");
  metalGradient.addColorStop(0.6, "#9ca3af");
  metalGradient.addColorStop(1, "#6b7280");

  roundedRect(ctx, hx, hy, hw, hh, 4);
  ctx.fillStyle = metalGradient;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  roundedRect(ctx, hx, hy, hw, hh, 4);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // rivet hole
  ctx.beginPath();
  ctx.arc(cx, hy + hh / 2, 2.8 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#6b7280";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - 0.8 * scale, hy + hh / 2 - 0.8 * scale, 1.2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fill();

  ctx.restore();
}

// Contain: show full image, letterbox with dark bg
function containImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number
) {
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let drawW = w;
  let drawH = h;
  let drawX = x;
  let drawY = y;

  if (imgAspect > boxAspect) {
    // image wider — fit width
    drawH = w / imgAspect;
    drawY = y + (h - drawH) / 2;
  } else {
    // image taller — fit height
    drawW = h * imgAspect;
    drawX = x + (w - drawW) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  card: CardData, scale: number
) {
  const cw = BASE_CW * scale;
  const ch = BASE_CH * scale;

  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.rotate(angle);

  const rx = -cw / 2;
  const ry = -ch / 2;

  // ── Card drop shadow (only physical depth, not decorative) ──
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundedRect(ctx, rx, ry, cw, ch, CR);
  ctx.fillStyle = "#191919";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // ── Card face: xAI canvas-card #191919 ──
  ctx.save();
  roundedRect(ctx, rx, ry, cw, ch, CR);
  ctx.clip();
  ctx.fillStyle = "#191919";
  ctx.fillRect(rx, ry, cw, ch);
  ctx.restore();

  // ── Photo area — fills the full card interior ──
  const pad = 10 * scale;
  const photoX = rx + pad;
  const photoY = ry + pad;
  const photoW = cw - pad * 2;
  const photoH = ch - pad * 2;

  ctx.save();
  roundedRect(ctx, photoX, photoY, photoW, photoH, 8);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(photoX, photoY, photoW, photoH);

  const loadedImg = card.image ? CARD_IMAGES[card.image] : undefined;
  if (loadedImg) {
    // ─────────────────────────────────────────────────────
    // IMAGE ZOOM — change this one number to resize the image
    //   1.0  = image fits exactly inside the frame (contain)
    //   1.12 = current: 12% larger (slight zoom, no hard crop)
    //   1.3  = noticeably zoomed in
    //   1.5+ = heavily zoomed, edges will be clipped by the frame
    // ─────────────────────────────────────────────────────
    const zoom = 0.80;
    const imgAspect = loadedImg.width / loadedImg.height;
    const boxAspect = photoW / photoH;
    let baseW: number, baseH: number, baseX: number, baseY: number;
    if (imgAspect > boxAspect) {
      baseH = photoH;
      baseW = photoH * imgAspect;
      baseX = photoX + (photoW - baseW) / 2;
      baseY = photoY;
    } else {
      baseW = photoW;
      baseH = photoW / imgAspect;
      baseX = photoX;
      baseY = photoY + (photoH - baseH) / 2;
    }
    const zW = baseW * zoom;
    const zH = baseH * zoom;
    const zX = photoX + (photoW - zW) / 2;
    const zY = photoY + (photoH - zH) / 2;
    ctx.drawImage(loadedImg, zX, zY, zW, zH);
  } else {
    // fallback silhouette on dark
    const centerX = photoX + photoW / 2;
    const headR = photoH * 0.17;
    const headY = photoY + photoH * 0.35;
    ctx.beginPath();
    ctx.arc(centerX, headY, headR, 0, Math.PI * 2);
    ctx.fillStyle = "#363a3f";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, photoY + photoH * 1.05, photoH * 0.44, Math.PI, 0);
    ctx.fillStyle = "#363a3f";
    ctx.fill();
  }
  ctx.restore();

  // photo area hairline border
  roundedRect(ctx, photoX, photoY, photoW, photoH, 8);
  ctx.strokeStyle = "#212327";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Outer card hairline border: #212327 ──
  roundedRect(ctx, rx, ry, cw, ch, CR);
  ctx.strokeStyle = "#212327";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

export function EmployeeLanyardBadge({ departmentName, name, photoUrl }: EmployeeLanyardBadgeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const scaleRef = useRef(1);
  const dprRef = useRef(1);
  const cssWRef = useRef(0);
  const cssHRef = useRef(0);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const stateRef = useRef<CardState>({
    angle: -0.08,
    av: 0.01,
    tx: 0,
    ty: 60,
    vx: -1,
    vy: 2,
    x: 0,
    y: 60,
  });
  const dragRef = useRef<DragState>({
    active: false,
    lastX: 0,
    lastY: 0,
    ox: 0,
    oy: 0,
    pvx: 0,
    pvy: 0,
    smoothVx: 0,
  });

  const card = useMemo<CardData>(() => {
    const image = normalizePhotoUrl(photoUrl);
    return {
      fullName: name.toUpperCase(),
      initials: initials(name),
      image,
      role: departmentName ?? "Team member",
    };
  }, [departmentName, name, photoUrl]);

  useEffect(() => {
    if (card.image) loadImage(card.image);
  }, [card.image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const currentCanvas = canvas;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;

      currentCanvas.width = Math.round(cssW * dpr);
      currentCanvas.height = Math.round(cssH * dpr);
      currentCanvas.style.width = `${cssW}px`;
      currentCanvas.style.height = `${cssH}px`;

      dprRef.current = dpr;
      cssWRef.current = cssW;
      cssHRef.current = cssH;
      scaleRef.current = getScale(cssW);

      const scale = scaleRef.current;
      const cw = BASE_CW * scale;
      const ch = BASE_CH * scale;
      const nextX = cssW / 2 - cw / 2;
      // card hangs at a comfortable mid-upper position
      const nextY = Math.max(48, Math.min(cssH - ch - 8, cssH * 0.22));
      const state = stateRef.current;

      if (!dragRef.current.active) {
        state.x = nextX;
        state.tx = nextX;
        state.y = nextY;
        state.ty = nextY;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (event: MouseEvent) => {
      const rect = currentCanvas.getBoundingClientRect();
      mouseRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onMouseLeave = () => { mouseRef.current = null; };
    const onTouchMove = (event: TouchEvent) => {
      const rect = currentCanvas.getBoundingClientRect();
      const touch = event.touches[0];
      mouseRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    currentCanvas.addEventListener("mousemove", onMouseMove);
    currentCanvas.addEventListener("mouseleave", onMouseLeave);
    currentCanvas.addEventListener("touchmove", onTouchMove, { passive: true });

    const gravity = 0.42;
    const damping = 0.8;
    const angularDamping = 0.84;
    const stiffness = 0.18;
    const maxStretch = 50;
    const maxAngle = 0.52;
    const magnetRadius = 260;
    const magnetLerp = 0.16;
    const magnetStrength = 0.52;
    const swingSpeed = 0.0009;
    const swingAmount = 12;

    // ── Shorter rope ──
    const ROPE_BASE = 80;

    function loop(ts: number) {
      const ctx = currentCanvas.getContext("2d");
      if (!ctx) return;

      const dpr = dprRef.current;
      const cssW = cssWRef.current;
      const cssH = cssHRef.current;
      const scale = scaleRef.current;
      const cw = BASE_CW * scale;
      const ch = BASE_CH * scale;
      const anchorX = cssW / 2;
      const anchorY = 0;
      // ── Reduced rope length ──
      const rope = Math.max(ROPE_BASE, Math.min(140, cssH * 0.35));
      const state = stateRef.current;
      const drag = dragRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      if (!drag.active) {
        const restX = anchorX - cw / 2 + Math.sin(ts * swingSpeed) * swingAmount;
        const restY = rope - ch / 2 + 36;
        let targetX = restX;
        let targetY = restY;
        const mouse = mouseRef.current;

        if (mouse) {
          const cardCx = state.x + cw / 2;
          const cardCy = state.y + ch / 2;
          const mdx = mouse.x - cardCx;
          const mdy = mouse.y - cardCy;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < magnetRadius) {
            const pull = (1 - mdist / magnetRadius) * magnetStrength;
            targetX = restX + mdx * pull;
            targetY = restY + mdy * pull;
          }
        }

        state.tx += (targetX - state.tx) * magnetLerp;
        state.ty += (targetY - state.ty) * magnetLerp;

        const topX = state.x + cw / 2;
        const topY = state.y - HOOK_H * scale;
        const dx = topX - anchorX;
        const dy = topY - anchorY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const maxDist = rope + maxStretch;

        if (dist > maxDist) {
          const distanceScale = maxDist / dist;
          state.x = anchorX + dx * distanceScale - cw / 2;
          state.y = anchorY + dy * distanceScale + HOOK_H * scale;
        }

        const diff = dist - rope;
        if (diff > 0) {
          state.vx -= (dx / dist) * diff * stiffness;
          state.vy -= (dy / dist) * diff * stiffness;
        }

        state.vx += (state.tx - state.x) * 0.12;
        state.vy += (state.ty - state.y) * 0.12;
        state.vy += gravity;
        state.vx *= damping;
        state.vy *= damping;

        const naturalAngle = (state.x + cw / 2 - anchorX) * 0.0045;
        state.av += (naturalAngle - state.angle) * 0.055;
        state.av *= angularDamping;
        const nextAngle = state.angle + state.av;
        if (nextAngle > maxAngle) {
          state.angle = maxAngle; state.av *= -0.3;
        } else if (nextAngle < -maxAngle) {
          state.angle = -maxAngle; state.av *= -0.3;
        } else {
          state.angle = nextAngle;
        }

        state.x += state.vx;
        state.y += state.vy;
      } else {
        drag.smoothVx += (drag.pvx - drag.smoothVx) * 0.18;
        const targetAngle = drag.smoothVx * 0.025;
        state.angle += (targetAngle - state.angle) * 0.12;
        state.tx = state.x;
        state.ty = state.y;
      }

      const maxY = cssH - ch - 8;
      if (state.y > maxY)  { state.y = maxY;        state.vy *= -0.25; }
      if (state.y < 18)    { state.y = 18;           state.vy *= -0.25; }
      if (state.x < -cw * 0.25) { state.x = -cw * 0.25; state.vx *= -0.28; }
      if (state.x > cssW - cw * 0.75) { state.x = cssW - cw * 0.75; state.vx *= -0.28; }

      ctx.save();
      ctx.translate(state.x + cw / 2, state.y + ch / 2);
      ctx.rotate(state.angle);
      drawStrap(ctx, anchorX - (state.x + cw / 2), anchorY - (state.y + ch / 2), 0, -ch / 2 - HOOK_H * scale);
      drawHook(ctx, 0, -ch / 2, scale);
      ctx.restore();
      drawCard(ctx, state.x, state.y, state.angle, card, scale);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      currentCanvas.removeEventListener("mousemove", onMouseMove);
      currentCanvas.removeEventListener("mouseleave", onMouseLeave);
      currentCanvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [card]);

  const hit = useCallback((mx: number, my: number) => {
    const scale = scaleRef.current;
    const cw = BASE_CW * scale;
    const ch = BASE_CH * scale;
    const state = stateRef.current;
    return mx > state.x && mx < state.x + cw && my > state.y && my < state.y + ch;
  }, []);

  const onDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      if (!hit(mx, my)) return;
      const state = stateRef.current;
      dragRef.current = {
        active: true, lastX: mx, lastY: my,
        ox: mx - state.x, oy: my - state.y,
        pvx: 0, pvy: 0, smoothVx: 0,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [hit],
  );

  const onMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !dragRef.current.active) return;
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const drag = dragRef.current;
    drag.pvx = mx - drag.lastX;
    drag.pvy = my - drag.lastY;
    drag.lastX = mx;
    drag.lastY = my;
    stateRef.current.x = mx - drag.ox;
    stateRef.current.y = my - drag.oy;
  }, []);

  const onUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag.active) return;
    stateRef.current.vx = drag.pvx * 0.9;
    stateRef.current.vy = drag.pvy * 0.9;
    stateRef.current.av = Math.max(-0.06, Math.min(0.06, drag.smoothVx * 0.012));
    drag.active = false;
  }, []);

  return (
    <div ref={wrapRef} className="employee-lanyard-wrapper" aria-label={`${name} ID lanyard`}>
      <div className="employee-lanyard-top-bar" />
      <canvas
        ref={canvasRef}
        className="employee-lanyard-canvas"
        onPointerCancel={onUp}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      />
    </div>
  );
}