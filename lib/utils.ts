export const getInitials = (name?: string | null) => {
  return (
    name
      ?.split(" ")
      ?.map((word) => word[0])
      ?.join("")
      ?.toUpperCase() || "U"
  );
};

export function formatDate(dateString: string | null, showTime?: boolean) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(showTime && { hour: "2-digit", minute: "2-digit" }),
  };
  return new Intl.DateTimeFormat("it-IT", formatOptions).format(date);
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-warning/10 text-warning";
    case "contacted":
      return "bg-primary/10 text-primary";
    case "interviewing":
      return "bg-primary/10 text-primary";
    case "hired":
      return "bg-success/10 text-success";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const isDevelopment = process.env.NODE_ENV === "development";
