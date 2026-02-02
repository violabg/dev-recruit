"use client";

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
} from "../field";

type ControllerRenderParams<T extends FieldValues> = {
  field: ControllerRenderProps<T, FieldPath<T>>;
  fieldState: ControllerFieldState;
  formState: UseFormStateReturn<T>;
  ariaDescribedBy: string | undefined;
};

export type BaseControllerProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string | ReactNode;
  disableFieldError?: boolean;
  required?: boolean;
  orientation?: "vertical" | "horizontal";
  layout?: "standard" | "inline";
  containerClassName?: string;
  children: (params: ControllerRenderParams<T>) => ReactNode;
};

export function BaseController<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  required = false,
  orientation = "vertical",
  layout = "standard",
  containerClassName,
  children,
}: BaseControllerProps<T>) {
  const isInline = layout === "inline";

  return (
    <Controller
      name={name}
      control={control}
      rules={{ required }}
      render={({ field, fieldState, formState }) => {
        const ariaDescribedBy =
          [
            description ? `${field.name}-description` : undefined,
            fieldState.error ? `${field.name}-error` : undefined,
          ]
            .filter(Boolean)
            .join(" ") || undefined;

        const labelContent = label && (
          <FieldLabel
            htmlFor={field.name}
            className={isInline ? undefined : "font-bold"}
          >
            {label}
            {required && (
              <span aria-hidden className="ps-1 text-destructive">
                *
              </span>
            )}
          </FieldLabel>
        );

        const descriptionContent = description && (
          <FieldDescription id={`${field.name}-description`}>
            {description}
          </FieldDescription>
        );

        const errorContent = !disableFieldError && fieldState.invalid && (
          <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
        );

        return (
          <Field
            data-invalid={fieldState.invalid}
            orientation={orientation}
            className={containerClassName}
          >
            {isInline ? (
              <FieldContent className="gap-1">
                <div className="flex items-center gap-3">
                  {children({ field, fieldState, formState, ariaDescribedBy })}
                  <div className="space-y-1 leading-none">
                    {labelContent}
                    {descriptionContent}
                  </div>
                </div>
                {errorContent}
              </FieldContent>
            ) : (
              <>
                {labelContent}
                <FieldContent className="gap-1">
                  {children({ field, fieldState, formState, ariaDescribedBy })}
                  {descriptionContent}
                  {errorContent}
                </FieldContent>
              </>
            )}
          </Field>
        );
      }}
    />
  );
}
