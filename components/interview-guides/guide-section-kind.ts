import type { GuideSectionKind } from "@/lib/schemas";

/** Italian labels of the interview guide section kinds, in one place. */
export const GUIDE_SECTION_KIND_LABEL: Record<GuideSectionKind, string> = {
  intro: "Introduzione",
  experience: "Esperienza",
  technical: "Tecnica",
  behavioral: "Comportamentale",
  candidate_questions: "Domande del candidato",
  closing: "Chiusura",
};

export const GUIDE_SECTION_KIND_OPTIONS: {
  value: GuideSectionKind;
  label: string;
}[] = [
  { value: "intro", label: GUIDE_SECTION_KIND_LABEL.intro },
  { value: "experience", label: GUIDE_SECTION_KIND_LABEL.experience },
  { value: "technical", label: GUIDE_SECTION_KIND_LABEL.technical },
  { value: "behavioral", label: GUIDE_SECTION_KIND_LABEL.behavioral },
  {
    value: "candidate_questions",
    label: GUIDE_SECTION_KIND_LABEL.candidate_questions,
  },
  { value: "closing", label: GUIDE_SECTION_KIND_LABEL.closing },
];
