import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Code,
  Database,
  Layers,
  Lightbulb,
  Rocket,
  Settings,
  Shield,
  Target,
  Zap,
} from "lucide-react";

export type PresetIconOption = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export const PRESET_ICON_OPTIONS: PresetIconOption[] = [
  { value: "Code", label: "Code", icon: Code },
  { value: "Brain", label: "Brain", icon: Brain },
  { value: "Database", label: "Database", icon: Database },
  { value: "Layers", label: "Layers", icon: Layers },
  { value: "Lightbulb", label: "Lightbulb", icon: Lightbulb },
  { value: "Settings", label: "Settings", icon: Settings },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Target", label: "Target", icon: Target },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "CheckCircle", label: "Check Circle", icon: CheckCircle },
  { value: "AlertCircle", label: "Alert Circle", icon: AlertCircle },
  { value: "Rocket", label: "Rocket", icon: Rocket },
];

const ICON_LOOKUP = PRESET_ICON_OPTIONS.reduce<Record<string, LucideIcon>>(
  (acc, option) => {
    acc[option.value] = option.icon;
    return acc;
  },
  {}
);

export function getPresetIcon(name?: string): LucideIcon {
  return (
    ICON_LOOKUP[name ?? PRESET_ICON_OPTIONS[0].value] ??
    PRESET_ICON_OPTIONS[0].icon
  );
}
