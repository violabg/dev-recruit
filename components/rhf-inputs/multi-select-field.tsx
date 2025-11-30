import { FieldValues } from "react-hook-form";
import { MultiSelect, OptionType } from "../ui/multi-select";
import { BaseController, BaseControllerProps } from "./base-controller";

type FieldSelectProps<T extends FieldValues> = {
  placeholder?: string;
  options: OptionType[];
} & Omit<BaseControllerProps<T>, "children">;

export function MultiSelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  required,
  options,
  placeholder,
}: FieldSelectProps<T>) {
  return (
    <BaseController
      control={control}
      name={name}
      label={label}
      required={required}
      description={description}
      disableFieldError={disableFieldError}
    >
      {({ field, fieldState }) => (
        <MultiSelect
          options={options}
          selected={field.value || []}
          onChange={field.onChange}
          placeholder={placeholder}
          invalid={!!fieldState.error}
        />
      )}
    </BaseController>
  );
}
