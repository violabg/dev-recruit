import PageHeader from "@/components/page-header";
import { ReferenceDataForm } from "@/components/reference-data/reference-data-form";
import { ReferenceDataTable } from "@/components/reference-data/reference-data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  referenceCategories,
  referenceCategoryLabels,
  type ReferenceCategory,
} from "@/lib/constants/reference-categories";
import { getReferenceDataByCategory } from "@/lib/data/reference-data";
import { GripVertical, Plus } from "lucide-react";
import { Suspense } from "react";

const categories = referenceCategories.map((value) => ({
  value,
  label: referenceCategoryLabels[value],
}));

export default async function ReferenceDataPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="settings"
        title="Dati di riferimento"
        description="Linguaggi, framework, strumenti e altri valori proposti nei moduli"
      />

      <Tabs defaultValue="programmingLanguage" className="flex flex-col gap-6">
        <TabsList variant="line">
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            <div className="flex flex-col gap-4">
              <Dialog>
                <DialogTrigger render={<Button />}>
                  <Plus className="mr-2 w-4 h-4" />
                  Aggiungi {cat.label}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuovo elemento - {cat.label}</DialogTitle>
                  </DialogHeader>
                  <ReferenceDataForm
                    category={cat.value as ReferenceCategory}
                  />
                </DialogContent>
              </Dialog>

              <Suspense fallback={<ReferenceDataTableSkeleton />}>
                <ReferenceDataSection category={cat.value} />
              </Suspense>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** Mirrors ReferenceDataTable: unbordered table, drag handle, label, actions. */
function ReferenceDataTableSkeleton() {
  return (
    <TableSkeleton
      bordered={false}
      rows={6}
      columns={[
        {
          header: "",
          headClassName: "w-12",
          content: <GripVertical className="w-4 h-4 text-muted-foreground" />,
        },
        { header: "Etichetta" },
        {
          header: "Azioni",
          headClassName: "w-32",
          content: (
            <div className="flex gap-2">
              <Skeleton className="rounded-lg w-9 h-7" />
              <Skeleton className="rounded-lg w-9 h-7" />
            </div>
          ),
        },
      ]}
    />
  );
}

async function ReferenceDataSection({
  category,
}: {
  category: ReferenceCategory;
}) {
  const data = await getReferenceDataByCategory(category);

  return <ReferenceDataTable data={data} category={category} />;
}
