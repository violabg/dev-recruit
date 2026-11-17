"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  buildInterviewIcs,
  buildInterviewSummary,
  type InterviewInviteData,
} from "@/lib/utils/interview-calendar";
import { CalendarArrowDown, ChevronDown, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Copyable summary and .ics file of an interview. The app sends no email:
 * the user shares them.
 */
export function InterviewInvitePanel({
  defaultOpen = false,
  ...data
}: InterviewInviteData & { defaultOpen?: boolean }) {
  const summary = buildInterviewSummary(data);

  // The page resolves `?scheduled=1` after the invitation panel has rendered,
  // so the default changes once. An uncontrolled Collapsible cannot do that:
  // the panel follows the prop until the user toggles it, then keeps its state.
  const [openState, setOpenState] = useState<boolean | null>(null);
  const open = openState ?? defaultOpen;

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Riepilogo copiato");
    } catch {
      toast.error("Impossibile copiare il riepilogo");
    }
  };

  const downloadIcs = () => {
    const blob = new Blob([buildInterviewIcs(data)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `colloquio-round-${data.round}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpenState}>
      <Card size="sm">
        <CardHeader>
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="group flex justify-between items-center w-full text-left"
              />
            }
          >
            <CardTitle className="text-sm">Riepilogo per gli invitati</CardTitle>
            <ChevronDown className="size-4 text-muted-foreground group-data-[panel-open]:rotate-180 transition-transform" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-3">
            <pre className="bg-muted/50 p-3 border rounded-md text-sm whitespace-pre-wrap">
              {summary}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copySummary}>
                <Copy className="size-4" />
                Copia riepilogo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadIcs}>
                <CalendarArrowDown className="size-4" />
                Scarica .ics
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              L&apos;app non invia email: condividi tu il riepilogo o il file
              .ics.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
