/** Deep links from MCP tool results back to the dashboard pages. */

import { APP_URL } from "./config";

const url = (path: string) => `${APP_URL}${path}`;

export const links = {
  actionCenter: () => url("/dashboard"),
  position: (positionId: string) => url(`/dashboard/positions/${positionId}`),
  positionQuiz: (positionId: string) =>
    url(`/dashboard/positions/${positionId}?tab=quiz`),
  application: (applicationId: string) =>
    url(`/dashboard/applications/${applicationId}`),
  applicationDecision: (applicationId: string) =>
    url(`/dashboard/applications/${applicationId}/decision`),
  interviewPrepare: (applicationId: string, interviewId: string) =>
    url(
      `/dashboard/applications/${applicationId}/interviews/${interviewId}/prepare`,
    ),
  agenda: () => url("/dashboard/agenda"),
};
