/**
 * Position form widget model: the reference options of the dashboard form,
 * plus the values the assistant prefilled. A prefilled value missing from
 * the options is added to them, so the form shows it and the person decides.
 */

import type { PositionFieldOptions } from "@/components/positions/position-fields";
import type { OpenPositionFormInput } from "@/lib/schemas";
import { links } from "../links";
import type { PositionFormWidget } from "./types";

/** Tool names the form calls: save the draft, then publish it */
export const POSITION_FORM_TOOLS = {
  save: "create_position_draft",
  publish: "publish_draft",
} as const;

/** Category of the skills the assistant proposed that are not in the list */
export const OTHER_SKILLS_CATEGORY = "Proposte dall'assistente";

const clean = (value: string | undefined) => value?.trim() ?? "";

const unique = (values: string[] | undefined) => [
  ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
];

const withValue = (list: string[], value: string) =>
  value && !list.includes(value) ? [...list, value] : list;

export function positionFormWidget(
  options: PositionFieldOptions,
  input: OpenPositionFormInput,
): PositionFormWidget {
  const prefill = {
    title: clean(input.title),
    description: clean(input.description),
    experienceLevel: clean(input.experienceLevel),
    skills: unique(input.skills),
    softSkills: unique(input.softSkills),
    contractType: clean(input.contractType),
  };

  const knownSkills = new Set(options.allSkills.map((skill) => skill.value));
  const knownSoftSkills = new Set(options.allSoftSkills.map((skill) => skill.value));

  return {
    kind: "position-form",
    prefill,
    options: {
      allSkills: [
        ...options.allSkills,
        ...prefill.skills
          .filter((skill) => !knownSkills.has(skill))
          .map((skill) => ({ label: skill, value: skill, category: OTHER_SKILLS_CATEGORY })),
      ],
      allSoftSkills: [
        ...options.allSoftSkills,
        ...prefill.softSkills
          .filter((skill) => !knownSoftSkills.has(skill))
          .map((skill) => ({ label: skill, value: skill })),
      ],
      experienceLevels: withValue(options.experienceLevels, prefill.experienceLevel),
      contractTypes: withValue(options.contractTypes, prefill.contractType),
    },
    tools: { ...POSITION_FORM_TOOLS },
    url: links.newPosition(),
  };
}
