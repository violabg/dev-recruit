"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useTransition } from "react";

/**
 * "Solo le mie": a view filter on the applications the user is in charge of.
 * Off by default; it never limits what the user can open.
 */
export function MineToggle({ label = "Solo le mie" }: { label?: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();
  const id = useId();

  const checked = searchParams.get("mine") === "1";

  const handleChange = (value: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) {
      params.set("mine", "1");
    } else {
      params.delete("mine");
    }
    startTransition(() => {
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      replace(url as "/dashboard");
    });
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={handleChange}
        disabled={isPending}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
