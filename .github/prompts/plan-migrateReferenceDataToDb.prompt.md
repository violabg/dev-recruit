# Plan: Migrate Position Reference Data to Database with CRUD

Migrating the hardcoded arrays in `components/positions/data.ts` (skills, frameworks, soft skills, contract types, experience levels) to a database-backed system with admin UI and cached retrieval.

## Architecture Decision (Option A)

### Single Entity with Category Discriminator ✅

Use one `ReferenceData` table with a `category` field. Initial categories:

- "skill", "framework", "database", "tool", "soft_skill", "contract_type", "experience_level"

Pros: One CRUD UI, shared logic, simpler schema. Cons: Shared fields only (acceptable for label lists).

### Type-Safe Category Registry (Future-Proof)

To support adding new categories later while keeping strong types during development:

- Maintain a central TypeScript registry for categories (const array + union type)
- Use that registry in Zod schemas and UI
- Keep DB `category` as `String` for flexibility; adding a new category is code-only change + optional seed

Files to add:

- `lib/constants/reference-categories.ts` — source of truth for categories
- `lib/schemas/reference-data.ts` — imports from constants for Zod enums

This balances runtime flexibility (no Prisma enum migration needed) with compile-time type safety.

## Implementation Steps

### 1. Create Database Schema

File: `prisma/schema.prisma`

Add new model:

```prisma
model ReferenceData {
  id       String   @id @default(cuid())
  category String   // "skill", "framework", "database", "tool", "soft_skill", "contract_type", "experience_level"
  label    String
  isActive Boolean  @default(true)
  order    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([category, label])
  @@index([category, isActive, order])
  @@map("reference_data")
}
```

Run migration:

```bash
pnpm db:push
pnpm db:generate
```

### 2. Seed Database

File: `prisma/seed.ts`

Add seeding logic:

```typescript
// Import current data from components/positions/data.ts
const referenceDataSeed = [
  { category: "skill", items: programmingLanguages },
  { category: "framework", items: frameworks },
  { category: "database", items: databases },
  { category: "tool", items: tools },
  { category: "soft_skill", items: softSkills },
  { category: "contract_type", items: contractTypes },
  { category: "experience_level", items: experienceLevels },
];

for (const { category, items } of referenceDataSeed) {
  for (let i = 0; i < items.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_label: { category, label: items[i] } },
      update: {},
      create: {
        category,
        label: items[i],
        order: i,
        isActive: true,
      },
    });
  }
}
```

Run seed:

```bash
pnpm db:seed
```

### 3. Create Data Layer (Cache Components)

File: `lib/data/reference-data.ts`

```typescript
"use cache";
import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export async function getAllReferenceData() {
  cacheLife("hours");
  cacheTag("reference-data");

  return await prisma.referenceData.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
}

export async function getReferenceDataByCategory(category: string) {
  cacheLife("hours");
  cacheTag("reference-data", `reference-data-${category}`);

  return await prisma.referenceData.findMany({
    where: { category, isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, label: true },
  });
}

export async function getAllReferenceDataGrouped() {
  cacheLife("hours");
  cacheTag("reference-data");

  const data = await prisma.referenceData.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  // Group by category
  return data.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof data>);
}
```

### 4. Create Cache Utilities

File: `lib/utils/cache-utils.ts` (add to existing)

```typescript
export function invalidateReferenceDataCache(category?: string) {
  updateTag("reference-data");
  if (category) {
    updateTag(`reference-data-${category}`);
  }
}
```

### 5. Create Zod Schemas

File: `lib/schemas/reference-data.ts`

```typescript
import { z } from "zod/v4";
import {
  referenceCategories,
  type ReferenceCategory,
} from "@/lib/constants/reference-categories";

export const referenceDataFormSchema = z.object({
  category: z.enum(referenceCategories, {
    error: "Categoria non valida",
  }),
  label: z.string().min(1, { error: "L'etichetta è obbligatoria" }),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const updateReferenceDataFormSchema = referenceDataFormSchema
  .partial()
  .extend({
    id: z.string().cuid(),
  });

export const reorderReferenceDataSchema = z.object({
  category: z.enum(referenceCategories),
  itemIds: z.array(z.string().cuid()),
});

export type ReferenceDataFormData = z.infer<typeof referenceDataFormSchema>;
export type UpdateReferenceDataFormData = z.infer<
  typeof updateReferenceDataFormSchema
>;
export type ReferenceCategoryType = ReferenceCategory;
```

