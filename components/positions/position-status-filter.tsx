"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CircleDot, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** Default of the positions list: the open positions */
const DEFAULT_STATUS = "open";

const statusOptions = [
  { value: "open", label: "Aperte" },
  { value: "draft", label: "Bozze" },
  { value: "closed", label: "Chiuse" },
  { value: "all", label: "Tutte" },
];

/** Status filter of the positions list, bound to the URL param `status`. */
export function PositionStatusFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();

  const rawStatus = searchParams.get("status");
  const currentStatus = statusOptions.some(
    (option) => option.value === rawStatus,
  )
    ? (rawStatus as string)
    : DEFAULT_STATUS;

  const handleStatus = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    // The default needs no param: an absent status means "open"
    if (value && value !== DEFAULT_STATUS) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    startTransition(() => {
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      replace(url as "/dashboard/positions");
    });
  };

  return (
    <Select
      name="status"
      items={statusOptions}
      value={currentStatus}
      onValueChange={handleStatus}
      disabled={isPending}
    >
      <SelectTrigger aria-label="Stato della posizione">
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CircleDot className="size-4" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
