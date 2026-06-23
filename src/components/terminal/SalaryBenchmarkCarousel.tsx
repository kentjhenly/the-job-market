"use client";

import { useState } from "react";
import { SalaryCurve } from "@/components/charts/SalaryCurve";
import { formatPercentile } from "@/lib/utils/formatters";
import { scoreVar } from "@/lib/utils/score";

type CurvePoint = { years_exp: number; p25: number; p50: number; p75: number; p90: number };

export type BenchmarkSlide = {
  candidateName: string;
  roleTitle: string;
  location: string | null;
  yearsExp: number;
  candSalary: number | null;
  curve: CurvePoint[];
  nPoints: number;
  offerPercentile: number | undefined;
  marginalPerYear: number | undefined;
};

interface Props {
  slides: BenchmarkSlide[];
}

export function SalaryBenchmarkCarousel({ slides }: Props) {
  const [idx, setIdx] = useState(0);

  const safeIdx = Math.min(idx, Math.max(slides.length - 1, 0));
  const slide = slides[safeIdx];
  const canPrev = safeIdx > 0;
  const canNext = safeIdx < slides.length - 1;

  const navBtn = (enabled: boolean): React.CSSProperties => ({
    fontSize: 14,
    lineHeight: 1,
    color: enabled ? "var(--up)" : "var(--surface-3)",
    background: "none",
    border: "none",
    cursor: enabled ? "pointer" : "default",
    padding: "0 3px",
    fontFamily: "inherit",
  });

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">SALARY BENCHMARK</span>
        {slide?.offerPercentile != null && (
          <span className="mono tnum" style={{ fontSize: 11, color: scoreVar(slide.offerPercentile!), marginLeft: 8 }}>
            {formatPercentile(slide.offerPercentile).toUpperCase()}
          </span>
        )}
        {slides.length > 1 && (
          <div className="ml-auto flex items-center gap-0.5">
            <button style={navBtn(canPrev)} onClick={() => setIdx(i => i - 1)} disabled={!canPrev} aria-label="Previous">
              ←
            </button>
            <span className="mono tnum" style={{ fontSize: 10.5, color: "var(--muted)", minWidth: "2.2rem", textAlign: "center" }}>
              {safeIdx + 1}/{slides.length}
            </span>
            <button style={navBtn(canNext)} onClick={() => setIdx(i => i + 1)} disabled={!canNext} aria-label="Next">
              →
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        {slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2" style={{ height: 265 }}>
            <p className="kicker text-center">NO OPEN POSTINGS</p>
            <p className="kicker text-center">CREATE A POSTING TO SEE ROLE-SPECIFIC SALARY DATA</p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <p className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)", letterSpacing: "0.04em" }}>
                {slide.roleTitle.toUpperCase()}
                {slide.location && (
                  <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                    {" "}· {slide.location.toUpperCase()}
                  </span>
                )}
              </p>
              <p className="mono mt-0.5" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                BENCHMARKING:{" "}
                <span style={{ color: "var(--muted)" }}>{slide.candidateName}</span>
                {" "}· {slide.yearsExp}Y EXP
              </p>
            </div>
            <SalaryCurve
              curve={slide.curve}
              nPoints={slide.nPoints}
              candYears={slide.yearsExp}
              candSalary={slide.candSalary ?? undefined}
              candPercentile={slide.offerPercentile}
              marginalPerYear={slide.marginalPerYear}
              tone="employer"
              height={248}
            />
          </>
        )}
      </div>
    </>
  );
}
