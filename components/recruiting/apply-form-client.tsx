"use client";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { PositionDetailCardClient } from "@/components/positions/position-detail-card-client";
import { Card, CardContent } from "@/components/ui/card";
import { fetchPositionDataAction } from "@/lib/actions/positions";
import type { Position } from "@/lib/prisma/client";
import { useState, useTransition } from "react";
import { PositionDetailSkeleton } from "../positions/position-detail-skeleton";

type ApplyFormClientProps = {
  positions: { id: string; title: string }[];
  defaultPositionId?: string;
  /** Details of the preselected position, loaded (cached) on the server */
  defaultPosition?: Position | null;
};

export function ApplyFormClient({
  positions,
  defaultPositionId,
  defaultPosition,
}: ApplyFormClientProps) {
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>(
    defaultPositionId ? [defaultPositionId] : []
  );
  // Seeded from the server render: no client fetch waterfall on mount.
  const [positionsData, setPositionsData] = useState<Record<string, Position>>(
    () =>
      defaultPositionId && defaultPosition
        ? { [defaultPositionId]: defaultPosition }
        : {}
  );
  const [isPending, startTransition] = useTransition();

  const handlePositionSelect = (values: string[]) => {
    setSelectedPositionIds(values);

    // Fetch data for newly selected positions
    startTransition(async () => {
      const newIds = values.filter((id) => !positionsData[id]);
      for (const id of newIds) {
        const data = await fetchPositionDataAction(id);
        if (data) {
          setPositionsData((prev) => ({ ...prev, [id]: data }));
        }
      }
    });
  };

  // Reverse to show last selected on top
  const reversedPositionIds = [...selectedPositionIds].reverse();

  return (
    <div className="gap-6 grid grid-cols-1 lg:grid-cols-2 h-full">
      {/* Left: Form */}
      <div>
        <CandidateForm
          mode="apply"
          positions={positions}
          defaultPositionId={defaultPositionId}
          onPositionSelect={handlePositionSelect}
          disabled={!!defaultPositionId}
        />
      </div>

      {/* Right: Selected Positions */}
      <div className="space-y-4 overflow-y-auto">
        {selectedPositionIds.length === 0 ? (
          <Card className="flex justify-center items-center border-dashed h-full min-h-96">
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Seleziona una posizione per visualizzare i dettagli
              </p>
            </CardContent>
          </Card>
        ) : (
          reversedPositionIds.map((positionId) => {
            const positionData = positionsData[positionId];
            if (!positionData && isPending) {
              return <PositionDetailSkeleton key={positionId} />;
            }
            if (!positionData) return null;

            return (
              <PositionDetailCardClient
                key={positionId}
                position={positionData}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
