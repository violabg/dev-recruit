import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { PresetForm } from "@/components/presets/preset-form";
import {
  Card,
  CardContent,
  } from "@/components/ui/card";

export default function NewPresetPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuovo preset"
        description="Definisci un preset per la generazione di domande che può essere riutilizzato nelle tue posizioni."
        actionBtns={
          <Link
            href={"/dashboard/presets" as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Preset
          </Link>
        }
      />
      <Card>
      <CardContent>
        <PresetForm />
      </CardContent>
      </Card>
    </div>
  );
}
