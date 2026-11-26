"use client";

import {
  APPLICATION_STAGE_PRESENTATION,
  getApplicationStagePresentation,
} from "@/components/applications/application-stage";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { addCandidatesToPositionAction } from "@/lib/actions/applications";
import type { CandidatePickerOption } from "@/lib/data/candidates";
import type { ApplicationStage } from "@/lib/prisma/client";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import {
  DEFAULT_CANDIDATE_PICKER_FILTERS,
  filterCandidatePickerOptions,
  formatAssociationSummary,
  getCandidatePickerEligibility,
  type CandidatePickerFilters,
} from "@/lib/utils/candidate-picker";
import { cn } from "cn";
import { Loader2, Search, UserPlus } from "lucide-react";
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

const DISABLED_HINT = "Disponibile solo per posizioni aperte";

const STAGES = Object.keys(APPLICATION_STAGE_PRESENTATION) as ApplicationStage[];

const STAGE_ITEMS = [
  { value: "all", label: "Tutte le fasi" },
  ...STAGES.map((stage) => ({
    value: stage,
    label: getApplicationStagePresentation(stage).label,
  })),
];

const SORT_ITEMS = [
  { value: "name", label: "Nome" },
  { value: "newest", label: "Più recenti" },
];

type AssociateCandidatesDialogProps = {
  positionId: string;
  /** Every candidate, read on the server; resolved with `use()` below */
  candidatesPromise: Promise<CandidatePickerOption[]>;
  positionItems: { value: string; label: string }[];
  disabled?: boolean;
};

/**
 * Associates existing candidates with the position: filters, a multi-select
 * dropdown and the confirm button. Usable only on open positions.
 */
