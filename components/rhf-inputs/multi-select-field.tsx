import { FieldValues } from "react-hook-form";
import { MultiSelect, OptionType } from "../ui/multi-select";
import { BaseController, BaseControllerProps } from "./base-controller";

type FieldSelectProps<T extends FieldValues> = {
  placeholder?: string;
  options: OptionType[];
  grouped?: boolean;
} & Omit<BaseControllerProps<T>, "children">;

export function MultiSelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  required,
  options,
  grouped,
  placeholder,
}: FieldSelectProps<T>) {
  return (
    <BaseController
      control={control}
      name={name}
      label={label}
      description={description}
      disableFieldError={disableFieldError}
      required={required}
    >
      {({ field, fieldState }) => (
        <MultiSelect
          options={options}
          selected={field.value || []}
          onChange={field.onChange}
          placeholder={placeholder}
          invalid={!!fieldState.error}
          grouped={grouped}
        />
      )}
    </BaseController>
  );
}
