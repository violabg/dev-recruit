import { type QuestionType } from "@/lib/schemas";

export type PresetGenerationButtonsProps = {
  onGeneratePreset: (
    type: QuestionType,
    preset: string,
    options: any
  ) => Promise<void>;
  loading: boolean;
};
