"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ComponentProps, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = Omit<ComponentProps<typeof Button>, "onClick">;

export function SignInButton(props: Props) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <Button
        {...props}
        disabled
        variant={props.variant ?? "outline"}
        title="Set NEXT_PUBLIC_PRIVY_APP_ID to enable sign-in"
      >
        <LogIn />
        Sign in (not configured)
      </Button>
    );
  }

  return <SignInButtonInner {...props} />;
}

function SignInButtonInner(props: Props) {
  const router = useRouter();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const lastSeenUserIdRef = useRef<string | null>(null);

  // Privy's SDK writes the privy-token cookie on successful authentication
  // and removes it on logout. We just need to trigger a server re-read when
  // the auth state transitions so Server Components pick up the new session.
  useEffect(() => {
    if (!ready) return;
    const currentUserId = authenticated ? (user?.id ?? null) : null;
    if (lastSeenUserIdRef.current === currentUserId) return;
    lastSeenUserIdRef.current = currentUserId;
    router.refresh();
  }, [ready, authenticated, user?.id, router]);

  if (!ready) {
    return (
      <Button {...props} disabled variant={props.variant ?? "outline"}>
        <Loader2 className="animate-spin" />
        Loading…
      </Button>
    );
  }

  if (authenticated) {
    const label = user?.email?.address ?? "Signed in";
    return (
      <Button
        {...props}
        variant={props.variant ?? "outline"}
        onClick={() => logout()}
        title={`Signed in as ${label} — click to sign out`}
      >
        <LogOut />
        Sign out ({label})
      </Button>
    );
  }

  return (
    <Button
      {...props}
      variant={props.variant ?? "outline"}
      onClick={() => login()}
    >
      <LogIn />
      Sign in
    </Button>
  );
}
