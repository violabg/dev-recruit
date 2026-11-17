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
} as const;

/**
 * Node classes the charts use (`A:::entity`, `class x outcome`), coloured per
 * theme: entity = the main objects, step = neutral evidence/steps, outcome =
 * a good end state, danger = a closed/negative end, warn = needs attention,
 * ai = done by the AI.
 */
const CLASS_DEFS: Record<Theme, Record<string, string>> = {
  light: {
    entity: "fill:#0b6aa8,stroke:#085a8f,color:#ffffff,font-weight:600",
    step: "fill:#f1f5fb,stroke:#c3d0e4,color:#1e293b",
    outcome: "fill:#e3f6ec,stroke:#2f9e68,color:#14532d",
    danger: "fill:#fde8e8,stroke:#d64545,color:#7f1d1d",
    warn: "fill:#fff4dc,stroke:#d99a1b,color:#5b4a1e",
    ai: "fill:#f1eafd,stroke:#8b5cf6,color:#4c1d95",
  },
  dark: {
    entity: "fill:#1572b6,stroke:#4ea3e0,color:#ffffff,font-weight:600",
    step: "fill:#18273f,stroke:#33507a,color:#dbe5f4",
    outcome: "fill:#123526,stroke:#3fb27f,color:#c6f2db",
    danger: "fill:#3a1717,stroke:#e06363,color:#fbd5d5",
    warn: "fill:#33280f,stroke:#d9a43a,color:#f6e3b4",
    ai: "fill:#271a44,stroke:#a78bfa,color:#e4d9ff",
  },
};

/** Appends the class definitions to flowcharts and state diagrams. */
function withClassDefs(chart: string, theme: Theme) {
  const head = chart.trimStart();
  if (!head.startsWith("flowchart") && !head.startsWith("stateDiagram")) {
    return chart;
  }
  const defs = Object.entries(CLASS_DEFS[theme])
    .map(([name, style]) => `    classDef ${name} ${style}`)
    .join("\n");
  return `${chart}\n${defs}`;
}

const CLASS_LABELS: Record<string, string> = {
  entity: "Entità principale",
  step: "Passo o prova",
  outcome: "Esito positivo",
  danger: "Chiusura",
  warn: "Da verificare",
  ai: "AI",
};

/** Classes a chart actually uses, in legend order. */
function usedClasses(chart: string) {
  return Object.keys(CLASS_LABELS).filter((name) =>
    new RegExp(`:::${name}\\b|\\bclass\\s[^\\n]*\\s${name}\\s*$`, "m").test(chart),
  );
}

/** Swatch colours parsed from the class definition of the current theme. */
function swatch(name: string, theme: Theme) {
  const style = CLASS_DEFS[theme][name] ?? "";
  const pick = (key: string) => style.match(new RegExp(`${key}:([^,]+)`))?.[1];
  return { background: pick("fill"), borderColor: pick("stroke") };
}

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
        ? { ...DARK_THEME, darkMode: true, fontSize: "15px" }
        : { ...LIGHT_THEME, darkMode: false, fontSize: "15px" },
      fontFamily: getComputedStyle(document.body).fontFamily,
      // Mermaid 12 defaults to the ELK layout engine (~450 KB gzipped, pulled
      // as its own chunk); dagre draws these small box-and-arrow diagrams the
      // same and is already part of the core. The app map is not a Mermaid
      // diagram, so no layout here needs ELK.
      layout: "dagre",
      // Fit the column on desktop; the wrapper below keeps a readable floor on
      // a phone, where Mermaid would otherwise shrink the labels to nothing
      flowchart: {
        curve: "basis",
        htmlLabels: true,
        wrappingWidth: 150,
        nodeSpacing: 28,
        rankSpacing: 36,
        padding: 10,
      },
      state: { padding: 12 },
      sequence: {
        actorMargin: 28,
        width: 120,
        boxMargin: 8,
        messageMargin: 32,
        mirrorActors: false,
      },
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
  const theme: Theme = resolvedTheme === "dark" ? "dark" : "light";
  const legend = usedClasses(chart);

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
        const result = await mermaid.render(id, withClassDefs(chart, theme));
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
      <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Schema · {title}
      </span>
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
      {legend.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
          {legend.map((name) => (
            <li key={name} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="border rounded-sm size-3"
                style={swatch(name, theme)}
              />
              {CLASS_LABELS[name]}
            </li>
          ))}
        </ul>
      )}
      {scrollable && (
        <p className="text-muted-foreground text-xs">
          Diagramma più largo dello schermo: scorrilo in orizzontale.
        </p>
      )}
      {caption ? (
        <figcaption className="text-muted-foreground text-xs">{caption}</figcaption>
      ) : (
        <figcaption className="sr-only">{title}</figcaption>
      )}
    </figure>
  );
}
