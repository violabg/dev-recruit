import { FieldValues, useWatch } from "react-hook-form";
import { Textarea } from "../ui/textarea";
import { BaseController, BaseControllerProps } from "./base-controller";

type FieldTextareaProps<T extends FieldValues> = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name" | "id"
> & {
  maxLength?: number;
} & Omit<BaseControllerProps<T>, "children">;

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  maxLength,
  disableFieldError = false,
  ...textareaProps
}: FieldTextareaProps<T>) {
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
          <Textarea
            id={field.name}
            {...field}
            {...textareaProps}
            aria-invalid={!!fieldState.error}
            aria-describedby={
              fieldState.error ? `${field.name}-error` : undefined
            }
            className={`${maxLength ? "pr-16" : ""} ${
              textareaProps.className || ""
            }`}
          />
          {maxLength && (
            <div className="top-3 right-3 absolute bg-background/80 px-1 rounded text-muted-foreground text-xs pointer-events-none">
              {(fieldWatcher || "").length}/{maxLength}
            </div>
          )}
        </div>
      )}
    </BaseController>
  );
}
