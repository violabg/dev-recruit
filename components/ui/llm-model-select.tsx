"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLM_MODELS } from "@/lib/utils";

type LLMModelSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export const LLMModelSelect = ({
  value,
  onValueChange,
  placeholder = "Seleziona un modello LLM",
}: LLMModelSelectProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Production Models - Recommended for reliability */}
        <SelectItem value={LLM_MODELS.VERSATILE}>
          🚀 Versatile - Llama 3.3 70B (Affidabile)
        </SelectItem>
        <SelectItem value={LLM_MODELS.INSTANT}>
          ⚡ Instant - Llama 3.1 8B (Velocissimo)
        </SelectItem>
        <SelectItem value={LLM_MODELS.GPT_OSS_120B}>
          🧠 GPT OSS 120B - Ragionamento + JSON Mode
        </SelectItem>
        <SelectItem value={LLM_MODELS.GPT_OSS_20B}>
          💨 GPT OSS 20B - Ragionamento Veloce
        </SelectItem>

        {/* Preview Models - Larger context, experimental */}
        <SelectItem value={LLM_MODELS.KIMI}>
          🔬 Kimi K2 - 262K contesto (Raccomandato per quiz)
        </SelectItem>
        <SelectItem value={LLM_MODELS.MAVERICK}>
          🎯 Maverick - Llama 4 17B (Sperimentale)
        </SelectItem>
        <SelectItem value={LLM_MODELS.SCOUT}>
          🏃 Scout - Llama 4 Scout 17B (Veloce)
        </SelectItem>
        <SelectItem value={LLM_MODELS.QWEN3_32B}>
          🌟 Qwen3 32B - Multilingue (Alibaba)
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
