import { ReactNode, RefAttributes } from "react";
import { FieldValues } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { BaseController, BaseControllerProps } from "./base-controller";

type FieldSelectProps<T extends FieldValues> = {
  placeholder?: string;
  onValueChange?: (value: string | number) => void;
  selectProps?: React.ComponentProps<typeof Select>;
  triggerProps?: React.ComponentProps<typeof SelectTrigger> &
    RefAttributes<HTMLButtonElement> & {
      size?: "sm" | "default";
    };
} & Omit<BaseControllerProps<T>, "children"> &
  (
    | {
        options: { value: string; label: string }[];
        children?: never;
      }
    | {
        options?: never;
        children: ReactNode;
      }
  );

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disableFieldError = false,
  options,
  placeholder,
  onValueChange,
  triggerProps,
  children,
  ...selectProps
}: FieldSelectProps<T>) {
  return (
    <BaseController
      control={control}
      name={name}
      label={label}
      description={description}
      disableFieldError={disableFieldError}
    >
      {({ field }) => (
        <Select
          value={String(field.value)}
          onValueChange={(value) => {
            // Try to parse as number, otherwise keep as string
            const numValue = parseInt(value);
            field.onChange(isNaN(numValue) ? value : numValue);
            onValueChange?.(numValue || value);
          }}
          {...selectProps}
        >
          <SelectTrigger {...triggerProps}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options
              ? options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              : children}
          </SelectContent>
        </Select>
      )}
    </BaseController>
  );
}
