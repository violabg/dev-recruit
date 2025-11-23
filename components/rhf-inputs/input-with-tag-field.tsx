import InputWithTags from "@/components/ui/input-with-tag";
import { FieldValues } from "react-hook-form";
import { BaseController, BaseControllerProps } from "./base-controller";

type Props<T extends FieldValues> = {
  placeholder?: string;
} & Omit<BaseControllerProps<T>, "children">;

export function InputWithTagField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  placeholder,
}: Props<T>) {
  return (
    <BaseController
      control={control}
      name={name}
      label={label}
      description={description}
      disableFieldError={disableFieldError}
    >
      {({ field }) => (
        <InputWithTags
          id={field.name}
          // the TagInput component expects an array of tags; we store it on the form field
          // keep compatibility: if value is undefined, pass []
          // when TagInput calls setTags, we forward to field.onChange
          // Tag type is not strictly typed here; we keep it as any for form storage
          value={(field.value as any) || []}
          onChange={(newTags: any) => field.onChange(newTags)}
        />
      )}
    </BaseController>
  );
}