### 6. Create Server Actions

File: `lib/actions/reference-data.ts`

```typescript
"use server";

import { requireUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import {
  referenceDataFormSchema,
  updateReferenceDataFormSchema,
  reorderReferenceDataSchema,
} from "@/lib/schemas/reference-data";
import { invalidateReferenceDataCache } from "@/lib/utils/cache-utils";
import { redirect } from "next/navigation";

export async function createReferenceDataAction(values: unknown) {
  await requireUser();

  const payload = referenceDataFormSchema.parse(values);

  // Check for duplicates
  const existing = await prisma.referenceData.findUnique({
    where: {
      category_label: {
        category: payload.category,
        label: payload.label,
      },
    },
  });

  if (existing) {
    throw new Error("Questo elemento esiste già");
  }

  await prisma.referenceData.create({
    data: payload,
  });

  invalidateReferenceDataCache(payload.category);

  return { success: true };
}

export async function updateReferenceDataAction(values: unknown) {
  await requireUser();

  const payload = updateReferenceDataFormSchema.parse(values);
  const { id, ...data } = payload;

  const item = await prisma.referenceData.update({
    where: { id },
    data,
  });

  invalidateReferenceDataCache(item.category);

  return { success: true };
}

export async function deleteReferenceDataAction(id: string) {
  await requireUser();

  const item = await prisma.referenceData.delete({
    where: { id },
  });

  invalidateReferenceDataCache(item.category);

  return { success: true };
}

export async function reorderReferenceDataAction(values: unknown) {
  await requireUser();

  const { category, itemIds } = reorderReferenceDataSchema.parse(values);

  // Update order for each item
  await prisma.$transaction(
    itemIds.map((id, index) =>
      prisma.referenceData.update({
        where: { id, category },
        data: { order: index },
      })
    )
  );

  invalidateReferenceDataCache(category);

  return { success: true };
}
```

### 7. Create Category Registry (Type-Safe)

File: `lib/constants/reference-categories.ts`

```typescript
export const referenceCategories = [
  "skill",
  "framework",
  "database",
  "tool",
  "soft_skill",
  "contract_type",
  "experience_level",
] as const;

export type ReferenceCategory = (typeof referenceCategories)[number];

export const referenceCategoryLabels: Record<ReferenceCategory, string> = {
  skill: "Linguaggi",
  framework: "Framework",
  database: "Database",
  tool: "Strumenti",
  soft_skill: "Soft Skills",
  contract_type: "Tipi Contratto",
  experience_level: "Livelli Esperienza",
};

// Helper to add a new category in code:
// 1) Append to referenceCategories
// 2) Add label in referenceCategoryLabels
// 3) (Optional) seed initial items
```

### 8. Create Admin UI Components

File: `components/reference-data/reference-data-table.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReferenceDataForm } from "./reference-data-form";
import { deleteReferenceDataAction } from "@/lib/actions/reference-data";
import { Pencil, Trash2, GripVertical } from "lucide-react";

interface ReferenceDataTableProps {
  data: Array<{
    id: string;
    label: string;
    category: string;
    order: number;
    isActive: boolean;
  }>;
  category: string;
}

export function ReferenceDataTable({
  data,
  category,
}: ReferenceDataTableProps) {
  const [editItem, setEditItem] = useState<(typeof data)[0] | null>(null);

  async function handleDelete(id: string) {
    if (confirm("Sei sicuro di voler eliminare questo elemento?")) {
      await deleteReferenceDataAction(id);
    }
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Etichetta</TableHead>
            <TableHead className="w-32">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              </TableCell>
              <TableCell>{item.label}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditItem(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Modifica elemento</DialogTitle>
                      </DialogHeader>
                      <ReferenceDataForm
                        category={category}
                        defaultValues={editItem || undefined}
                      />
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

File: `components/reference-data/reference-data-form.tsx`

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  referenceDataFormSchema,
  type ReferenceDataFormData,
} from "@/lib/schemas/reference-data";
import {
  createReferenceDataAction,
  updateReferenceDataAction,
} from "@/lib/actions/reference-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReferenceDataFormProps {
  category: string;
  defaultValues?: Partial<ReferenceDataFormData> & { id?: string };
  onSuccess?: () => void;
}

export function ReferenceDataForm({
  category,
  defaultValues,
  onSuccess,
}: ReferenceDataFormProps) {
  const form = useForm<ReferenceDataFormData>({
    resolver: zodResolver(referenceDataFormSchema),
    defaultValues: {
      category,
      label: defaultValues?.label || "",
      isActive: defaultValues?.isActive ?? true,
      order: defaultValues?.order ?? 0,
    },
  });

  async function onSubmit(data: ReferenceDataFormData) {
    try {
      if (defaultValues?.id) {
        await updateReferenceDataAction({ ...data, id: defaultValues.id });
      } else {
        await createReferenceDataAction(data);
      }
      onSuccess?.();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="label">Etichetta</Label>
        <Input
          id="label"
          {...form.register("label")}
          placeholder="Inserisci l'etichetta"
        />
        {form.formState.errors.label && (
          <p className="text-sm text-red-500">
            {form.formState.errors.label.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {defaultValues?.id ? "Aggiorna" : "Crea"}
      </Button>
    </form>
  );
}
```

