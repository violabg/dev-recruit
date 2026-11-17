"use client";

import { cn } from "cn";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Mermaid diagram of the guide.
 *
 * Mermaid is a large dependency used by this page alone, so it is imported
 * dynamically the first time a diagram approaches the viewport: the guide
 * stays light for a reader who never scrolls to a diagram. Renders are queued
 * because `mermaid.render` shares a temporary DOM node and cannot run twice at
 * the same time.
 */
type Theme = "light" | "dark";

/**
 * Mindmap palette: one entry per section level, in Mermaid's `cScale` order.
 * Index 0 is the root, 1–4 the four branches of the app map, 5–11 spare
 * colours. The hues follow the dashboard sections (blue, teal, violet, amber).
 *
 * They are spelled out because Mermaid's base theme derives `cScale` from
 * `primaryColor` and darkens it by 75% in dark mode, which turns every node
 * black; explicit values are re-applied after that pass.
 */
const LIGHT_SCALE = [
  { fill: "#8fb4f5", line: "#2f6fd0" }, // root
  { fill: "#dce6fb", line: "#2f6fd0" }, // Panoramica
  { fill: "#cdeee9", line: "#0f7f76" }, // Selezione
  { fill: "#e4dcfb", line: "#6f4bd8" }, // Libreria
  { fill: "#f8e6c8", line: "#a96a10" }, // Impostazioni
  { fill: "#fadde6", line: "#b8336a" },
  { fill: "#d4f0dd", line: "#1f7a45" },
  { fill: "#d3ecf7", line: "#106f96" },
  { fill: "#dfddfb", line: "#4a4bc4" },
  { fill: "#fbe0d8", line: "#b14326" },
  { fill: "#e3f2cd", line: "#5d7a1d" },
  { fill: "#eedcf4", line: "#7c3f96" },
] as const;

const DARK_SCALE = [
  { fill: "#33598f", line: "#6d9bea" }, // root
  { fill: "#23395c", line: "#6d9bea" }, // Panoramica
  { fill: "#17463f", line: "#4fd1c5" }, // Selezione
  { fill: "#33285a", line: "#a78bfa" }, // Libreria
  { fill: "#4a3a1c", line: "#f0b64a" }, // Impostazioni
  { fill: "#4a2333", line: "#f472b6" },
  { fill: "#1e3f2b", line: "#5fd08a" },
  { fill: "#1b3b4a", line: "#67c7e8" },
  { fill: "#2b2f5c", line: "#8b93f8" },
  { fill: "#4a2a22", line: "#f09070" },
  { fill: "#333f1b", line: "#a3c95f" },
  { fill: "#3f2748", line: "#c48fdf" },
] as const;

/** `cScale*`, `cScaleInv*`, `cScaleLabel*` and the root colours of the mindmap. */
function paletteVariables(
  scale: typeof LIGHT_SCALE | typeof DARK_SCALE,
  label: string,
): Record<string, string> {
  const variables: Record<string, string> = {
    git0: scale[0].fill,
    gitBranchLabel0: label,
    scaleLabelColor: label,
  };
  scale.forEach((entry, index) => {
    variables[`cScale${index}`] = entry.fill;
    variables[`cScaleInv${index}`] = entry.line;
    variables[`cScaleLabel${index}`] = label;
    variables[`cScalePeer${index}`] = entry.line;
  });
  return variables;
}

/**
 * Mermaid paints mindmap connectors with the section fill, which is a tint: on
 * the card they almost vanish. `themeCSS` is appended to the generated styles,
 * so the saturated `cScaleInv` colour wins and the labels get a heavier weight.
 */
function paletteStyles(scale: typeof LIGHT_SCALE | typeof DARK_SCALE) {
  const connectors = scale
    .map(
      (entry, index) =>
        `.section-edge-${index - 1} { stroke: ${entry.line} !important; }`,
    )
    .join("\n");
  return [
    connectors,
    ".mindmap-node text, .mindmap-node span, .mindmap-node .text-inner-tspan { font-weight: 600; }",
  ].join("\n");
}

const LIGHT_THEME = {
  background: "#ffffff",
  primaryColor: "#e8effd",
  primaryTextColor: "#0f172a",
  primaryBorderColor: "#bcd0f7",
  lineColor: "#8a99b3",
  secondaryColor: "#f1f5f9",
  tertiaryColor: "#ffffff",
  mainBkg: "#e8effd",
  nodeBorder: "#bcd0f7",
  clusterBkg: "#f8fafc",
  clusterBorder: "#e2e8f0",
  titleColor: "#0f172a",
  textColor: "#1e293b",
  edgeLabelBackground: "#ffffff",
  actorBkg: "#e8effd",
  actorBorder: "#bcd0f7",
  actorTextColor: "#0f172a",
  signalColor: "#475569",
  signalTextColor: "#0f172a",
  // Number badges: a dark circle, so the number itself must be light
  sequenceNumberColor: "#ffffff",
  labelBoxBkgColor: "#f1f5f9",
  noteBkgColor: "#fff8e8",
  noteTextColor: "#5b4a1e",
  noteBorderColor: "#f0b429",
  ...paletteVariables(LIGHT_SCALE, "#0f172a"),
} as const;

