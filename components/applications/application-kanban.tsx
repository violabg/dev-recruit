"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { moveApplicationStageAction } from "@/lib/actions/applications";
import type { ApplicationCard } from "@/lib/data/applications";
import type { ApplicationStage } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import {
  KANBAN_COLUMNS,
  kanbanColumnOf,
  type KanbanColumnKey,
} from "@/lib/utils/application-stage";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import { cn } from "cn";
import { GripVertical, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  APPLICATION_STAGE_PRESENTATION,
  KANBAN_COLUMN_LABEL,
} from "./application-stage";
import { ApplicationStageBadge } from "./application-stage-badge";
import { MoveStageMenu } from "./move-stage-menu";

/** Dot of a column: the stage colour, muted for the closed column */
const columnDot = (key: KanbanColumnKey) =>
  key === "closed"
    ? "bg-muted-foreground"
    : APPLICATION_STAGE_PRESENTATION[key].dot;

const candidateName = (card: ApplicationCard) =>
  `${card.candidate.firstName} ${card.candidate.lastName}`.trim();

const isKanbanColumnKey = (value: string): value is KanbanColumnKey =>
  (KANBAN_COLUMNS as readonly string[]).includes(value);

/** Italian announcements: dnd-kit defaults are English only */
const announcements: Announcements = {
  onDragStart: ({ active }) =>
    `Candidatura di ${active.data.current?.candidateName ?? "un candidato"} selezionata.`,
  onDragOver: ({ over }) =>
    over
      ? `Colonna ${over.data.current?.columnLabel ?? ""}.`
      : "Fuori dalle colonne: rilascia per annullare.",
  onDragEnd: ({ active, over }) =>
    over
      ? `Candidatura di ${active.data.current?.candidateName ?? "un candidato"} spostata in ${over.data.current?.columnLabel ?? "un'altra colonna"}.`
      : `Candidatura di ${active.data.current?.candidateName ?? "un candidato"} lasciata nella colonna di partenza.`,
  onDragCancel: ({ active }) =>
    `Spostamento della candidatura di ${active.data.current?.candidateName ?? "un candidato"} annullato.`,
};

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Per spostare una candidatura, premi spazio o invio sulla maniglia di trascinamento, usa i tasti freccia per scegliere la colonna e premi di nuovo spazio o invio per confermare. Premi Esc per annullare.",
};

/**
 * Applications of a position grouped by stage: seven columns from applied to
 * hired plus "Chiuse" for rejected and withdrawn. Cards keep the order they
 * are received in (most recent stage change first). A card moves by dragging
 * its grip handle onto an open column, or with the stage menu of the card.
 * "Chiuse" cannot receive a drop: rejected and withdrawn share the column, so
 * the target stage is chosen from the menu.
 */