### 9. Create Admin Page

File: `app/dashboard/settings/reference-data/page.tsx`

```tsx
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getReferenceDataByCategory } from "@/lib/data/reference-data";
import { ReferenceDataTable } from "@/components/reference-data/reference-data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReferenceDataForm } from "@/components/reference-data/reference-data-form";
import { Plus } from "lucide-react";
import {
  referenceCategories,
  referenceCategoryLabels,
} from "@/lib/constants/reference-categories";

const categories = referenceCategories.map((value) => ({
  value,
  label: referenceCategoryLabels[value],
}));

export default async function ReferenceDataPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dati di Riferimento</h1>
      </div>

      <Tabs defaultValue="skill">
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
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi {cat.label}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuovo elemento - {cat.label}</DialogTitle>
                  </DialogHeader>
                  <ReferenceDataForm category={cat.value} />
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

async function ReferenceDataSection({ category }: { category: string }) {
  const data = await getReferenceDataByCategory(category);

  return <ReferenceDataTable data={data} category={category} />;
}
```

### 10. Update Position Form to Use Database

File: `components/positions/position-form.tsx`

Replace imports from `data.ts` with async data fetching:

```typescript
// Before:
import { programmingLanguages, frameworks } from "@/components/positions/data";

// After:
import { getReferenceDataByCategory } from "@/lib/data/reference-data";
import { type ReferenceCategory } from "@/lib/constants/reference-categories";

// In component (make it async server component or wrap in Suspense):
const skills = await getReferenceDataByCategory("skill");
const frameworksList = await getReferenceDataByCategory("framework");
// etc.
```

### 11. Add to Sidebar Navigation

File: `components/dashboard/app-sidebar.tsx`

Add new nav item:

```typescript
{
  title: "Impostazioni",
  url: "/dashboard/settings/reference-data",
  icon: Settings,
}
```

## Testing Checklist

- [ ] Migration runs successfully (`pnpm db:push`)
- [ ] Seed populates all reference data (`pnpm db:seed`)
- [ ] Settings page loads without errors
- [ ] Can create new reference data items
- [ ] Can edit existing items
- [ ] Can delete items (with confirmation)
- [ ] Can reorder items (drag & drop)
- [ ] Position form loads data from database
- [ ] Cache invalidation works after CRUD operations
- [ ] All cached components use `cacheLife("hours")`

## Open Questions

1. **Should this be admin-only?** Add role check in actions if needed
2. **Need drag-and-drop reordering?** Consider @dnd-kit/core for better UX
3. **Keep data.ts as fallback?** Useful for development/testing
4. **Add bulk import/export?** CSV import for easier data management
5. **Soft delete vs hard delete?** Currently using `isActive` flag for soft deletes
6. **Adding new categories:** With the registry, add in `reference-categories.ts`, update labels, optionally seed. No Prisma migration needed unless switching to enums.

## Migration Path

1. Create schema + run migration
2. Seed database with existing data
3. Build data layer + actions (no UI changes yet)
4. Create admin UI (can test in isolation)
5. Update position form (gradual rollout)
6. Test thoroughly
7. Remove `data.ts` file (optional - can keep as backup)
