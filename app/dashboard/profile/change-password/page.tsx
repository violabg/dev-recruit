import PageHeader from "@/components/page-header";
import { PasswordForm } from "@/components/profile/password-form";

export default async function ChangePasswordPage() {
  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-2xl">
      <PageHeader
        title="Cambia password"
        description="Aggiorna la password del tuo account"
        breadcrumbs={[
          { label: "Profilo", href: "/dashboard/profile" },
          { label: "Cambia password" },
        ]}
      />

      <PasswordForm />
    </div>
  );
}