export function AssociateCandidatesDialog({
  positionId,
  candidatesPromise,
  positionItems,
  disabled = false,
}: AssociateCandidatesDialogProps) {
  const [open, setOpen] = useState(false);
  const hintId = useId();

  if (disabled) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title={DISABLED_HINT}
          aria-describedby={hintId}
        >
          <UserPlus className="mr-1 size-4" />
          Associa candidati
        </Button>
        <span id={hintId} className="sr-only">
          {DISABLED_HINT}
        </span>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        <UserPlus className="mr-1 size-4" />
        Associa candidati
      </DialogTrigger>
      <DialogContent className="flex flex-col sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Associa candidati esistenti</DialogTitle>
          <DialogDescription>
            Scegli i candidati già presenti da aggiungere a questa posizione.
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
          <AssociateCandidatesContent
            positionId={positionId}
            candidatesPromise={candidatesPromise}
            positionItems={positionItems}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

type AssociateCandidatesContentProps = {
  positionId: string;
  candidatesPromise: Promise<CandidatePickerOption[]>;
  positionItems: { value: string; label: string }[];
  onClose: () => void;
};

function AssociateCandidatesContent({
  positionId,
  candidatesPromise,
  positionItems,
  onClose,
}: AssociateCandidatesContentProps) {
  const options = use(candidatesPromise);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<CandidatePickerFilters>(
    DEFAULT_CANDIDATE_PICKER_FILTERS,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const anchor = useComboboxAnchor();
  const ids = {
    search: useId(),
    otherPosition: useId(),
    stage: useId(),
    hideDoNotContact: useId(),
    sort: useId(),
  };

  const byId = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const visible = useMemo(
    () => filterCandidatePickerOptions(options, filters),
    [options, filters],
  );

  const visibleIds = useMemo(() => visible.map((option) => option.id), [visible]);

  const otherPositionItems = useMemo(
    () => [
      { value: "all", label: "Tutte le posizioni" },
      ...positionItems.filter((item) => item.value !== positionId),
    ],
    [positionItems, positionId],
  );

  const isSelectable = (id: string) => {
    const option = byId.get(id);
    if (!option) return false;
    const { status } = getCandidatePickerEligibility(option, positionId);
    return status === "eligible" || status === "reopen";
  };

  const fullName = (id: string) => {
    const option = byId.get(id);
    return option ? `${option.firstName} ${option.lastName}` : id;
  };

  const updateFilters = (patch: Partial<CandidatePickerFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const result = unwrap(
          await addCandidatesToPositionAction({
            positionId,
            candidateIds: selected,
          }),
        );
        toast.success(
          formatAssociationSummary(result.createdCount, result.reopenedCount),
        );
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
              placeholder="Cerca per nome o email..."
              value={filters.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id={ids.otherPosition}>Altra posizione</Label>
          <Select
            items={otherPositionItems}
            value={filters.otherPositionId}
            onValueChange={(value) =>
              updateFilters({ otherPositionId: value ?? "all" })
            }
          >
            <SelectTrigger
              className="w-full"
              aria-labelledby={ids.otherPosition}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {otherPositionItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id={ids.stage}>Fase</Label>
          <Select
            items={STAGE_ITEMS}
            value={filters.stage}
            onValueChange={(value) =>
              updateFilters({
                stage: (value ?? "all") as CandidatePickerFilters["stage"],
              })
            }
          >
            <SelectTrigger className="w-full" aria-labelledby={ids.stage}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_ITEMS.map((item) => (
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
                sort: (value ?? "name") as CandidatePickerFilters["sort"],
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

        <div className="flex items-center gap-2 sm:self-end sm:pb-2">
          <Switch
            id={ids.hideDoNotContact}
            checked={filters.hideDoNotContact}
            onCheckedChange={(checked) =>
              updateFilters({ hideDoNotContact: checked })
            }
            aria-label="Nascondi non contattabili"
          />
          <Label htmlFor={ids.hideDoNotContact}>Nascondi non contattabili</Label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {visible.length} candidati
        </p>
        <Combobox<string, true>
          items={visibleIds}
          multiple
          filter={null}
          value={selected}
          onValueChange={(next) => setSelected(next.filter(isSelectable))}
          inputValue={filters.search}
          onInputValueChange={(value) => updateFilters({ search: value })}
          itemToStringLabel={fullName}
        >
          <ComboboxChips ref={anchor} className="w-full">
            <ComboboxValue>
              {selected.map((id) => (
                <ComboboxChip key={id} aria-label={fullName(id)}>
                  {fullName(id)}
                </ComboboxChip>
              ))}
            </ComboboxValue>
            <ComboboxChipsInput
              placeholder="Seleziona candidati..."
              aria-label="Seleziona candidati"
            />
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>Nessun candidato trovato</ComboboxEmpty>
            <ComboboxList>
              {(id: string) => {
                const option = byId.get(id);
                if (!option) return null;
                return (
                  <CandidateItem
                    key={id}
                    option={option}
                    positionId={positionId}
                  />
                );
              }}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
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
          Associa ({selected.length})
        </Button>
      </DialogFooter>
    </>
  );
}

function CandidateItem({
  option,
  positionId,
}: {
  option: CandidatePickerOption;
  positionId: string;
}) {
  const eligibility = getCandidatePickerEligibility(option, positionId);
  const isDisabled =
    eligibility.status === "already_in_position" ||
    eligibility.status === "max_positions";

  return (
    <ComboboxItem value={option.id} disabled={isDisabled}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="truncate">
          {option.firstName} {option.lastName}
        </span>
        <span className="text-muted-foreground text-xs truncate">
          {option.email}
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {eligibility.status === "reopen" && (
            <span className="text-muted-foreground">
              Ritirata: verrà riaperta
            </span>
          )}
          {eligibility.status === "already_in_position" && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-full font-medium",
                getApplicationStagePresentation(eligibility.stage).badge,
              )}
            >
              Già in selezione ·{" "}
              {getApplicationStagePresentation(eligibility.stage).label}
            </span>
          )}
          {eligibility.status === "max_positions" && (
            <span className="text-muted-foreground">Massimo 10 posizioni</span>
          )}
          {option.doNotContact && (
            <span className="text-warning">Da non contattare</span>
          )}
        </div>
      </div>
    </ComboboxItem>
  );
}
