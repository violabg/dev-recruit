import { FieldValues } from "react-hook-form";
import { MultiSelect, OptionType } from "../ui/multi-select";
import { BaseController, BaseControllerProps } from "./base-controller";

type FieldSelectProps<T extends FieldValues> = {
  placeholder?: string;
  options: OptionType[];
  grouped?: boolean;
  onChange?: (values: string[]) => void;
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
  onChange,
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
          onChange={(values) => {
            field.onChange(values);
            onChange?.(values);
          }}
          placeholder={placeholder}
          invalid={!!fieldState.error}
          grouped={grouped}
        />
      )}
    </BaseController>
  );
}
