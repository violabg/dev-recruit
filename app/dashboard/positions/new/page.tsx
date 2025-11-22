import { PositionForm } from "@/components/positions/position-form";

// Server component for new position page
export default async function NewPositionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl">Nuova Posizione</h1>
        <p className="text-muted-foreground">
          Crea una nuova posizione per iniziare a cercare candidati
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="p-6 border rounded-md">
          <h2 className="mb-4 font-semibold text-xl">Crea posizione</h2>
          <PositionForm />
        </div>
      </div>
    </div>
  );
}
