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
  {
    value: LLM_MODELS.KIMI,
    label: "🔬 Kimi K2 - 262K contesto (Raccomandato per quiz)",
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
    value: LLM_MODELS.GPT_OSS_120B,
    label: "🧠 GPT OSS 120B - Ragionamento + JSON Mode",
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
        ...llmModelOptions,
      ]
    : llmModelOptions;
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
