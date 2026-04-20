import { redirect } from "next/navigation";
import { SignedOutHero } from "@/components/auth/signed-out-hero";
import { getServerSession } from "@/lib/session/get-server-session";

export default async function Home() {
  const session = await getServerSession();
  if (session?.user) {
    redirect("/sessions");
  }

  return <SignedOutHero />;
}
