"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { addExistingQuizzesToPositionAction } from "@/lib/actions/quizzes";
import type { QuizPickerOption } from "@/lib/data/quizzes";
import type { QuestionType } from "@/lib/prisma/client";
import { MAX_QUIZZES_PER_ADD } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import {
  DEFAULT_QUIZ_PICKER_FILTERS,
  filterQuizPickerOptions,
  formatQuizAddSummary,
  getAddableQuizOptions,
  getQuizPickerLevelItems,
  getQuizPickerPositionItems,
  hasTitleOnPosition,
  type QuizPickerFilters,
} from "@/lib/utils/quiz-picker";
import { getQuestionTypeLabel } from "@/lib/utils/quiz-form-utils";
import { CopyPlus, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Suspense,
  use,
  useId,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

/** Question types in enum order */
const QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "open_question",
  "code_snippet",
  "behavioral_scenario",
];

const SORT_ITEMS = [
  { value: "newest", label: "Più recenti" },
  { value: "title", label: "Titolo A-Z" },
];

type AddExistingQuizzesDialogProps = {
  positionId: string;
  /** Every quiz, read on the server; resolved with `use()` inside Suspense */
  quizzesPromise: Promise<QuizPickerOption[]>;
  /** Titles of the quizzes already on this position (title-conflict hint) */
  positionQuizTitles: string[];
};

/**
 * Adds copies of existing quizzes of other positions to the position:
 * filters, a multi-select dropdown and the confirm button. Available on every
 * position status.
 */
export function AddExistingQuizzesDialog({
  positionId,
  quizzesPromise,
  positionQuizTitles,
}: AddExistingQuizzesDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        <CopyPlus className="mr-1 size-4" />
        Aggiungi quiz esistenti
      </DialogTrigger>
      <DialogContent className="flex flex-col sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Aggiungi quiz esistenti</DialogTitle>
          <DialogDescription>
            Scegli i quiz già presenti da copiare in questa posizione: ogni
            quiz viene aggiunto come copia indipendente.
          </DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex flex-col gap-2 py-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          }
        >
          <AddExistingQuizzesContent
            positionId={positionId}
            quizzesPromise={quizzesPromise}
            positionQuizTitles={positionQuizTitles}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

type AddExistingQuizzesContentProps = AddExistingQuizzesDialogProps & {
  onClose: () => void;
};

