import { getReferenceDataByCategory } from "@/lib/data/reference-data";
import { SelectItem } from "../ui/select";

const ProgrammingLanguageOptions = async () => {
  const positions = await getReferenceDataByCategory("programmingLanguage");

  return (
    <>
      {positions.map((position) => (
        <SelectItem key={position.id} value={position.label}>
          {position.label}
        </SelectItem>
      ))}
    </>
  );
};

export default ProgrammingLanguageOptions;
