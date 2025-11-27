"use client";
import { Tag, TagInput } from "emblor";
import { RefAttributes, useEffect, useId, useState } from "react";

type Props = RefAttributes<HTMLInputElement> & {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
};

export default function InputWithTag(props: Props) {
  const { id: propsId, ...rest } = props;
  const generatedId = useId();
  const id = propsId || generatedId;

  const [tags, setTags] = useState<Tag[]>(
    rest.value?.map((tag) => ({ id: tag, text: tag })) || []
  );
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

  useEffect(() => {
    // Notify parent of tag changes after local state updates to avoid
    // updating parent state during render of this component.
    rest.onChange(tags.map((t) => t.text));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags]);

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
