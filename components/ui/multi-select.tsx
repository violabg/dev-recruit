"use client";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import * as React from "react";

export type OptionType = {
  label: string;
  value: string;
  category?: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  grouped?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  showClear?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
  grouped = false,
  invalid = false,
  disabled = false,
  showClear = false,
}: MultiSelectProps) {
  const anchor = useComboboxAnchor();

  const groupedOptions = React.useMemo(() => {
    if (!grouped) return null;

    return options.reduce<Record<string, OptionType[]>>((acc, option) => {
      const category = option.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(option);
      return acc;
    }, {});
  }, [options, grouped]);

  const categories = groupedOptions ? Object.keys(groupedOptions) : [];

  // Convert string[] selected to OptionType[] for Combobox
  const selectedOptions = React.useMemo(
    () => options.filter((o) => selected.includes(o.value)),
    [options, selected],
  );

  // Handle value change from Combobox (converts OptionType[] back to string[])
  const handleValueChange = React.useCallback(
    (newValue: OptionType[]) => {
      onChange(newValue.map((item) => item.value));
    },
    [onChange],
  );

  return (
    <Combobox
      items={options}
      itemToStringValue={(item) => item.label}
      multiple
      value={selectedOptions}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <ComboboxChips
        ref={anchor}
        aria-invalid={invalid}
        className={cn("w-full", className)}
      >
        <ComboboxValue>
          {selectedOptions.map((option) => (
            <ComboboxChip key={option.value}>{option.label}</ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput placeholder={placeholder} />
        {showClear && selected.length > 0 && (
          <ComboboxClear disabled={disabled} className="ms-auto" />
        )}
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No results found.</ComboboxEmpty>
        <ComboboxList>
          {grouped && groupedOptions
            ? categories.map((category, index) => (
                <React.Fragment key={category}>
                  <ComboboxGroup>
                    <ComboboxLabel>{category}</ComboboxLabel>
                    {groupedOptions[category].map((option) => (
                      <ComboboxItem key={option.value} value={option}>
                        {option.label}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                  {index < categories.length - 1 && <ComboboxSeparator />}
                </React.Fragment>
              ))
            : (item) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
