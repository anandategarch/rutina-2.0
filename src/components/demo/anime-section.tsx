"use client";

import { useEffect, useRef, useState } from "react";
import { animate, createTimeline, stagger } from "animejs";

import { Button } from "@/components/ui/button";

import { DemoCard, SectionShell } from "./shared";

import { Film, RotateCw } from "lucide-react";

/* ---------- Util: tombol putar ulang ---------- */

function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 gap-1.5 px-2 text-xs"
      onClick={onClick}
      aria-label="Putar ulang animasi"
    >
      <RotateCw className="size-3.5" aria-hidden /> Ulangi
    </Button>
  );
}

/* ---------- 1. Goresan SVG: daun digambar hidup ---------- */

function SvgDrawDemo({ run }: { run: number }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const paths = Array.from(
      box.querySelectorAll<SVGPathElement>(".ld-path")
    );
    const body = box.querySelector<SVGPathElement>(".ld-body");
    if (paths.length === 0 || !body) return;

    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
    });
    body.style.fill = "rgba(16,185,129,0)";

    const tl = createTimeline({
      defaults: { ease: "inOutSine", duration: 1100 },
    });
    tl.add(paths, { strokeDashoffset: 0, delay: stagger(160) }, 0).add(
      body,
      { fill: "rgba(16,185,129,0.16)", duration: 700, ease: "outQuad" },
      950
    );

    return () => {
      tl.revert();
    };
  }, [run]);

  return (
    <div className="space-y-3">
      <div
        ref={boxRef}
        className="grid place-items-center rounded-xl border border-rose-100 bg-rose-50/40 py-4"
      >
        <svg
          viewBox="0 0 120 120"
          className="h-40 w-40"
          role="img"
          aria-label="Daun yang digambar garis demi garis"
        >
          <path
            className="ld-path ld-body"
            d="M60 106 C 26 84, 16 42, 60 12 C 104 42, 94 84, 60 106 Z"
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="ld-path"
            d="M60 100 L60 22"
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            className="ld-path"
            d="M60 78 C 50 70, 44 62, 41 52"
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className="ld-path"
            d="M60 78 C 70 70, 76 62, 79 52"
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className="ld-path"
            d="M60 106 C 60 112, 58 114, 54 116"
            fill="none"
            stroke="#a16207"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-xs text-stone-400">
        getTotalLength + strokeDashoffset — garis menyusul lalu isi muncul.
      </p>
    </div>
  );
}

/* ---------- 2. Huruf melompat ---------- */

const WORD = "Kebun Rutina";

function LetterDemo({ run }: { run: number }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const chars = box.querySelectorAll<HTMLElement>(".lt-ch");
    if (chars.length === 0) return;

    const anim = animate(chars, {
      translateY: [26, 0],
      rotate: [7, 0],
      opacity: [0, 1],
      duration: 700,
      ease: "outBack(1.4)",
      delay: stagger(45),
    });

    return () => {
      anim.revert();
    };
  }, [run]);

  return (
    <div className="space-y-3">
      <div
        ref={boxRef}
        className="grid h-40 place-items-center overflow-hidden rounded-xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white"
      >
        <p
          className="text-3xl font-semibold tracking-tight text-stone-800 sm:text-4xl"
          aria-label={WORD}
        >
          {WORD.split("").map((c, i) =>
            c === " " ? (
              <span key={i} className="inline-block w-3" />
            ) : (
              <span
                key={i}
                className="lt-ch inline-block will-change-transform"
              >
                {c}
              </span>
            )
          )}
        </p>
      </div>
      <p className="text-xs text-stone-400">
        stagger(45ms) + outBack — tiap huruf mendarat dengan pantulan kecil.
      </p>
    </div>
  );
}

/* ---------- 3. Gelombang kotak bertahap ---------- */

function GridStaggerDemo({ run }: { run: number }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const cells = box.querySelectorAll<HTMLElement>(".gr-cell");
    if (cells.length === 0) return;

    const anim = animate(cells, {
      scale: [0.35, 1, 0.35],
      opacity: [0.35, 1, 0.35],
      duration: 1250,
      ease: "inOutSine",
      delay: stagger(70, { grid: [5, 5], from: "center" }),
      loop: true,
    });

    return () => {
      anim.revert();
    };
  }, [run]);

  return (
    <div className="space-y-3">
      <div
        ref={boxRef}
        className="grid place-items-center rounded-xl border border-stone-200 bg-stone-50 py-5"
      >
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 25 }).map((_, i) => (
            <span
              key={i}
              className="gr-cell size-7 rounded-md will-change-transform sm:size-8"
              style={{
                backgroundColor: `hsl(${152 + ((i % 5) + Math.floor(i / 5)) * 5} 62% 48%)`,
              }}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-stone-400">
        stagger dari pusat berbasis kisi [5×5], berulang tanpa henti.
      </p>
    </div>
  );
}

/* ---------- 4. Lini masa: urutan berjatuhan ---------- */

