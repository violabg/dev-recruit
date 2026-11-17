"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DecisionOutcomeValue } from "@/lib/schemas";
import type { MustWarning } from "@/lib/utils/decision-score";
import { useState } from "react";
import { DecisionForm } from "./decision-form";
import { DevilsAdvocatePanel } from "./devils-advocate-panel";

export type DecisionWorkspaceProps = {
  applicationId: string;
  warnings: MustWarning[];
  /** Interviews whose scores stay collapsed for the viewer */
  collapsedInterviewIds: string[];
  initial: {
    outcome: DecisionOutcomeValue | null;
    rationale: string | null;
  };
  disabledReason: string | null;
  /** Criterion id -> name */
  criteriaById: Record<string, string>;
};

/**
 * Decision form and devil's advocate side by side: the panel argues against
 * the outcome currently selected in the form.
 */
export function DecisionWorkspace({
  applicationId,
  warnings,
  collapsedInterviewIds,
  initial,
  disabledReason,
  criteriaById,
}: DecisionWorkspaceProps) {
  const [draft, setDraft] = useState<{
    outcome: DecisionOutcomeValue | null;
    rationale: string;
  }>({
    outcome: initial.outcome,
    rationale: initial.rationale ?? "",
  });

  return (
    <div className="gap-6 grid lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Registra la decisione</CardTitle>
        </CardHeader>
        <CardContent>
          <DecisionForm
            applicationId={applicationId}
            warnings={warnings}
            collapsedInterviewIds={collapsedInterviewIds}
            initial={initial}
            disabledReason={disabledReason}
            onDraftChange={setDraft}
          />
        </CardContent>
      </Card>
      <DevilsAdvocatePanel
        applicationId={applicationId}
        draft={draft}
        criteriaById={criteriaById}
      />
    </div>
  );
}
