import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Props = {
  levels: string[];
  currentFilter: string;
  handleFilter: (value: string) => void;
  isPending: boolean;
  allLabel?: string;
  placeholder?: string;
};

export const PositionLevelsSelect = (props: Props) => {
  const {
    levels,
    currentFilter,
    handleFilter,
    isPending,
    allLabel = "Tutti i livelli",
    placeholder = "Livello",
  } = props;

  return (
    <Select
      name="filter"
      value={currentFilter}
      onValueChange={handleFilter}
      disabled={isPending}
    >
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Filter className="size-4" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {levels.map((level) => (
          <SelectItem key={level} value={level}>
            {level}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PositionLevelsSelect;
