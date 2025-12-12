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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  referenceCategories,
  referenceCategoryLabels,
  type ReferenceCategory,
} from "@/lib/constants/reference-categories";
import { getReferenceDataByCategory } from "@/lib/data/reference-data";
import { Plus } from "lucide-react";
import { Suspense } from "react";

const categories = referenceCategories.map((value) => ({
  value,
  label: referenceCategoryLabels[value],
}));

export default async function ReferenceDataPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-3xl">Dati di Riferimento</h1>
      </div>

      <Tabs defaultValue="programmingLanguage" className="space-y-6">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            <div className="space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 w-4 h-4" />
                    Aggiungi {cat.label}
                  </Button>
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

              <Suspense fallback={<Skeleton className="h-64" />}>
                <ReferenceDataSection category={cat.value} />
              </Suspense>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
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
