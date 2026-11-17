"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const ACCENTS = {
  emerald: {
    chip: "bg-emerald-100 text-emerald-700",
    eyebrow: "text-emerald-700",
  },
  teal: {
    chip: "bg-teal-100 text-teal-700",
    eyebrow: "text-teal-700",
  },
  rose: {
    chip: "bg-rose-100 text-rose-600",
    eyebrow: "text-rose-600",
  },
  amber: {
    chip: "bg-amber-100 text-amber-700",
    eyebrow: "text-amber-700",
  },
} as const;

export type Accent = keyof typeof ACCENTS;

export function SectionShell({
  id,
  accent,
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  accent: Accent;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <section id={id} className="scroll-mt-20 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-start gap-4 sm:mb-10">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-xl shadow-sm ${a.chip}`}
          >
            <Icon className="size-5" aria-hidden />
          </div>
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${a.eyebrow}`}
            >
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 sm:text-base">
              {description}
            </p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export function DemoCard({
  title,
  hint,
  action,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`gap-0 rounded-2xl border-stone-200 py-0 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
          {hint ? (
            <p className="mt-0.5 text-xs text-stone-400">{hint}</p>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
