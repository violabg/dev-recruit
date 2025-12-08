import { InterviewStatus } from "@/lib/schemas";

export const normalizeStatus = (
  value?: InterviewStatus | "all"
): InterviewStatus | "all" => value || "all";
export const normalizeLanguage = (value?: string): string => value || "all";
export const normalizePosition = (value?: string): string =>
  value?.trim() || "all";
export const normalizePage = (value?: string) => {
  if (!value) return 1;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
};
