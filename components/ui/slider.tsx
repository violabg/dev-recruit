"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";

import { cn } from "@/lib/utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onValueChange,
  ...props
}: SliderPrimitive.Root.Props) {
  // Determine thumb count based on the current value (controlled or uncontrolled)
  const _values = React.useMemo(() => {
    if (Array.isArray(value)) return value;
    if (typeof value === "number") return [value];
    if (Array.isArray(defaultValue)) return defaultValue;
    if (typeof defaultValue === "number") return [defaultValue];
    return [min]; // Single thumb fallback
  }, [value, defaultValue, min]);

  // In controlled mode (value provided), don't pass defaultValue
  const isControlled = value !== undefined;

  return (
    <SliderPrimitive.Root
      className="data-horizontal:w-full data-vertical:h-full"
      data-slot="slider"
      defaultValue={isControlled ? undefined : defaultValue}
      value={value}
      min={min}
      max={max}
      onValueChange={onValueChange}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control
        className={cn(
          "relative flex data-vertical:flex-col items-center data-disabled:opacity-50 w-full data-vertical:w-auto data-vertical:h-full data-vertical:min-h-40 touch-none select-none",
          className,
        )}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative bg-muted rounded-full data-horizontal:w-full data-vertical:w-1 data-horizontal:h-1 data-vertical:h-full overflow-hidden select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary data-vertical:w-full data-horizontal:h-full select-none"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="block after:absolute relative after:-inset-2 bg-white disabled:opacity-50 border border-ring rounded-full focus-visible:outline-hidden ring-ring/50 hover:ring-[3px] focus-visible:ring-[3px] active:ring-[3px] size-3 transition-[color,box-shadow] disabled:pointer-events-none select-none shrink-0"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
