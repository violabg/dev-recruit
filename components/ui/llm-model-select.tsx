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
        <SelectItem value={LLM_MODELS.KIMI}>
          🔬 Kimi - Kimi K2 Instruct (Raccomandato)
        </SelectItem>
        <SelectItem value={LLM_MODELS.VERSATILE}>
          🚀 Versatile - Llama 3.3 70B
        </SelectItem>
        <SelectItem value={LLM_MODELS.INSTANT}>
          ⚡ Instant - Llama 3.1 8B (Veloce)
        </SelectItem>
        <SelectItem value={LLM_MODELS.REASONING}>
          🧠 Reasoning - DeepSeek R1 70B (Valutazione)
        </SelectItem>
        <SelectItem value={LLM_MODELS.MAVERICK}>
          🔬 Maverick - Llama 4 17B (Sperimentale)
        </SelectItem>
        <SelectItem value={LLM_MODELS.SCOUT}>
          🎯 Scout - Llama 4 Scout 17B (Sperimentale)
        </SelectItem>
        <SelectItem value={LLM_MODELS.GEMMA2_9B_IT}>
          💎 Gemma2 9B (Google)
        </SelectItem>
        <SelectItem value={LLM_MODELS.QWEN_QWQ_32B}>
          🌟 Qwen QWQ 32B (Alibaba)
        </SelectItem>
        <SelectItem value={LLM_MODELS.GPT_OSS_20B}>
          🌟 GPT OSS 20B (OpenAI)
        </SelectItem>
        <SelectItem value={LLM_MODELS.GPT_OSS_120B}>
          🌟 GPT OSS 120B (OpenAI)
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
