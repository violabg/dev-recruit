import { getReferenceDataByCategory } from "@/lib/data/reference-data";
import { SelectItem } from "../ui/select";

const ProgrammingLanguageOptions = async () => {
  const languages = await getReferenceDataByCategory("programmingLanguage");
  return (
    <>
      {languages.map((lang) => (
        <SelectItem key={lang.id} value={lang.label.toLowerCase()}>
          {lang.label}
        </SelectItem>
      ))}
    </>
  );
};

export default ProgrammingLanguageOptions;
