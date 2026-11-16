import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { MessagesSquare } from "lucide-react";

/** Tab Colloqui: conversations arrive with Phase 3. */
export function InterviewsTab() {
  return (
    <Empty className="border h-[220px]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessagesSquare />
        </EmptyMedia>
        <EmptyTitle>Nessun colloquio</EmptyTitle>
        <EmptyDescription>
          La pianificazione dei colloqui arriva con la Fase 3.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
