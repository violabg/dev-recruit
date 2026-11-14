"use client";
import { cn } from "cn";
import { XIcon } from "lucide-react";
import { RefAttributes, useId, useState } from "react";

type Props = RefAttributes<HTMLInputElement> & {
  id?: string;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  invalid?: boolean;
};

/** Splits pasted/typed text into trimmed, non-empty tags. */
const splitTags = (raw: string) =>
  raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

/**
 * Controlled tag input (Enter or "," adds a tag, Backspace on an empty
 * field removes the last one, pasted lists are split on commas/newlines).
 * Duplicates are ignored. Fully controlled by `value` / `onChange`.
 */
export default function InputWithTag({
  id: propsId,
  placeholder,
  value,
  onChange,
  invalid,
  ref,
}: Props) {
  const generatedId = useId();
  const id = propsId || generatedId;
  const tags = value ?? [];
  const [draft, setDraft] = useState("");

  const addTags = (raw: string) => {
    const next = [...tags];
    for (const tag of splitTags(raw)) {
      if (!next.includes(tag)) next.push(tag);
    }
    if (next.length !== tags.length) onChange(next);
    setDraft("");
  };

  const removeTag = (index: number) =>
    onChange(tags.filter((_, i) => i !== index));

  return (
    <div
      data-slot="input-with-tag"
      data-invalid={invalid || undefined}
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-lg border border-transparent bg-muted/50 p-1 shadow-sm transition-all outline-none focus-within:border-ring/50 focus-within:ring-4 focus-within:ring-ring/20 hover:border-ring/30 hover:bg-muted/80",
        invalid &&
          "border-destructive focus-within:border-destructive focus-within:ring-3 focus-within:ring-destructive/20",
      )}
    >
      {tags.map((tag, index) => (
        <span
          key={tag}
          data-slot="input-with-tag-chip"
          className="relative flex h-7 items-center rounded-md bg-secondary ps-2 pe-7 text-xs font-medium text-secondary-foreground transition-colors"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            aria-label={`Rimuovi ${tag}`}
            className="absolute -inset-y-px -end-px flex size-7 cursor-pointer items-center justify-center rounded-e-md bg-transparent p-0 text-secondary-foreground/70 transition-all outline-none hover:bg-black/5 hover:text-secondary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:bg-white/5"
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        id={id}
        value={draft}
        aria-invalid={invalid || undefined}
        placeholder={placeholder || "Aggiungi un tag..."}
        onChange={(e) => {
          const next = e.target.value;
          if (next.includes(",")) addTags(next);
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTags(draft);
          } else if (e.key === "Backspace" && draft === "" && tags.length) {
            removeTag(tags.length - 1);
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[,\n]/.test(text)) {
            e.preventDefault();
            addTags(draft + text);
          }
        }}
        className="h-7 min-w-20 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
