import "server-only";

export type PrivyUserProfile = {
  id: string;
  email: string | undefined;
  name: string | undefined;
  avatarUrl: string | undefined;
};

type PrivyLinkedAccount = {
  type: string;
  address?: string;
  email?: string;
  name?: string;
  picture_url?: string;
  profile_picture_url?: string;
};

type PrivyUserResponse = {
  id: string;
  linked_accounts?: PrivyLinkedAccount[];
};

export async function fetchPrivyUserProfile(
  userId: string,
): Promise<PrivyUserProfile | undefined> {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!(appId && appSecret)) return undefined;

  const authHeader = `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;

  const response = await fetch(`https://api.privy.io/v1/users/${userId}`, {
    headers: {
      "privy-app-id": appId,
      Authorization: authHeader,
    },
  });

  if (!response.ok) return undefined;
  const data = (await response.json()) as PrivyUserResponse;

  const emailAccount = data.linked_accounts?.find(
    (account) => account.type === "email",
  );
  const googleAccount = data.linked_accounts?.find(
    (account) => account.type === "google_oauth",
  );

  const email = emailAccount?.address ?? googleAccount?.email;
  const name = googleAccount?.name;
  const avatarUrl =
    googleAccount?.picture_url ?? googleAccount?.profile_picture_url;

  return {
    id: data.id,
    email,
    name,
    avatarUrl,
  };
}
