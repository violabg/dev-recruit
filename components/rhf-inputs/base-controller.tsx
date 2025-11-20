import { ReactNode } from "react";
import {
  Control,
  Controller,
  ControllerFieldState,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
  UseFormStateReturn,
} from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../ui/field";

type ControllerRenderParams<T extends FieldValues> = {
  field: ControllerRenderProps<T, FieldPath<T>>;
  fieldState: ControllerFieldState;
  formState: UseFormStateReturn<T>;
};

export type BaseControllerProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string | ReactNode;
  disableFieldError?: boolean;
  children: (params: ControllerRenderParams<T>) => ReactNode;
};

export function BaseController<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  children,
}: BaseControllerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState, formState }) => (
        <Field>
          {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
          <FieldContent>
            {children({ field, fieldState, formState })}
            {description && <FieldDescription>{description}</FieldDescription>}
            {!disableFieldError && fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </FieldContent>
        </Field>
      )}
    />
  );
}
