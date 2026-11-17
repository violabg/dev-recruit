import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { PositionFormLoading } from "@/components/positions/position-form-with-data";
import {
  Card,
  CardContent,
  } from "@/components/ui/card";

// Server component for new position page
export default async function NewPositionPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="positions"
        title="Nuova posizione"
        description="Compila il modulo sottostante per creare una nuova posizione"
        actionBtns={
          <Link
            href={"/dashboard/positions" as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Posizioni
          </Link>
        }
      />
      <Card>
      <CardContent>
        <PositionFormLoading />
      </CardContent>
      </Card>
    </div>
  );
}