function TimelineDemo({ run }: { run: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const done = doneRef.current;
    if (!track || !done) return;
    const sq = track.querySelector<HTMLElement>(".tm-square");
    const ci = track.querySelector<HTMLElement>(".tm-circle");
    const tr = track.querySelector<HTMLElement>(".tm-triangle");
    if (!sq || !ci || !tr) return;

    const travel = Math.max(70, track.clientWidth - 44);
    const tl = createTimeline({
      defaults: { ease: "outExpo", duration: 700 },
    });

    tl.add(sq, { translateX: travel }, 0)
      .add(ci, { translateX: travel, scale: [1, 1.35, 1] }, 420)
      .add(tr, { translateX: travel, rotate: 360 }, 840)
      .add(done, { opacity: [0, 1], translateY: [8, 0], duration: 350 }, 1500);

    return () => {
      tl.revert();
    };
  }, [run]);

  return (
    <div className="space-y-3">
      <div
        ref={trackRef}
        className="relative flex h-16 items-center gap-3 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 px-3"
      >
        <span className="tm-square size-8 shrink-0 rounded-lg bg-emerald-500 will-change-transform" />
        <span className="tm-circle size-8 shrink-0 rounded-full bg-teal-500 will-change-transform" />
        <span className="tm-triangle size-8 shrink-0 bg-amber-500 [clip-path:polygon(50%_0,100%_100%,0_100%)] will-change-transform" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Kotak
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-teal-500" /> Bulatan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 bg-amber-500 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />{" "}
            Segitiga
          </span>
        </div>
        <div
          ref={doneRef}
          className="shrink-0 text-xs font-medium text-emerald-700 opacity-0"
        >
          Lini masa selesai
        </div>
      </div>
      <p className="text-xs text-stone-400">
        createTimeline — tiga bentuk bergiliran dengan jeda tumpang tindih.
      </p>
    </div>
  );
}

/* ---------- 5. Balapan easing ---------- */

const RACERS = [
  { label: "linear", color: "bg-stone-400" },
  { label: "outQuad", color: "bg-teal-500" },
  { label: "outElastic", color: "bg-rose-500" },
  { label: "outBounce", color: "bg-amber-500" },
];

function EasingRaceDemo({ run }: { run: number }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const balls = Array.from(box.querySelectorAll<HTMLElement>(".er-ball"));
    if (balls.length === 0) return;

    const anims = balls.map((ball, i) =>
      animate(ball, {
        translateX: () =>
          Math.max(40, (ball.parentElement?.clientWidth ?? 200) - 20),
        duration: 1500,
        ease: RACERS[i]?.label ?? "linear",
      })
    );

    return () => {
      anims.forEach((a) => a.revert());
    };
  }, [run]);

  return (
    <div className="space-y-3">
      <div ref={boxRef} className="space-y-2.5">
        {RACERS.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <code className="w-24 shrink-0 text-right font-mono text-[11px] text-stone-500">
              {r.label}
            </code>
            <div className="relative h-5 flex-1 rounded-full bg-stone-100">
              <span
                className={`er-ball absolute left-0 top-0.5 size-4 rounded-full ${r.color} will-change-transform`}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-400">
        Empat kurva pelunakan menempuh jarak yang sama — rasakan bedanya.
      </p>
    </div>
  );
}

/* ---------- Seksi ---------- */

export function AnimeSection() {
  const [runSvg, setRunSvg] = useState(0);
  const [runLetters, setRunLetters] = useState(0);
  const [runGrid, setRunGrid] = useState(0);
  const [runTl, setRunTl] = useState(0);
  const [runRace, setRunRace] = useState(0);

  return (
    <SectionShell
      id="animejs"
      accent="rose"
      icon={Film}
      eyebrow="Pustaka 3 dari 3"
      title="anime.js — mesin animasi JavaScript"
      description="Koreografi presisi lewat JavaScript murni: lini masa berlapis, nilai bertahap (stagger) berbasis kisi, aneka kurva pelunakan, dan gambar SVG yang menyusun dirinya sendiri garis demi garis."
    >
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DemoCard
          title="Goresan SVG"
          hint="Daun digambar hidup"
          action={<ReplayButton onClick={() => setRunSvg((r) => r + 1)} />}
        >
          <SvgDrawDemo run={runSvg} />
        </DemoCard>
        <DemoCard
          title="Huruf Melompat"
          hint="Huruf demi huruf"
          action={<ReplayButton onClick={() => setRunLetters((r) => r + 1)} />}
        >
          <LetterDemo run={runLetters} />
        </DemoCard>
        <DemoCard
          title="Gelombang Kotak"
          hint="Stagger kisi 5×5"
          action={<ReplayButton onClick={() => setRunGrid((r) => r + 1)} />}
        >
          <GridStaggerDemo run={runGrid} />
        </DemoCard>
        <DemoCard
          title="Lini Masa"
          hint="Urutan tumpang tindih"
          action={<ReplayButton onClick={() => setRunTl((r) => r + 1)} />}
        >
          <TimelineDemo run={runTl} />
        </DemoCard>
        <DemoCard
          title="Balapan Easing"
          hint="Kurva saling berlomba"
          action={<ReplayButton onClick={() => setRunRace((r) => r + 1)} />}
        >
          <EasingRaceDemo run={runRace} />
        </DemoCard>
      </div>
    </SectionShell>
  );
}
