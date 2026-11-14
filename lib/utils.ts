import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (name?: string | null) => {
  return (
    name
      ?.split(" ")
      ?.map((word) => word[0])
      ?.join("")
      ?.toUpperCase() || "U"
  );
};

export const prismLanguage = (language: string) => {
  switch ((language || "").toLowerCase()) {
    case "javascript":
    case "js":
      return "javascript";
    case "typescript":
    case "ts":
      return "typescript";
    case "python":
    case "py":
      return "python";
    case "java":
      return "typescript";
    case "c#":
    case "csharp":
      return "csharp";
    case "cpp":
    case "c++":
      return "cpp";
    case "go":
      return "go";
    case "ruby":
      return "ruby";
    case "php":
      return "php";
    case "swift":
      return "swift";
    case "kotlin":
      return "kotlin";
    case "html":
    case "css":
      return "markup";
    default:
      return "javascript";
  }
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