function AddExistingQuizzesContent({
  positionId,
  quizzesPromise,
  positionQuizTitles,
  onClose,
}: AddExistingQuizzesContentProps) {
  const all = use(quizzesPromise);
  const options = useMemo(
    () => getAddableQuizOptions(all, positionId),
    [all, positionId],
  );
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<QuizPickerFilters>(
    DEFAULT_QUIZ_PICKER_FILTERS,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const anchor = useComboboxAnchor();
  const ids = {
    search: useId(),
    position: useId(),
    level: useId(),
    sort: useId(),
    questionTypes: useId(),
    questionTypesHint: useId(),
  };
  const typeIdPrefix = useId();

  const byId = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const visible = useMemo(
    () => filterQuizPickerOptions(options, filters),
    [options, filters],
  );

  const visibleIds = useMemo(() => visible.map((option) => option.id), [visible]);

  const positionItems = useMemo(
    () => getQuizPickerPositionItems(options),
    [options],
  );

  const levelItems = useMemo(() => getQuizPickerLevelItems(options), [options]);

  const quizTitle = (id: string) => byId.get(id)?.title ?? id;

  const updateFilters = (patch: Partial<QuizPickerFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  const toggleQuestionType = (type: QuestionType, checked: boolean) =>
    setFilters((current) => {
      const chosen = new Set(current.questionTypes);
      if (checked) chosen.add(type);
      else chosen.delete(type);
      return {
        ...current,
        questionTypes: QUESTION_TYPES.filter((t) => chosen.has(t)),
      };
    });

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const result = unwrap(
          await addExistingQuizzesToPositionAction({
            positionId,
            quizIds: selected,
          }),
        );
        toast.success(formatQuizAddSummary(result.count));
        setSelected([]);
        onClose();
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  };

  return (
    <>
      <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 py-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={ids.search}>Cerca</Label>
          <div className="relative">
            <Search className="top-1/2 left-3 absolute size-4 text-muted-foreground -translate-y-1/2" />
            <Input
              id={ids.search}
              placeholder="Cerca per titolo..."
              value={filters.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id={ids.position}>Posizione</Label>
          <Select
            items={positionItems}
            value={filters.positionId}
            onValueChange={(value) =>
              updateFilters({ positionId: value ?? "all" })
            }
          >
            <SelectTrigger className="w-full" aria-labelledby={ids.position}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {positionItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id={ids.level}>Livello</Label>
          <Select
            items={levelItems}
            value={filters.level}
            onValueChange={(value) => updateFilters({ level: value ?? "all" })}
          >
            <SelectTrigger className="w-full" aria-labelledby={ids.level}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id={ids.sort}>Ordina</Label>
          <Select
            items={SORT_ITEMS}
            value={filters.sort}
            onValueChange={(value) =>
              updateFilters({
                sort: (value ?? "newest") as QuizPickerFilters["sort"],
              })
            }
          >
            <SelectTrigger className="w-full" aria-labelledby={ids.sort}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label id={ids.questionTypes}>Tipi di domanda</Label>
          <div
            role="group"
            aria-labelledby={ids.questionTypes}
            aria-describedby={ids.questionTypesHint}
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            {QUESTION_TYPES.map((type) => {
              const checkboxId = `${typeIdPrefix}-${type}`;
              return (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={checkboxId}
                    checked={filters.questionTypes.includes(type)}
                    onCheckedChange={(checked) =>
                      toggleQuestionType(type, checked)
                    }
                  />
                  <Label htmlFor={checkboxId} className="font-normal">
                    {getQuestionTypeLabel(type)}
                  </Label>
                </div>
              );
            })}
          </div>
          <p
            id={ids.questionTypesHint}
            className="text-muted-foreground text-xs"
          >
            Mostra i quiz che contengono tutti i tipi scelti
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {visible.length} quiz
        </p>
        <Combobox<string, true>
          items={visibleIds}
          multiple
          filter={null}
          value={selected}
          onValueChange={(next) =>
            setSelected(next.slice(0, MAX_QUIZZES_PER_ADD))
          }
          inputValue={filters.search}
          onInputValueChange={(value) => updateFilters({ search: value })}
          itemToStringLabel={quizTitle}
        >
          <ComboboxChips ref={anchor} className="w-full">
            <ComboboxValue>
              {selected.map((id) => (
                <ComboboxChip key={id} aria-label={quizTitle(id)}>
                  {quizTitle(id)}
                </ComboboxChip>
              ))}
            </ComboboxValue>
            <ComboboxChipsInput
              placeholder="Seleziona quiz..."
              aria-label="Seleziona quiz"
            />
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>Nessun quiz trovato</ComboboxEmpty>
            <ComboboxList>
              {(id: string) => {
                const option = byId.get(id);
                if (!option) return null;
                return (
                  <QuizItem
                    key={id}
                    option={option}
                    positionQuizTitles={positionQuizTitles}
                  />
                );
              }}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {selected.length === MAX_QUIZZES_PER_ADD && (
          <p className="text-muted-foreground text-xs">
            Massimo 20 quiz alla volta
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={selected.length === 0 || isPending}
        >
          {isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
          Aggiungi ({selected.length})
        </Button>
      </DialogFooter>
    </>
  );
}

function QuizItem({
  option,
  positionQuizTitles,
}: {
  option: QuizPickerOption;
  positionQuizTitles: string[];
}) {
  return (
    <ComboboxItem value={option.id}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="truncate">{option.title}</span>
        <span className="text-muted-foreground text-xs truncate">
          {option.position.title} · {option.position.experienceLevel}
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {option.questionCount} domande
          </span>
          {option.questionTypes.map((type) => (
            <span
              key={type}
              className="bg-muted px-2 py-0.5 border border-border rounded-full text-muted-foreground"
            >
              {getQuestionTypeLabel(type)}
            </span>
          ))}
          <span className="text-muted-foreground">
            {option.timeLimit
              ? `${option.timeLimit} minuti`
              : "Nessun limite di tempo"}
          </span>
          {hasTitleOnPosition(option, positionQuizTitles) && (
            <span className="text-warning">
              Titolo già presente in questa posizione
            </span>
          )}
        </div>
      </div>
    </ComboboxItem>
  );
}
