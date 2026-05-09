import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

type AccountIdResponse = {
  status: "success" | "error";
  accountId?: string;
};

export async function fetchAccountId(accessToken: string): Promise<string> {
  const res = await fetch(`${RECOUPABLE_API_BASE_URL}/api/accounts/id`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`accounts/id ${res.status}`);
  }
  const data: AccountIdResponse = await res.json();
  if (!data.accountId) {
    throw new Error("accounts/id missing accountId");
  }
  return data.accountId;
}
