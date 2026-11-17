import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowLink } from "@/components/ui/table-row-link";
import type { UserActivity, UserListItem } from "@/lib/data/users";
import { cn } from "cn";
import {
  getEmailVerifiedPresentation,
  getUserStatusPresentation,
  ROLE_BADGE_CLASS,
  USER_ROLE_LABEL,
} from "./user-presentation";

type UsersTableProps = {
  users: UserListItem[];
  activity: Record<string, UserActivity>;
};

const BADGE_CLASS = "rounded-full px-2 py-1 text-xs font-medium";

function formatLastLogin(date: Date | null | undefined): string {
  return date
    ? new Date(date).toLocaleString("it-IT", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
}

export function UsersTable({ users, activity }: UsersTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Ruolo</TableHead>
            <TableHead>Email verificata</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Creato il</TableHead>
            <TableHead>Ultimo accesso</TableHead>
            <TableHead className="text-right">Sessioni attive</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const verified = getEmailVerifiedPresentation(user.emailVerified);
            const status = getUserStatusPresentation(user.banned);
            const userActivity = activity[user.id];

            return (
              <TableRow key={user.id} className="group">
                <TableCell className="relative font-medium">
                  <TableRowLink
                    href={`/dashboard/settings/users/${user.id}`}
                    aria-label={`Apri ${user.name}`}
                  />
                  {user.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <span className={cn(BADGE_CLASS, ROLE_BADGE_CLASS[user.role])}>
                    {USER_ROLE_LABEL[user.role]}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn(BADGE_CLASS, verified.className)}>
                    {verified.label}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn(BADGE_CLASS, status.className)}>
                    {status.label}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString("it-IT")}
                </TableCell>
                <TableCell>
                  {formatLastLogin(userActivity?.lastLoginAt)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {userActivity?.activeSessions ?? 0}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
