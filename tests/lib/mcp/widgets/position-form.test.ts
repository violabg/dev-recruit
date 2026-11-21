import { describe, expect, it } from "vitest";
import {
  OTHER_SKILLS_CATEGORY,
  positionFormWidget,
} from "@/lib/mcp/widgets/position-form";

const options = {
  allSkills: [{ label: "React", value: "React", category: "Framework" }],
  allSoftSkills: [{ label: "Comunicazione", value: "Comunicazione" }],
  experienceLevels: ["Junior", "Senior"],
  contractTypes: ["Freelance"],
};

describe("positionFormWidget", () => {
  it("prefills empty values when the assistant knows nothing", () => {
    const widget = positionFormWidget(options, {});

    expect(widget.prefill).toEqual({
      title: "",
      description: "",
      experienceLevel: "",
      skills: [],
      softSkills: [],
      contractType: "",
    });
    expect(widget.options).toEqual(options);
  });

  it("adds prefilled values missing from the reference data, once", () => {
    const widget = positionFormWidget(options, {
      experienceLevel: "Lead",
      contractType: "Freelance",
      skills: ["React", " Remix ", "Remix"],
      softSkills: ["Leadership"],
    });

    expect(widget.prefill.skills).toEqual(["React", "Remix"]);
    expect(widget.options.allSkills).toEqual([
      ...options.allSkills,
      { label: "Remix", value: "Remix", category: OTHER_SKILLS_CATEGORY },
    ]);
    expect(widget.options.allSoftSkills.map((skill) => skill.value)).toEqual([
      "Comunicazione",
      "Leadership",
    ]);
    expect(widget.options.experienceLevels).toEqual(["Junior", "Senior", "Lead"]);
    expect(widget.options.contractTypes).toEqual(["Freelance"]);
  });
});
