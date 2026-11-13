"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLM_MODELS } from "@/lib/utils";

const llmModelOptions = [
  // LLM_MODELS.KIMI is an alias of GPT_OSS_120B (default for quiz generation)
  {
    value: LLM_MODELS.GPT_OSS_120B,
    label: "🧠 GPT OSS 120B - Ragionamento + JSON Mode (Raccomandato per quiz)",
  },
  {
    value: LLM_MODELS.VERSATILE,
    label: "🚀 Versatile - Llama 3.3 70B (Affidabile)",
  },
  {
    value: LLM_MODELS.INSTANT,
    label: "⚡ Instant - Llama 3.1 8B (Velocissimo)",
  },
  {
    value: LLM_MODELS.GPT_OSS_20B,
    label: "💨 GPT OSS 20B - Ragionamento Veloce",
  },
  {
    value: LLM_MODELS.MAVERICK,
    label: "🎯 Maverick - Llama 4 17B (Sperimentale)",
  },
  { value: LLM_MODELS.SCOUT, label: "🏃 Scout - Llama 4 Scout 17B (Veloce)" },
  {
    value: LLM_MODELS.QWEN3_32B,
    label: "🌟 Qwen3 32B - Multilingue (Alibaba)",
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
