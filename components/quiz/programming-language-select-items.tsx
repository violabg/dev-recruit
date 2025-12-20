import { getReferenceDataByCategory } from "@/lib/data/reference-data";
import { SelectItem } from "../ui/select";

export async function ProgrammingLanguageSelectItems() {
  const programmingLanguage = await getReferenceDataByCategory(
    "programmingLanguage"
  );

  return (
    <>
      {programmingLanguage.map((lang) => (
        <SelectItem key={lang.id} value={lang.label}>
          {lang.label}
        </SelectItem>
      ))}
    </>
  );
}
