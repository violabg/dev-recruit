import { waitingApplicationIds } from "@/lib/utils/action-center";
import { describe, expect, it } from "vitest";

const row = (applicationId: string) =>
  ({ applicationId }) as never;

describe("waitingApplicationIds", () => {
  it("unions the three action queues into a Set", () => {
    const ids = waitingApplicationIds({
      assessmentsToEvaluate: [row("app-1"), row("app-2")],
      interviewsWithoutKit: [row("app-2"), row("app-3")],
      feedbackToFill: [row("app-1"), row("app-4")],
    });

    expect(ids).toBeInstanceOf(Set);
    expect([...ids].sort()).toEqual(["app-1", "app-2", "app-3", "app-4"]);
  });

  it("counts a duplicated application once", () => {
    const ids = waitingApplicationIds({
      assessmentsToEvaluate: [row("app-1")],
      interviewsWithoutKit: [row("app-1")],
      feedbackToFill: [row("app-1")],
    });

    expect(ids.size).toBe(1);
    expect(ids.has("app-1")).toBe(true);
  });

  it("leaves out the stale and setup queues", () => {
    const ids = waitingApplicationIds({
      assessmentsToEvaluate: [row("app-1")],
      interviewsWithoutKit: [],
      feedbackToFill: [],
      openApplications: [row("app-stale")],
      positionsWithIncompleteSetup: [{ positionId: "pos-1" }],
    } as never);

    expect([...ids]).toEqual(["app-1"]);
  });
});
