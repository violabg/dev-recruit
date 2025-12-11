"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Position } from "@/lib/prisma/client";
import { BriefcaseIcon, CalendarIcon, CodeIcon, HeartIcon } from "lucide-react";

type PositionDetailCardClientProps = {
  position: Position;
};

export function PositionDetailCardClient({
  position,
}: PositionDetailCardClientProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-4">
        <div className="space-y-3">
          <CardTitle className="text-2xl line-clamp-2">
            {position.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="whitespace-nowrap">
              <BriefcaseIcon className="mr-1 w-3 h-3" />
              {position.experienceLevel || "Non specificato"}
            </Badge>
            {position.contractType && (
              <Badge variant="secondary" className="whitespace-nowrap">
                {position.contractType}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-6 pb-6 overflow-y-auto">
        {position.description && (
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground text-sm">
              Descrizione
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {position.description}
            </p>
          </div>
        )}

        {position.skills && position.skills.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CodeIcon className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Competenze Tecniche</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {position.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="font-normal text-xs"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {position.softSkills && position.softSkills.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HeartIcon className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Soft Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {position.softSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="bg-secondary/50 font-normal text-xs"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <CalendarIcon className="w-3 h-3" />
            <span>
              Creato il{" "}
              {new Date(position.createdAt).toLocaleDateString("it-IT", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
