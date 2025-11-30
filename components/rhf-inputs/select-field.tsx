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

const EMPTY_SELECT_VALUE = "__select_empty__";

type SelectOption = {
  value: string;
  label: string;
  leading?: ReactNode;
};

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
        options: SelectOption[];
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
  required,
  ...selectProps
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
        <Select
          value={
            field.value === undefined ||
            field.value === null ||
            field.value === ""
              ? EMPTY_SELECT_VALUE
              : String(field.value)
          }
          onValueChange={(value) => {
            if (value === EMPTY_SELECT_VALUE) {
              field.onChange(undefined);
              onValueChange?.("");
              return;
            }

            if (value === "") {
              field.onChange(undefined);
              onValueChange?.(value);
              return;
            }

            // Try to parse as number, otherwise keep as string
            const numValue = parseInt(value);
            if (isNaN(numValue)) {
              field.onChange(value);
              onValueChange?.(value);
            } else {
              field.onChange(numValue);
              onValueChange?.(numValue);
            }
          }}
          {...selectProps}
        >
          <SelectTrigger
            aria-required={required}
            aria-invalid={!!fieldState.error}
            data-invalid={!!fieldState.error}
            {...triggerProps}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options
              ? options.map((option) => {
                  const optionValue =
                    option.value === "" ? EMPTY_SELECT_VALUE : option.value;

                  return (
                    <SelectItem key={optionValue} value={optionValue}>
                      {option.leading ? (
                        <span className="flex items-center gap-2">
                          {option.leading}
                          <span>{option.label}</span>
                        </span>
                      ) : (
                        option.label
                      )}
                    </SelectItem>
                  );
                })
              : children}
          </SelectContent>
        </Select>
      )}
    </BaseController>
  );
}
