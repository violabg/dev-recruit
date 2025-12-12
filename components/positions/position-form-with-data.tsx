import { Skeleton } from "@/components/ui/skeleton";
import { referenceCategoryLabels } from "@/lib/constants/reference-categories";
import { getReferenceDataByCategory } from "@/lib/data/reference-data";
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
  const [
    programmingLanguages,
    frameworks,
    databases,
    tools,
    softSkillsData,
    experienceLevelsData,
    contractTypesData,
  ] = await Promise.all([
    getReferenceDataByCategory("programmingLanguage"),
    getReferenceDataByCategory("framework"),
    getReferenceDataByCategory("database"),
    getReferenceDataByCategory("tool"),
    getReferenceDataByCategory("soft_skill"),
    getReferenceDataByCategory("experience_level"),
    getReferenceDataByCategory("contract_type"),
  ]);

  // Combine all skills for the MultiSelect component
  const allSkillsFormatted = [
    ...programmingLanguages.map((skill) => ({
      label: skill.label,
      value: skill.label,
      category: referenceCategoryLabels.programmingLanguage,
    })),
    ...frameworks.map((skill) => ({
      label: skill.label,
      value: skill.label,
      category: referenceCategoryLabels.framework,
    })),
    ...databases.map((skill) => ({
      label: skill.label,
      value: skill.label,
      category: referenceCategoryLabels.database,
    })),
    ...tools.map((skill) => ({
      label: skill.label,
      value: skill.label,
      category: referenceCategoryLabels.tool,
    })),
  ];

  const allSoftSkillsFormatted = softSkillsData.map((item) => ({
    label: item.label,
    value: item.label,
  }));

  const experienceLevelsFormatted = experienceLevelsData.map(
    (item) => item.label
  );
  const contractTypesFormatted = contractTypesData.map((item) => item.label);

  return (
    <PositionForm
      position={position}
      onCancel={onCancel}
      allSkills={allSkillsFormatted}
      allSoftSkills={allSoftSkillsFormatted}
      experienceLevels={experienceLevelsFormatted}
      contractTypes={contractTypesFormatted}
    />
  );
}

/**
 * Fallback skeleton for loading state
 */
function PositionFormSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="w-full h-12" />
      <Skeleton className="w-full h-12" />
      <Skeleton className="w-full h-32" />
      <Skeleton className="w-full h-12" />
      <Skeleton className="w-full h-24" />
      <div className="flex gap-4">
        <Skeleton className="w-24 h-10" />
        <Skeleton className="w-24 h-10" />
      </div>
    </div>
  );
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
