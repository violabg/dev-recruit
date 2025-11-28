"use client";
import { Tag, TagInput } from "emblor";
import { RefAttributes, useCallback, useEffect, useId, useState } from "react";

type Props = RefAttributes<HTMLInputElement> & {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
};

export default function InputWithTag(props: Props) {
  const { id: propsId, onChange, value, ...rest } = props;
  const generatedId = useId();
  const id = propsId || generatedId;

  const [tags, setTags] = useState<Tag[]>(
    value?.map((tag) => ({ id: tag, text: tag })) || []
  );
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

  // Stable callback to notify parent of changes
  const notifyParent = useCallback(
    (newTags: Tag[]) => {
      onChange(newTags.map((t) => t.text));
    },
    [onChange]
  );

  useEffect(() => {
    // Notify parent of tag changes after local state updates to avoid
    // updating parent state during render of this component.
    notifyParent(tags);
  }, [tags, notifyParent]);

  return (
    <TagInput
      id={id}
      tags={tags}
      setTags={(newTags) => {
        setTags(newTags);
      }}
      placeholder="Add a tag"
      styleClasses={{
        inlineTagsContainer:
          "border-input rounded-md bg-background shadow-xs transition-[color,box-shadow] focus-within:border-ring outline-none focus-within:ring-[3px] focus-within:ring-ring/50 p-1 gap-1",
        input: "w-full min-w-[80px] shadow-none px-2 h-7",
        tag: {
          body: "h-7 relative bg-background border border-input hover:bg-background rounded-md font-medium text-xs ps-2 pe-7",
          closeButton:
            "absolute -inset-y-px -end-px p-0 rounded-e-md flex size-7 transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] text-muted-foreground/80 hover:text-foreground",
        },
      }}
      activeTagIndex={activeTagIndex}
      setActiveTagIndex={setActiveTagIndex}
    />
  );
}
