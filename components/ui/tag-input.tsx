"use client";

import { X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TagInputProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  allowDuplicates?: boolean;
  disabled?: boolean;
  showClear?: boolean;
};

export function TagInput({
  value,
  onValueChange,
  placeholder = "Add a tag…",
  maxTags,
  allowDuplicates = false,
  disabled = false,
  showClear = false,
  className,
  ...props
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  const addTag = React.useCallback(
    (raw: string) => {
      const tagsToAdd = raw
        .split(/[,,]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (tagsToAdd.length === 0) {
        return;
      }

      const newValue = [...value];
      let tagsAdded = false;

      for (const next of tagsToAdd) {
        if (
          !allowDuplicates &&
          newValue.some((t) => t.toLowerCase() === next.toLowerCase())
        ) {
          continue;
        }

        if (typeof maxTags === "number" && newValue.length >= maxTags) {
          break;
        }

        newValue.push(next);
        tagsAdded = true;
      }

      if (tagsAdded) {
        onValueChange(newValue);
      }
      setInputValue("");
    },
    [allowDuplicates, maxTags, onValueChange, value],
  );

  const removeTag = React.useCallback(
    (tag: string) => {
      onValueChange(value.filter((item) => item !== tag));
    },
    [onValueChange, value],
  );

  return (
    <div
      data-slot="tag-input"
      className={cn(
        "flex flex-wrap items-center gap-2 bg-transparent dark:bg-input/30 px-2.5 py-2 border border-input aria-invalid:border-destructive aria-invalid:focus-within:border-destructive focus-within:border-ring dark:aria-invalid:border-destructive/50 rounded-md aria-invalid:focus-within:ring-destructive/50 focus-within:ring-[3px] focus-within:ring-ring/50 w-full min-h-10 text-foreground",
        disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="group/badge relative ps-2 pe-1 border-none rounded-md h-7 font-medium text-secondary-foreground text-xs transition-colors"
        >
          <span className="max-w-56 truncate">{tag}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => removeTag(tag)}
            disabled={disabled}
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3.5" />
          </Button>
        </Badge>
      ))}
      <Input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }

          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag(inputValue);
            return;
          }

          if (event.key === "Backspace" && inputValue.length === 0) {
            onValueChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (disabled) {
            return;
          }

          if (inputValue.trim().length > 0) {
            addTag(inputValue);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent shadow-none p-0 border-0 focus-visible:ring-0 w-[18ch] min-w-[18ch] h-7"
      />
      {showClear && value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ms-auto text-muted-foreground hover:text-foreground"
          onClick={() => onValueChange([])}
          disabled={disabled}
          aria-label="Clear all tags"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
