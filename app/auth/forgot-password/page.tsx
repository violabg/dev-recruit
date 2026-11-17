import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex justify-center items-center p-6 md:p-10 w-full min-h-dvh">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Password dimenticata</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                Chiedi a un amministratore di reimpostare la password.
              </p>
              <Link
                href="/auth/login"
                className="underline underline-offset-4 text-sm"
              >
                Torna al login
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
