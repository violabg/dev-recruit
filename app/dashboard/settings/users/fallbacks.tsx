import {
  BadgeSkeleton,
  ButtonSkeleton,
  FieldSkeleton,
  FilterBarSkeleton,
  PageHeaderSkeleton,
  PaginationSkeleton,
  TableSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Mirrors the Users list: header, search, UsersTable and pagination. */
export const UsersListSkeleton = () => (
  <div className="flex flex-col gap-6 w-full">
    <PageHeaderSkeleton
      title="Utenti"
      description="Gestisci chi accede all'applicazione"
      actions={<ButtonSkeleton size="sm" className="w-32" />}
    />
    <FilterBarSkeleton selects={0} />
    <TableSkeleton
      className="rounded-lg"
      rows={5}
      columns={[
        { header: "Nome" },
        { header: "Email", cell: "muted" },
        { header: "Ruolo", cell: "badge" },
        { header: "Email verificata", cell: "badge" },
        { header: "Stato", cell: "badge" },
        { header: "Creato il", cell: "muted" },
        { header: "Ultimo accesso", cell: "muted" },
        {
          header: "Sessioni attive",
          headClassName: "text-right",
          cell: "muted",
          cellClassName: "text-right",
        },
      ]}
    />
    <PaginationSkeleton />
  </div>
);

/** Mirrors the new-user page: header and the CreateUserForm card. */
export const CreateUserSkeleton = () => (
  <div className="flex flex-col gap-6 w-full">
    <PageHeaderSkeleton
      title="Nuovo utente"
      description="Crea un account e comunica a mano la password iniziale"
    />
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <FieldSkeleton label="Nome" required />
          <FieldSkeleton label="Cognome" required />
        </div>
        <FieldSkeleton label="Email" required />
        <FieldSkeleton label="Password iniziale" required />
        <FieldSkeleton label="Ruolo" required />
        <FieldSkeleton label="Email verificata" controlClassName="h-16" />
        <div className="flex justify-end">
          <ButtonSkeleton />
        </div>
      </CardContent>
    </Card>
  </div>
);

/** Mirrors the user detail: header and the Dati, Accesso and Sessioni cards. */
export const UserDetailSkeleton = () => (
  <div className="flex flex-col gap-6 w-full">
    <PageHeaderSkeleton
      description
      info={<TextSkeleton className="w-64" />}
    />
    <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dati</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldSkeleton label="Nome" required />
          <FieldSkeleton label="Cognome" required />
          <FieldSkeleton label="Email" required />
          <div className="flex justify-end">
            <ButtonSkeleton />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Accesso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <BadgeSkeleton />
          <FieldSkeleton label="Ruolo" />
          <FieldSkeleton label="Email verificata" controlClassName="h-16" />
          <div className="flex flex-wrap gap-2">
            <ButtonSkeleton className="w-36" />
            <ButtonSkeleton className="w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Sessioni attive</CardTitle>
      </CardHeader>
      <CardContent>
        <TableSkeleton
          rows={2}
          columns={[
            { header: "Creata il", cell: "muted" },
            { header: "Scade il", cell: "muted" },
            { header: "IP", cell: "muted" },
            { header: "Browser" },
            {
              header: <span className="sr-only">Azioni</span>,
              headClassName: "text-right",
              cell: "action",
              cellClassName: "text-right",
            },
          ]}
        />
      </CardContent>
    </Card>
  </div>
);
