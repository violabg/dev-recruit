import { FieldValues } from "react-hook-form";
import { Checkbox } from "../ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../ui/field";
import { Controller, Control, FieldPath } from "react-hook-form";

type FieldCheckboxProps<T extends FieldValues> = Omit<
  React.ComponentProps<typeof Checkbox>,
  "checked" | "onCheckedChange"
> & {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string;
  disableFieldError?: boolean;
  orientation?: "vertical" | "horizontal";
};

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  orientation = "horizontal",
  ...checkboxProps
}: FieldCheckboxProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field orientation={orientation}>
          <FieldContent>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                {...checkboxProps}
              />
              <div className="space-y-1 leading-none">
                {label && <FieldLabel>{label}</FieldLabel>}
                {description && (
                  <FieldDescription>{description}</FieldDescription>
                )}
              </div>
            </div>
          </FieldContent>
          {!disableFieldError && fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
