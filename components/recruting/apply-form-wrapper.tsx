import { ApplyFormClient } from "@/components/recruting/apply-form-client";

type ApplyFormWrapperProps = {
  positions: { id: string; title: string }[];
  defaultPositionId?: string;
};

export function ApplyFormWrapper({
  positions,
  defaultPositionId,
}: ApplyFormWrapperProps) {
  return (
    <ApplyFormClient
      positions={positions}
      defaultPositionId={defaultPositionId}
    />
  );
}
