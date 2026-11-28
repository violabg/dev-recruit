import { Badge } from "@/components/ui/badge";
import type { PublicPosition } from "@/lib/data/positions";

/** "Mid · Tempo indeterminato": the level and contract of a position. */
export function positionMeta(position: PublicPosition) {
  return [position.experienceLevel, position.contractType]
    .filter(Boolean)
    .join(" · ");
}

/** Description and skills of a position, as a visitor reads them. */
export function PositionDetails({ position }: { position: PublicPosition }) {
  return (
    <div className="flex flex-col gap-5">
      {position.description && (
        <p className="max-w-prose text-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {position.description}
        </p>
      )}

      {position.skills.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-sm">Competenze tecniche</h3>
          <ul className="flex flex-wrap gap-1.5">
            {position.skills.map((skill) => (
              <li key={skill}>
                <Badge variant="outline" className="bg-card font-normal">
                  {skill}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {position.softSkills.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-sm">Soft skill</h3>
          <ul className="flex flex-wrap gap-1.5">
            {position.softSkills.map((skill) => (
              <li key={skill}>
                <Badge variant="secondary" className="font-normal">
                  {skill}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
