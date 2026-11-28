import { describe, expect, it } from "vitest";

import { APP_URL } from "@/lib/mcp/config";
import { links } from "@/lib/mcp/links";

describe("links", () => {
  it.each([
    [links.actionCenter(), "/dashboard"],
    [links.position("pos-1"), "/dashboard/positions/pos-1"],
    [links.positionQuiz("pos-1"), "/dashboard/positions/pos-1?tab=criteri"],
    [links.application("app-1"), "/dashboard/applications/app-1"],
    [links.applicationDecision("app-1"), "/dashboard/applications/app-1/decision"],
    [
      links.interviewPrepare("app-1", "int-1"),
      "/dashboard/applications/app-1/interviews/int-1/prepare",
    ],
    [links.agenda(), "/dashboard/agenda"],
  ])("builds %s on the app URL", (url, path) => {
    expect(url).toBe(`${APP_URL}${path}`);
  });
});
