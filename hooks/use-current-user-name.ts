import { authClient } from "@/lib/auth-client";

export const useCurrentUserName = () => {
  const { data } = authClient.useSession();
  const fallback = data?.user?.email?.split("@")[0] ?? "?";
  return data?.user?.name ?? fallback;
};
