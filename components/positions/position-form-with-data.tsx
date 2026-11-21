import { PositionFormSkeleton } from "./position-form-skeleton";
import { getPositionFieldOptions } from "@/lib/data/reference-data";
import { Position } from "@/lib/prisma/client";
import { Suspense } from "react";
import { PositionForm } from "./position-form";

interface PositionFormWithDataProps {
  position?: Position;
  onCancel?: () => void;
}

/**
 * Server component wrapper that fetches reference data from DB
 * and passes it to the client-side PositionForm component.
 * Includes Suspense fallback for graceful loading.
 */
export async function PositionFormWithData({
  position,
  onCancel,
}: PositionFormWithDataProps) {
  const options = await getPositionFieldOptions();
  return <PositionForm position={position} onCancel={onCancel} {...options} />;
}

/**
 * Wrapper component with Suspense boundary for safe rendering
 */
export function PositionFormLoading({
  position,
  onCancel,
}: PositionFormWithDataProps) {
  return (
    <Suspense fallback={<PositionFormSkeleton />}>
      <PositionFormWithData position={position} onCancel={onCancel} />
    </Suspense>
  );
}
