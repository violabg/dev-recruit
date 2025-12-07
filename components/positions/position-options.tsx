import { getPositionsForSelect } from "@/lib/data/positions";
import { SelectItem } from "../ui/select";

const PositionOptions = async () => {
  const positions = await getPositionsForSelect();
  return (
    <>
      {positions.map((position) => (
        <SelectItem key={position.id} value={position.id}>
          {position.title}
        </SelectItem>
      ))}
    </>
  );
};

export default PositionOptions;
