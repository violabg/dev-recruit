import { FieldValues } from "react-hook-form";
import { TagInput } from "../tag-input";
import { BaseController, BaseControllerProps } from "./base-controller";

type Props<T extends FieldValues> = {
  placeholder?: string;
  showClear?: boolean;
} & Omit<BaseControllerProps<T>, "children">;

export function InputWithTagField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  placeholder,
  required,
  showClear,
}: Props<T>) {
  return (
    <BaseController
      control={control}
      name={name}
      label={label}
      required={required}
      description={description}
      disableFieldError={disableFieldError}
    >
      {({ field, fieldState, ariaDescribedBy }) => (
        <TagInput
          id={field.name}
          // The TagInput component expects an array of tags
          // Ensure we always pass an array, defaulting to empty if undefined
          placeholder={placeholder}
          value={(field.value as string[] | undefined) || []}
          onValueChange={(newTags: string[]) => field.onChange(newTags)}
          showClear={showClear}
          aria-invalid={!!fieldState.error}
          aria-describedby={ariaDescribedBy}
        />
      )}
    </BaseController>
  );
}
