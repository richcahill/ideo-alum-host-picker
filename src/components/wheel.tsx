"use client";

import { track } from "@vercel/analytics";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { pick } from "@/app/actions";
import { COLOURS, confetti } from "@/components/confetti";
import { Button } from "@/components/ui/button";

export type Segment = { name: string; weight: number };

const SPIN_MS = 5200;
const TURNS = 6;
const R = 96;

/** A point on the rim, `degrees` clockwise from the top. */
const rim = (degrees: number, radius = R) => {
  const a = (degrees * Math.PI) / 180;
  return `${(radius * Math.sin(a)).toFixed(3)} ${(-radius * Math.cos(a)).toFixed(3)}`;
};

// Somewhere inside a slice, clear of its edges, to come to rest on top.
const within = (from: number, to: number) =>
  from + (to - from) * (0.15 + Math.random() * 0.7);

const short = (name: string) =>
  name.length > 15 ? `${name.slice(0, 14)}…` : name;

/**
 * The wheel and the name it lands on. Each person's slice is as wide as their
 * share of the draw. The server makes the draw; the wheel then spins round to
 * the answer, so what it shows is always what was saved.
 */
export function Wheel({
  segments,
  current,
  editing,
}: {
  segments: Segment[];
  /** Whoever is picked at the moment, as the server has it. */
  current: string | null;
  editing: boolean;
}) {
  const router = useRouter();
  const wheel = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  // The name the wheel just landed on, shown until the server's copy arrives.
  const [landed, setLanded] = useState<string | null>(null);
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setLanded(null);
  }

  const total = segments.reduce((sum, segment) => sum + segment.weight, 0);
  const slices = segments.reduce<(Segment & { from: number; to: number })[]>(
    (done, segment) => {
      const from = done.length ? done[done.length - 1].to : 0;
      return [
        ...done,
        { ...segment, from, to: from + (segment.weight / total) * 360 },
      ];
    },
    [],
  );
  // Neighbours never share a colour, including the last slice and the first.
  const colour = (index: number) =>
    index === slices.length - 1 && index % COLOURS.length === 0 && index > 0
      ? COLOURS[COLOURS.length >> 1]
      : COLOURS[index % COLOURS.length];

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    track("wheel_spun");
    let name: string | null = null;
    try {
      name = await pick();
    } catch {
      // Falls through: without a name there is nothing to spin to.
    }
    const slice = slices.find((s) => s.name === name);
    if (!name || !slice) {
      setSpinning(false);
      router.refresh();
      return;
    }
    const at = within(slice.from, slice.to);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRotation(
      (r) => r + TURNS * 360 + ((((-at - r) % 360) + 360) % 360),
    );
    setTimeout(
      () => {
        setLanded(name);
        setSpinning(false);
        router.refresh();
        const box = wheel.current?.getBoundingClientRect();
        if (box && !still) {
          confetti(box.left + box.width / 2, box.top + box.height / 2);
        }
      },
      still ? 0 : SPIN_MS,
    );
  }

  const name = spinning ? null : (landed ?? current);

  return (
    <>
      <div aria-live="polite">
        {name ? (
          <h1
            key={name}
            className="reveal mt-4 text-4xl font-medium tracking-tight sm:text-5xl"
          >
            {name}
          </h1>
        ) : (
          <h1 className="mt-4 text-4xl font-medium tracking-tight text-muted sm:text-5xl">
            {spinning ? "Spinning…" : "Nobody yet"}
          </h1>
        )}
      </div>

      {slices.length > 0 && (
        <div className="relative mx-auto mt-10 w-full max-w-80">
          {/* The pointer the wheel stops under. */}
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="absolute -top-3 left-1/2 z-10 h-8 w-8 -translate-x-1/2 text-foreground drop-shadow-sm"
          >
            <path d="M12 21 4 5h16z" fill="currentColor" />
          </svg>
          <svg
            ref={wheel}
            viewBox="-100 -100 200 200"
            role="img"
            aria-label={`Wheel with ${slices.map((s) => s.name).join(", ")}`}
            className="block w-full drop-shadow-md"
            style={{
              rotate: `${rotation}deg`,
              transition: `rotate ${SPIN_MS}ms cubic-bezier(0.12, 0.72, 0.1, 1)`,
            }}
          >
            {slices.map((slice, index) => {
              const middle = (slice.from + slice.to) / 2;
              return (
                <g key={slice.name}>
                  {slices.length === 1 ? (
                    <circle r={R} fill={colour(index)} />
                  ) : (
                    <path
                      d={`M0 0 L${rim(slice.from)} A${R} ${R} 0 ${slice.to - slice.from > 180 ? 1 : 0} 1 ${rim(slice.to)} Z`}
                      fill={colour(index)}
                      stroke="var(--surface)"
                      strokeWidth="1"
                    />
                  )}
                  {/* Too thin a slice has no room for its name. */}
                  {slice.to - slice.from >= 9 && (
                    <text
                      x="58"
                      transform={`rotate(${middle - 90})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={slices.length > 12 ? 7 : 9}
                      fontWeight="500"
                      fill="#1a1a19"
                    >
                      {short(slice.name)}
                    </text>
                  )}
                </g>
              );
            })}
            <circle r={R} fill="none" stroke="var(--press)" strokeWidth="3" />
            <circle r="9" fill="var(--press)" />
          </svg>
        </div>
      )}

      {editing && slices.length > 0 && (
        <div className="mt-8">
          <Button
            variant="tactile"
            onClick={spin}
            disabled={spinning}
            className="disabled:opacity-60"
          >
            {current || landed ? "Spin again" : "Spin the wheel"}
          </Button>
        </div>
      )}
    </>
  );
}
