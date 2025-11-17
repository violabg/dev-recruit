import { authClient } from "@/lib/auth-client";

export const useCurrentUserImage = () => {
  const { data } = authClient.useSession();
  return data?.user?.image ?? null;
};
