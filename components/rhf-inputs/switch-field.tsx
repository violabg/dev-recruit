import { FieldValues } from "react-hook-form";
import { Switch } from "../ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../ui/field";
import { Controller, Control, FieldPath } from "react-hook-form";

type FieldSwitchProps<T extends FieldValues> = Omit<
  React.ComponentProps<typeof Switch>,
  "checked" | "onCheckedChange"
> & {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string;
  disableFieldError?: boolean;
};

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  ...switchProps
}: FieldSwitchProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          className="flex flex-row justify-between items-center p-3 border rounded-lg"
          orientation="horizontal"
        >
          <div className="space-y-0.5">
            {label && <FieldLabel className="text-base">{label}</FieldLabel>}
            {description && <FieldDescription>{description}</FieldDescription>}
          </div>
          <FieldContent className="flex justify-end items-center">
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              {...switchProps}
            />
          </FieldContent>
          {!disableFieldError && fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
