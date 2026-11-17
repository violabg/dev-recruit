import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";
import Image from "next/image";
import type { ReactNode } from "react";

import type { GuideSectionMeta } from "./sections";

// The diagram is a client component (Mermaid loads on demand); sections import
// every block from this module.
export { GuideDiagram } from "./guide-diagram";

/** One numbered section: heading, stable anchor and the top rule. */
export function GuideSection({
  meta,
  children,
}: {
  meta: GuideSectionMeta;
  children: ReactNode;
}) {
  return (
    <section
      id={meta.id}
      aria-labelledby={`${meta.id}-title`}
      className="scroll-mt-20 mt-10 border-border border-t pt-10 first:mt-0 first:border-t-0 first:pt-0"
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          aria-hidden
          className="grid place-items-center bg-primary/12 mt-0.5 rounded-md size-7 text-primary text-xs font-semibold tabular-nums ring-1 ring-primary/20 ring-inset"
        >
          {meta.number}
        </span>
        <h2
          id={`${meta.id}-title`}
          className="font-display font-extrabold text-heading text-xl md:text-2xl text-balance tracking-[-0.02em]"
        >
          <a
            href={`#${meta.id}`}
            title="Link diretto a questa sezione"
            className="group/anchor gap-2 inline-flex items-baseline hover:text-primary transition-colors"
          >
            {meta.title}
            <span
              aria-hidden
              className="text-muted-foreground/40 font-normal text-base opacity-0 group-hover/anchor:opacity-100 group-focus-visible/anchor:opacity-100 transition-opacity"
            >
              #
            </span>
          </a>
        </h2>
      </div>
      <div className="flex flex-col gap-5 pl-0 md:pl-10">{children}</div>
    </section>
  );
}

/** A part of a section with its own deep link (`/guida#live`, `/guida#fasi`…). */
export function GuideSubsection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <h3
        id={`${id}-title`}
        className="mb-2 font-display font-bold text-heading text-base tracking-[-0.01em]"
      >
        <a
          href={`#${id}`}
          aria-label={`Link diretto alla sezione: ${title}`}
          className="group/anchor gap-1.5 inline-flex items-baseline hover:text-primary transition-colors"
        >
          {title}
          <span
            aria-hidden
            className="text-muted-foreground/40 font-normal text-sm opacity-0 group-hover/anchor:opacity-100 group-focus-visible/anchor:opacity-100 transition-opacity"
          >
            #
          </span>
        </a>
      </h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Body copy: the guide's default paragraph. */
export function GuideText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "max-w-[72ch] text-[0.95rem] text-foreground/85 leading-[1.7] [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_strong]:font-semibold [&_strong]:text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Bulleted list of the guide. */
export function GuideList({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2 pl-5 max-w-[72ch] text-[0.95rem] text-foreground/85 leading-[1.7] list-disc marker:text-border [&_strong]:font-semibold [&_strong]:text-foreground">
      {children}
    </ul>
  );
}

/** Numbered walkthrough of a flow. */
export function GuideSteps({
  steps,
}: {
  steps: { title: string; body: ReactNode }[];
}) {
  return (
    <ol className="flex flex-col gap-4 max-w-[72ch]">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span
            aria-hidden
            className="grid place-items-center bg-muted mt-0.5 rounded-full size-6 shrink-0 text-muted-foreground text-xs font-semibold tabular-nums ring-1 ring-border ring-inset"
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[0.95rem] text-foreground">
              {step.title}
            </p>
            {/* A div, not a p: a step may contain a list */}
            <div className="text-[0.95rem] text-foreground/85 leading-[1.7] [&_strong]:font-semibold [&_strong]:text-foreground">
              {step.body}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Reference table: labels and lookups. */
export function GuideTable({
  head,
  rows,
  className,
}: {
  head: ReactNode[];
  rows: ReactNode[][];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl ring-1 ring-border overflow-hidden",
        className,
      )}
    >
      <Table className="text-[0.9rem]">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {head.map((cell, index) => (
              <TableHead
                key={index}
                className="px-3.5 py-2.5 font-semibold text-muted-foreground text-xs tracking-wide uppercase whitespace-normal"
              >
                {cell}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className="even:bg-muted/30 align-top hover:bg-transparent"
            >
              {row.map((cell, cellIndex) => (
                <TableCell
                  key={cellIndex}
                  className="px-3.5 py-3 align-top text-foreground/85 leading-[1.6] whitespace-normal [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_strong]:font-semibold [&_strong]:text-foreground"
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Off-box note: the one place a warning about the app's limits belongs. */
export function GuideCallout({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-warning/8 px-4 py-3 rounded-xl ring-1 ring-warning/25">
      <p className="font-semibold text-foreground text-sm">{title ?? "Nota"}</p>
      <p className="text-[0.9rem] text-foreground/85 leading-[1.65]">
        {children}
      </p>
    </div>
  );
}

/** A screenshot of the app, with a caption. */
export function GuideFigure({
  src,
  alt,
  caption,
  width = 1440,
  height = 1000,
}: {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="m-0">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(min-width: 1024px) 720px, 100vw"
        className="bg-card w-full h-auto rounded-xl ring-1 ring-border shadow-sm"
      />
      <figcaption className="mt-2 text-muted-foreground text-xs">
        {caption}
      </figcaption>
    </figure>
  );
}
