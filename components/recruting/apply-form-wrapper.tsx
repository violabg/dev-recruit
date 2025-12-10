"use client";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { useState } from "react";

type ApplyFormWrapperProps = {
  positions: { id: string; title: string }[];
  defaultPositionId?: string;
  onSelectedPositionsChange?: (positionIds: string[]) => void;
};

export function ApplyFormWrapper({
  positions,
  defaultPositionId,
  onSelectedPositionsChange,
}: ApplyFormWrapperProps) {
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>(
    defaultPositionId ? [defaultPositionId] : []
  );

  const handlePositionSelect = (values: string[]) => {
    setSelectedPositionIds(values);
    onSelectedPositionsChange?.(values);
  };

  return (
    <CandidateForm
      mode="apply"
      positions={positions}
      defaultPositionId={defaultPositionId}
      onPositionSelect={handlePositionSelect}
    />
  );
}
