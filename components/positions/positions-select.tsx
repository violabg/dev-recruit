import { Briefcase } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type PositionOption = {
  id: string;
  title: string;
};

type Props = {
  positions: PositionOption[];
  currentPosition: string;
  handlePosition: (value: string) => void;
  isPending: boolean;
  allLabel?: string;
  placeholder?: string;
};

const PositionsSelect = (props: Props) => {
  const {
    positions,
    currentPosition,
    handlePosition,
    isPending,
    allLabel = "Tutte le posizioni",
    placeholder = "Posizione",
  } = props;

  return (
    <Select
      name="position"
      value={currentPosition}
      onValueChange={handlePosition}
      disabled={isPending}
    >
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Briefcase className="size-4" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {positions.map((position) => (
          <SelectItem key={position.id} value={position.id}>
            {position.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PositionsSelect;
