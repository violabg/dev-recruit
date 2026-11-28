import {
  applicationTrail,
  interviewTrail,
  positionTrail,
  sectionTrail,
} from "@/lib/utils/breadcrumbs";
import { describe, expect, it } from "vitest";

const position = { id: "p1", title: "Senior Frontend Developer" };

const application = {
  id: "app-1",
  candidateName: "Luca Bianchi",
  position,
};

describe("positionTrail", () => {
  it("roots the trail in Posizioni and shows the real title", () => {
    expect(positionTrail(position)).toEqual([
      { label: "Posizioni", href: "/dashboard/positions" },
      { label: "Senior Frontend Developer" },
    ]);
  });

  it("links the title when a tail follows it", () => {
    expect(positionTrail(position, { label: "Modifica" })).toEqual([
      { label: "Posizioni", href: "/dashboard/positions" },
      { label: "Senior Frontend Developer", href: "/dashboard/positions/p1" },
      { label: "Modifica" },
    ]);
  });

  it("drops the href of the last step of a longer tail", () => {
    expect(
      positionTrail(position, { label: "Criteri e domande" }, { label: "Nuovo" }),
    ).toEqual([
      { label: "Posizioni", href: "/dashboard/positions" },
      { label: "Senior Frontend Developer", href: "/dashboard/positions/p1" },
      { label: "Criteri e domande" },
      { label: "Nuovo" },
    ]);
  });
});

describe("applicationTrail", () => {
  it("adds the candidate name and keeps the position linked", () => {
    expect(applicationTrail(application)).toEqual([
      { label: "Posizioni", href: "/dashboard/positions" },
      { label: "Senior Frontend Developer", href: "/dashboard/positions/p1" },
      { label: "Luca Bianchi" },
    ]);
  });

  it("links the candidate when a tail follows", () => {
    expect(applicationTrail(application, { label: "Storia" })).toEqual([
      { label: "Posizioni", href: "/dashboard/positions" },
      { label: "Senior Frontend Developer", href: "/dashboard/positions/p1" },
      { label: "Luca Bianchi", href: "/dashboard/applications/app-1" },
      { label: "Storia" },
    ]);
  });
});

describe("interviewTrail", () => {
  it("names the round without a link and the current step last", () => {
    expect(
      interviewTrail(application, { id: "int-1", round: 2 }, "Preparazione"),
    ).toEqual([
      { label: "Posizioni", href: "/dashboard/positions" },
      { label: "Senior Frontend Developer", href: "/dashboard/positions/p1" },
      { label: "Luca Bianchi", href: "/dashboard/applications/app-1" },
      { label: "Colloquio 2" },
      { label: "Preparazione" },
    ]);
  });

  it("uses the real step names", () => {
    const labels = (["Preparazione", "Modifica preparazione", "Live", "Feedback"] as const).map(
      (step) =>
        interviewTrail(application, { id: "int-1", round: 1 }, step).at(-1)?.label,
    );

    expect(labels).toEqual([
      "Preparazione",
      "Modifica preparazione",
      "Live",
      "Feedback",
    ]);
  });
});

describe("sectionTrail", () => {
  it("shows the section as the current page when there is no tail", () => {
    expect(
      sectionTrail({ label: "Test", href: "/dashboard/quizzes" }),
    ).toEqual([{ label: "Test" }]);
  });

  it("links the section when a tail follows and drops the last href", () => {
    expect(
      sectionTrail({ label: "Test", href: "/dashboard/quizzes" }, {
        label: "Test React",
        href: "/dashboard/quizzes/q1",
      }),
    ).toEqual([
      { label: "Test", href: "/dashboard/quizzes" },
      { label: "Test React" },
    ]);
  });
});

describe("real labels", () => {
  it("never shows the generic word Dettaglio", () => {
    const trails = [
      positionTrail(position),
      positionTrail(position, { label: "Modifica" }),
      applicationTrail(application),
      applicationTrail(application, { label: "Storia" }),
      interviewTrail(application, { id: "int-1", round: 2 }, "Feedback"),
      sectionTrail({ label: "Candidati", href: "/dashboard/candidates" }),
    ];

    for (const trail of trails) {
      for (const crumb of trail) {
        expect(crumb.label).not.toBe("Dettaglio");
      }
    }
  });
});
