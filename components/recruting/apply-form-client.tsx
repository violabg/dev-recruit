"use client";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { PositionDetailCardClient } from "@/components/positions/position-detail-card-client";
import { Card, CardContent } from "@/components/ui/card";
import { fetchPositionData } from "@/lib/actions/positions";
import type { Position } from "@/lib/prisma/client";
import { useEffect, useState, useTransition } from "react";
import { PositionDetailSkeleton } from "../positions/position-detail-skeleton";

type ApplyFormClientProps = {
  positions: { id: string; title: string }[];
  defaultPositionId?: string;
};

export function ApplyFormClient({
  positions,
  defaultPositionId,
}: ApplyFormClientProps) {
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>(
    defaultPositionId ? [defaultPositionId] : []
  );
  const [positionsData, setPositionsData] = useState<Record<string, Position>>(
    {}
  );
  const [isPending, startTransition] = useTransition();

  // Fetch data for default position on mount
  useEffect(() => {
    if (defaultPositionId && !positionsData[defaultPositionId]) {
      startTransition(async () => {
        const data = await fetchPositionData(defaultPositionId);
        if (data) {
          setPositionsData((prev) => ({ ...prev, [defaultPositionId]: data }));
        }
      });
    }
  }, [defaultPositionId, positionsData]);

  const handlePositionSelect = (values: string[]) => {
    setSelectedPositionIds(values);

    // Fetch data for newly selected positions
    startTransition(async () => {
      const newIds = values.filter((id) => !positionsData[id]);
      for (const id of newIds) {
        const data = await fetchPositionData(id);
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