export function ApplicationKanban({
  applications,
}: {
  applications: ApplicationCard[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  // The card shows in the target column at once; the stage reverts by itself
  // when the action fails
  const [optimisticApplications, applyMove] = useOptimistic(
    applications,
    (state: ApplicationCard[], move: { id: string; stage: ApplicationStage }) =>
      state.map((item) =>
        item.id === move.id ? { ...item, stage: move.stage } : item,
      ),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const columns = new Map<KanbanColumnKey, ApplicationCard[]>(
    KANBAN_COLUMNS.map((key) => [key, []]),
  );
  for (const application of optimisticApplications) {
    columns.get(kanbanColumnOf(application.stage))?.push(application);
  }

  const activeCard =
    optimisticApplications.find(
      (application) => application.id === activeId,
    ) ?? null;

  const moveToStage = (application: ApplicationCard, stage: ApplicationStage) => {
    startTransition(async () => {
      applyMove({ id: application.id, stage });
      try {
        unwrap(
          await moveApplicationStageAction({
            applicationId: application.id,
            stage,
          }),
        );
        toast.success(
          `Candidatura spostata in «${APPLICATION_STAGE_PRESENTATION[stage].label}»`,
        );
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);

    const application = optimisticApplications.find(
      (item) => item.id === String(active.id),
    );
    if (!application || !over) return;

    const target = String(over.id);
    if (!isKanbanColumnKey(target) || target === "closed") return;
    if (target === kanbanColumnOf(application.stage)) return;

    moveToStage(application, target);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 pb-2 overflow-x-auto">
        {KANBAN_COLUMNS.map((key) => (
          <KanbanColumn
            key={key}
            columnKey={key}
            cards={columns.get(key) ?? []}
            dragging={activeId !== null}
            disabled={isPending}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard && (
          <Card className="py-3 w-56 shadow-lg rotate-2 cursor-grabbing">
            <CardContent className="flex flex-col gap-2 px-3">
              <span className="font-medium">{candidateName(activeCard)}</span>
              <span className="text-muted-foreground text-xs truncate">
                {activeCard.candidate.email}
              </span>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** One stage column: a drop target for the open stages only */
function KanbanColumn({
  columnKey,
  cards,
  dragging,
  disabled,
}: {
  columnKey: KanbanColumnKey;
  cards: ApplicationCard[];
  dragging: boolean;
  disabled: boolean;
}) {
  const droppable = columnKey !== "closed";
  const { setNodeRef, isOver } = useDroppable({
    id: columnKey,
    disabled: !droppable,
    data: { columnLabel: KANBAN_COLUMN_LABEL[columnKey] },
  });
  const highlighted = droppable && isOver;

  return (
    <section
      ref={setNodeRef}
      aria-label={KANBAN_COLUMN_LABEL[columnKey]}
      className={cn(
        "flex flex-col gap-3 min-w-56 shrink-0 rounded-xl transition-colors",
        highlighted && "bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      <h3 className="flex items-center gap-2 font-medium text-sm">
        <span
          aria-hidden
          className={cn("rounded-full size-2", columnDot(columnKey))}
        />
        {KANBAN_COLUMN_LABEL[columnKey]}
        <span className="text-muted-foreground tabular-nums">
          {cards.length}
        </span>
      </h3>

      {cards.length === 0 ? (
        <div className="flex justify-center items-center px-3 py-6 border border-dashed rounded-lg text-muted-foreground text-xs text-center">
          Nessuna candidatura
        </div>
      ) : (
        cards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            disabled={disabled}
          />
        ))
      )}

      {!droppable && dragging && (
        <p className="px-1 text-muted-foreground text-xs">
          Per scartare o ritirare usa «Sposta fase».
        </p>
      )}
    </section>
  );
}

/** One application card: the grip handle is the drag target */
function DraggableCard({
  card,
  disabled,
}: {
  card: ApplicationCard;
  disabled: boolean;
}) {
  const name = candidateName(card);
  const stage = card.stage;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled,
    data: { candidateName: name },
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn("py-3", isDragging && "opacity-40")}
    >
      <CardContent className="flex flex-col gap-2 px-3">
        <div className="flex justify-between items-start gap-1">
          <Link
            href={`/dashboard/applications/${card.id}` as never}
            className="font-medium hover:underline"
          >
            {name}
          </Link>
          <button
            type="button"
            aria-label={`Trascina la candidatura di ${name}`}
            className="mt-1 cursor-grab touch-none rounded-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
        </div>
        <span className="text-muted-foreground text-xs truncate">
          {card.candidate.email}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {kanbanColumnOf(stage) === "closed" && (
            <ApplicationStageBadge stage={stage} />
          )}
          {card.candidate.doNotContact && (
            <Badge className="bg-destructive/10 text-destructive">
              Non ricontattare
            </Badge>
          )}
          {card.assessmentCount > 0 && (
            <Badge variant="outline">{card.assessmentCount} test</Badge>
          )}
        </div>
        {card.owner && (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <UserRound className="size-3" />
            {card.owner.name}
          </span>
        )}
        <MoveStageMenu applicationId={card.id} stage={stage} />
      </CardContent>
    </Card>
  );
}
