import { AiSection } from "@/components/guide/sections/ai";
import { ArrivoSection } from "@/components/guide/sections/arrivo";
import { CandidaturaSection } from "@/components/guide/sections/candidatura";
import { ColloquioSection } from "@/components/guide/sections/colloquio";
import { ConcettoSection } from "@/components/guide/sections/concetto";
import { DecisioneSection } from "@/components/guide/sections/decisione";
import { FaqSection } from "@/components/guide/sections/faq";
import { GiornoPerGiornoSection } from "@/components/guide/sections/giorno-per-giorno";
import { GlossarioSection } from "@/components/guide/sections/glossario";
import { MappaSection } from "@/components/guide/sections/mappa";
import { PosizioneSection } from "@/components/guide/sections/posizione";
import { GuideToc } from "@/components/guide/guide-toc";
import { GUIDE_SECTIONS, type GuideSectionId } from "@/components/guide/sections";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { ArrowUpRight, BrainCircuit } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";

export const metadata: Metadata = {
  title: "Guida operativa — DevRecruit AI",
  description:
    "Come si usa DevRecruit: dalla posizione alla decisione, cosa fa ogni pagina, l'ordine dei passi e cosa vede il candidato.",
};

/** One component per section; the order comes from `GUIDE_SECTIONS`. */
const SECTIONS: Record<GuideSectionId, () => ReactElement> = {
  concetto: ConcettoSection,
  mappa: MappaSection,
  posizione: PosizioneSection,
  arrivo: ArrivoSection,
  candidatura: CandidaturaSection,
  colloquio: ColloquioSection,
  decisione: DecisioneSection,
  "giorno-per-giorno": GiornoPerGiornoSection,
  ai: AiSection,
  glossario: GlossarioSection,
  faq: FaqSection,
};

const COVER_CHIPS = ["Flusso operativo", "Schermate reali", "Diagrammi di flusso"];

export default function GuidaPage() {
  return (
    <div className="bg-background min-h-dvh">
      <header className="top-0 z-40 sticky bg-background/85 supports-backdrop-filter:bg-background/70 backdrop-blur border-b">
        <div className="flex items-center gap-2.5 mx-auto px-4 md:px-6 h-14 w-full max-w-[1320px]">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md font-display font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            <span className="grid place-items-center bg-primary rounded-lg size-8 text-primary-foreground aspect-square">
              <BrainCircuit className="size-4.5" />
            </span>
            DevRecruit
          </Link>
          <span className="bg-border w-px h-4" aria-hidden />
          <span className="text-muted-foreground text-sm">Guida operativa</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <ThemeToggle />
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Apri l&apos;app
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#0b1b3a] text-white">
          <div
            aria-hidden
            className="bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.45),transparent_55%),radial-gradient(circle_at_85%_100%,rgba(37,99,235,0.4),transparent_50%)] inset-0 absolute"
          />
          <div className="relative mx-auto px-5 md:px-6 py-14 md:py-20 w-full max-w-[1320px]">
            <span className="inline-block bg-white/12 mb-4 px-3 py-1 border border-white/25 rounded-full text-[0.68rem] tracking-[0.14em] uppercase">
              POC · Guida operativa
            </span>
            <h1 className="font-display font-extrabold text-3xl md:text-[3.25rem] tracking-[-0.03em] leading-[1.05] text-balance">
              DevRecruit
              <br />
              come si usa
            </h1>
            <p className="mt-4 max-w-[46ch] text-sm text-white/80 md:text-lg leading-relaxed">
              Dalla posizione alla decisione: dove si trova ogni cosa, qual è
              l&apos;ordine dei passi e cosa vede il candidato.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-6 text-white/70 text-xs">
              {COVER_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="gap-8 lg:gap-12 grid lg:grid-cols-[220px_minmax(0,1fr)] mx-auto px-4 md:px-6 py-10 lg:py-14 w-full max-w-[1320px]">
          <GuideToc />
          <article className="min-w-0">
            <div className="max-w-[72ch] mb-8">
              <p className="text-[0.95rem] text-foreground/85 leading-[1.7]">
                <strong className="text-foreground">Cos&apos;è questa guida.</strong>{" "}
                Descrive l&apos;applicazione così com&apos;è oggi e spiega come si
                usa, non come è fatta: cosa fa ogni pagina, dove si trovano le
                cose, qual è l&apos;ordine dei passi e cosa si vede a ogni
                passaggio.
              </p>
              <p className="mt-3 text-[0.95rem] text-foreground/85 leading-[1.7]">
                <strong className="text-foreground">A chi serve.</strong> A chi
                presenta il POC (per seguire un percorso lineare), a chi lo prova
                (per non perdersi tra le pagine) e a chi lo sviluppa (per vedere
                il flusso dall&apos;esterno).
              </p>
            </div>

            <div className="flex flex-col">
              {GUIDE_SECTIONS.map(({ id }) => {
                const Section = SECTIONS[id];
                return <Section key={id} />;
              })}
            </div>
          </article>
        </div>
      </main>

      <footer className="border-t">
        <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-3 mx-auto px-4 md:px-6 py-8 w-full max-w-[1320px] text-muted-foreground text-xs">
          <p className="flex items-center gap-2">
            <BrainCircuit className="size-4 shrink-0" />
            Le schermate usano dati di esempio; nomi di candidati, posizioni e
            utenti sono fittizi.
          </p>
          <Link href="/" className="font-medium text-foreground hover:underline">
            Vai all&apos;applicazione
          </Link>
        </div>
      </footer>
    </div>
  );
}
