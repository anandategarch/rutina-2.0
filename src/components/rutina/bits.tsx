"use client";

import { useEffect, useRef, useState } from "react";
import { animate, createTimeline, stagger, utils } from "animejs";
import { motion, useMotionValueEvent, useSpring } from "motion/react";

import { cn } from "@/lib/utils";
import { CATEGORY_META, HabitIcon, type Category } from "@/lib/rutina";

/* ---------- Angka pegas (Motion) ---------- */

export function SpringNumber({
  value,
  format,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const fmt = format ?? ((n: number) => n.toLocaleString("id-ID"));
  const spring = useSpring(value, { stiffness: 80, damping: 16 });
  const [label, setLabel] = useState(() => fmt(value));

  useMotionValueEvent(spring, "change", (v) =>
    setLabel(fmt(Math.round(v)))
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <span className={cn("tabular-nums", className)}>{label}</span>;
}

/* ---------- Centang tergambar (anime.js) ---------- */

export function CheckDraw({
  done,
  className,
}: {
  done: boolean;
  className?: string;
}) {
  const ref = useRef<SVGPathElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    if (!mounted.current) {
      p.style.strokeDashoffset = `${len}`;
      mounted.current = true;
      if (!done) return;
    }
    const anim = animate(p, {
      strokeDashoffset: done ? 0 : len,
      duration: done ? 420 : 200,
      ease: "outQuad",
    });
    return () => {
      anim.revert();
    };
  }, [done]);

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        ref={ref}
        d="M20 6 L9 17 L4 12"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Tanaman SVG yang tumbuh (anime.js) ---------- */

const PLANT_PATHS: [string[], string[], string[], string[]] = [
  [
    "M46 79 Q50 72 54 79 Q50 84 46 79",
    "M50 72 Q52 68 56 66",
  ],
  [
    "M50 82 Q49 72 50 60",
    "M50 68 Q39 66 35 57 Q47 55 50 63",
    "M50 68 Q61 66 65 57 Q53 55 50 63",
  ],
  [
    "M50 82 Q50 68 50 46",
    "M50 72 Q38 70 34 60 Q46 58 50 66",
    "M50 60 Q62 58 66 48 Q54 46 50 54",
    "M50 50 Q41 48 38 40 Q47 38 50 46",
  ],
  [
    "M50 82 Q50 62 50 38",
    "M50 72 Q38 70 34 60 Q46 58 50 66",
    "M50 60 Q62 58 66 48 Q54 46 50 54",
    "M50 50 Q41 48 38 40 Q47 38 50 46",
    "M43 34 Q42 21 47 26 Q48 21 50 17 Q52 21 53 26 Q58 21 57 34 Q50 38 43 34 Z",
  ],
];

export function PlantSVG({
  stage,
  flower,
  drawKey,
  className,
}: {
  stage: 0 | 1 | 2 | 3;
  flower: string;
  drawKey: string;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const strokes = Array.from(
      svg.querySelectorAll<SVGPathElement>(".p-stroke")
    );
    const fills = Array.from(
      svg.querySelectorAll<SVGGeometryElement>(".p-fill")
    );
    const flowerEl = svg.querySelector<SVGPathElement>(".p-flower");
    if (strokes.length === 0) return;

    strokes.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
    });
    fills.forEach((f) => {
      f.style.opacity = "0";
    });
    if (flowerEl) flowerEl.style.opacity = "0";

    const tl = createTimeline({ defaults: { ease: "inOutSine" } });
    tl.add(
      strokes,
      { strokeDashoffset: 0, duration: 620, delay: stagger(120) },
      0
    ).add(fills, { opacity: 1, duration: 360, ease: "outQuad" }, 380);
    if (flowerEl) {
      tl.add(flowerEl, { opacity: 1, duration: 420, ease: "outQuad" }, 560);
    }

    return () => {
      tl.revert();
    };
  }, [drawKey, stage]);

  const paths = PLANT_PATHS[stage];

  return (
    <svg
      ref={ref}
      key={`${drawKey}-${stage}`}
      viewBox="0 0 100 120"
      className={className}
      role="img"
      aria-label={`Tanaman kebiasaan tahap ${stage + 1} dari 4`}
    >
      {/* pot & tanah */}
      <ellipse
        className="p-fill"
        cx="50"
        cy="83"
        rx="13"
        ry="2.6"
        fill="#713F12"
      />
      <path className="p-fill" d="M34 79 L66 79 L67 86 L33 86 Z" fill="#9A3412" />
      <path
        className="p-fill"
        d="M36 86 L64 86 L60 112 L40 112 Z"
        fill="#C2410C"
      />

      {/* tanaman */}
      {paths.map((d, i) => {
        const isFlower = stage === 3 && i === paths.length - 1;
        return isFlower ? (
          <path
            key={i}
            className="p-flower"
            d={d}
            fill={flower}
            fillOpacity="0.9"
            stroke="#059669"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ) : (
          <path
            key={i}
            className="p-stroke"
            d={d}
            fill="none"
            stroke="#059669"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {stage === 2 && (
        <circle className="p-fill" cx="50" cy="44" r="3" fill="#10B981" />
      )}
    </svg>
  );
}

/* ---------- Tetes air penyiraman (anime.js) ---------- */

export function Droplets({ burstKey }: { burstKey: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box || burstKey === 0) return;
    const drops = Array.from(box.querySelectorAll<HTMLElement>(".drop"));
    const anims = drops.map((d, i) =>
      animate(d, {
        translateY: [-12, 30],
        opacity: [0, 1, 0],
        duration: 650,
        ease: "outQuad",
        delay: i * 60,
      })
    );
    return () => {
      anims.forEach((a) => a.revert());
    };
  }, [burstKey]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-8 z-10"
    >
      {[-5, 0, 5].map((x) => (
        <span
          key={x}
          className="drop absolute size-2 rounded-full bg-teal-400 opacity-0 will-change-transform"
          style={{ left: x - 4 }}
        />
      ))}
    </div>
  );
}

/* ---------- Ledakan konfeti (anime.js) ---------- */

const CONFETTI = [
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-400",
  "bg-teal-400",
  "bg-yellow-400",
];

export function ConfettiBurst({ fireKey }: { fireKey: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box || fireKey === 0) return;
    const dots = Array.from(box.querySelectorAll<HTMLElement>(".cf-dot"));
    const anims = dots.map((d) =>
      animate(d, {
        translateX: () => utils.random(-110, 110),
        translateY: () => utils.random(-80, 50),
        scale: [0, 1, 0.4],
        opacity: [1, 1, 0],
        duration: 950,
        ease: "outCubic",
        delay: stagger(28),
      })
    );
    return () => {
      anims.forEach((a) => a.revert());
    };
  }, [fireKey]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-20"
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "cf-dot absolute size-2 rounded-full opacity-0 will-change-transform",
            CONFETTI[i % CONFETTI.length]
          )}
        />
      ))}
    </div>
  );
}

/* ---------- Cincin progres matahari (Motion) ---------- */

export function SunRing({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  const full = total > 0 && done === total;

  return (
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="#F0E7D8"
          strokeWidth="10"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={full ? "#059669" : "url(#kebun-sun)"}
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: ratio }}
          transition={{ type: "spring", stiffness: 50, damping: 18 }}
        />
        <defs>
          <linearGradient id="kebun-sun" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <SpringNumber
            value={Math.round(ratio * 100)}
            format={(n) => `${n}%`}
            className="text-4xl font-semibold text-stone-900"
          />
          <p className="mt-1 text-xs text-stone-500">
            {done} dari {total} tersirami
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Chip ikon kebiasaan ---------- */

export function IconChip({
  icon,
  category,
  done,
  className,
}: {
  icon: string;
  category: Category;
  done?: boolean;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-2xl",
        done ? "bg-emerald-100 text-emerald-700" : meta.chip,
        className
      )}
    >
      <HabitIcon name={icon} className="size-5" />
    </span>
  );
}
