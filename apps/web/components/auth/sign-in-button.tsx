"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ComponentProps, useCallback, useEffect, useRef } from "react";
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
  const { ready, authenticated, login, logout, user, getAccessToken } =
    usePrivy();
  const exchangedUserIdRef = useRef<string | null>(null);
  const exchangingRef = useRef(false);

  const exchangeToken = useCallback(async () => {
    if (exchangingRef.current) return;
    exchangingRef.current = true;
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch("/api/auth/privy/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });

      if (!response.ok) {
        console.error(
          "Privy session exchange failed:",
          response.status,
          await response.text(),
        );
        return;
      }

      router.refresh();
    } finally {
      exchangingRef.current = false;
    }
  }, [getAccessToken, router]);

  useEffect(() => {
    if (!(ready && authenticated && user?.id)) return;
    if (exchangedUserIdRef.current === user.id) return;
    exchangedUserIdRef.current = user.id;
    void exchangeToken();
  }, [ready, authenticated, user?.id, exchangeToken]);

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
        onClick={async () => {
          exchangedUserIdRef.current = null;
          try {
            await fetch("/api/auth/signout", {
              method: "POST",
              redirect: "manual",
            });
          } catch {
            // If signout fails on the server, still sign out of Privy client-side.
          }
          await logout();
          router.refresh();
        }}
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