const DARK_THEME = {
  background: "#0f1b2e",
  primaryColor: "#1c3459",
  primaryTextColor: "#e6edf7",
  primaryBorderColor: "#3d639c",
  lineColor: "#8394ae",
  secondaryColor: "#16243c",
  tertiaryColor: "#0f1b2e",
  mainBkg: "#22395b",
  nodeBorder: "#3d639c",
  clusterBkg: "#132136",
  clusterBorder: "#27405f",
  titleColor: "#e6edf7",
  textColor: "#dbe5f4",
  edgeLabelBackground: "#0f1b2e",
  actorBkg: "#22395b",
  actorBorder: "#3d639c",
  actorTextColor: "#e6edf7",
  signalColor: "#9fb0c9",
  signalTextColor: "#dbe5f4",
  // Number badges: a light circle, so the number itself must be dark
  sequenceNumberColor: "#0f1b2e",
  labelBoxBkgColor: "#16243c",
  noteBkgColor: "#2b2513",
  noteTextColor: "#f3e2b6",
  noteBorderColor: "#8a6b1f",
  ...paletteVariables(DARK_SCALE, "#e6edf7"),
} as const;

type MermaidModule = typeof import("mermaid").default;

let mermaidPromise: Promise<MermaidModule> | null = null;
let configuredTheme: Theme | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();
let renderCount = 0;

async function getMermaid(theme: Theme): Promise<MermaidModule> {
  mermaidPromise ??= import("mermaid").then((module) => module.default);
  const mermaid = await mermaidPromise;
  if (configuredTheme !== theme) {
    const isDark = theme === "dark";
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      // Follows the app theme, never the OS: the page can be light on a dark machine
      themeVariables: isDark
        ? { ...DARK_THEME, darkMode: true }
        : { ...LIGHT_THEME, darkMode: false },
      themeCSS: paletteStyles(isDark ? DARK_SCALE : LIGHT_SCALE),
      fontFamily: getComputedStyle(document.body).fontFamily,
      // Mermaid 12 defaults to the ELK layout engine (~450 KB gzipped, pulled
      // as its own chunk); dagre draws these small box-and-arrow diagrams the
      // same and is already part of the core
      layout: "dagre",
      // Fit the column on desktop; the wrapper below keeps a readable floor on
      // a phone, where Mermaid would otherwise shrink the labels to nothing
      flowchart: { curve: "step", htmlLabels: true },
    });
    configuredTheme = theme;
  }
  return mermaid;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = renderQueue.then(task, task);
  renderQueue = next.catch(() => undefined);
  return next;
}

export function GuideDiagram({
  chart,
  title,
  caption,
  className,
}: {
  chart: string;
  title: string;
  caption?: string;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const reactId = useId();
  const hostRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  // Load Mermaid only when the diagram is about to become visible
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const theme: Theme = resolvedTheme === "dark" ? "dark" : "light";
    let cancelled = false;

    enqueue(async () => {
      const id = `guide-diagram-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}-${renderCount++}`;
      try {
        const mermaid = await getMermaid(theme);
        const result = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(result.svg);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart, inView, reactId, resolvedTheme]);

  // A wide diagram keeps its natural size and scrolls; say so instead of
  // hiding half of it behind an invisible scrollbar
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const check = () => setScrollable(host.scrollWidth > host.clientWidth + 4);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(host);
    return () => observer.disconnect();
  }, [svg]);

  return (
    <figure className={cn("m-0 flex flex-col gap-2", className)}>
      <div
        ref={hostRef}
        className="flex bg-card p-4 rounded-xl ring-1 ring-border overflow-x-auto"
      >
        {failed ? (
          // Never lose the content: the source is readable and copyable
          <pre className="m-auto w-full text-muted-foreground text-xs whitespace-pre-wrap">
            {chart}
          </pre>
        ) : svg ? (
          <div
            className="m-auto w-full min-w-0 [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full max-lg:[&_svg]:min-w-[680px]"
            // Mermaid returns its own sanitised SVG for our static source
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div
            aria-hidden
            className="flex flex-col justify-center items-center gap-2 m-auto min-h-44 w-full text-muted-foreground/70 text-xs"
          >
            <span className="bg-muted rounded-sm w-40 h-3 animate-pulse" />
            <span className="bg-muted rounded-sm w-56 h-3 animate-pulse" />
            <span className="bg-muted rounded-sm w-32 h-3 animate-pulse" />
          </div>
        )}
      </div>
      {scrollable && (
        <p className="text-muted-foreground text-xs">
          Diagramma più largo dello schermo: scorrilo in orizzontale.
        </p>
      )}
      <figcaption className="sr-only">{caption ?? title}</figcaption>
    </figure>
  );
}
