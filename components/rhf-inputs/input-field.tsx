import { InputHTMLAttributes } from "react";
import { FieldValues, useWatch } from "react-hook-form";
import { Input } from "../ui/input";
import { BaseController, BaseControllerProps } from "./base-controller";

type FieldInputProps<T extends FieldValues> = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "id"
> & {
  maxLength?: number;
} & Omit<BaseControllerProps<T>, "children">;

export function InputField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  maxLength,
  disableFieldError = false,
  ...inputProps
}: FieldInputProps<T>) {
  const fieldWatcher = useWatch({
    control: control,
    name: name,
    disabled: !maxLength,
  });

  return (
    <BaseController
      control={control}
      name={name}
      label={label}
      description={description}
      disableFieldError={disableFieldError}
    >
      {({ field, fieldState }) => (
        <div className="relative">
          <Input
            id={field.name}
            aria-invalid={!!fieldState.error}
            aria-describedby={
              fieldState.error ? `${field.name}-error` : undefined
            }
            {...field}
            value={field.value ?? ""}
            {...inputProps}
            className={`${maxLength ? "pr-16" : ""} ${
              inputProps.className || ""
            }`}
          />
          {maxLength && (
            <div className="top-1/2 right-3 absolute text-muted-foreground text-xs -translate-y-1/2 pointer-events-none">
              {(fieldWatcher || "").length}/{maxLength}
            </div>
          )}
        </div>
      )}
    </BaseController>
  );
}
