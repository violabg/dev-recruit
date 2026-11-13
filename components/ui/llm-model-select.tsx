"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLM_MODELS } from "@/lib/utils";

// Groq free-plan chat models (see LLM_MODELS in lib/utils.ts)
const llmModelOptions = [
  {
    value: LLM_MODELS.GPT_OSS_120B,
    label: "🧠 GPT-OSS 120B - Ragionamento avanzato (Raccomandato)",
  },
  {
    value: LLM_MODELS.GPT_OSS_20B,
    label: "⚡ GPT-OSS 20B - Veloce",
  },
  {
    value: LLM_MODELS.QWEN3_8_27B,
    label: "🌍 Qwen3.8 27B - Multilingue (Anteprima)",
  },
];

// Guard against two LLM_MODELS keys pointing at the same model id
// (duplicate <SelectItem> values/keys): keep the first occurrence.
const uniqueModelOptions = llmModelOptions.filter(
  (option, index, all) =>
    all.findIndex((o) => o.value === option.value) === index,
);

type LLMModelSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export const LLMModelSelect = ({
  value,
  onValueChange,
  placeholder,
}: LLMModelSelectProps) => {
  const options = placeholder
    ? [
        {
          value: "",
          label: placeholder,
        },
        ...uniqueModelOptions,
      ]
    : uniqueModelOptions;
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(value) => onValueChange(value || "")}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
