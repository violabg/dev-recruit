import { getPositionLevelsForSelect } from "@/lib/data/positions";
import { SelectItem } from "../ui/select";

const PositionLevelOptions = async () => {
  const levels = await getPositionLevelsForSelect();
  return (
    <>
      {levels.map((level) => (
        <SelectItem key={level} value={level}>
          {level}
        </SelectItem>
      ))}
    </>
  );
};

export default PositionLevelOptions;
