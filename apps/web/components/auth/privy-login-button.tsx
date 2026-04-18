"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  readonly missingConfig?: boolean;
} & Omit<ComponentProps<typeof Button>, "onClick">;

export function PrivyLoginButton({ missingConfig, ...props }: Props) {
  if (missingConfig) {
    return (
      <Button
        {...props}
        disabled
        variant={props.variant ?? "outline"}
        title="Set NEXT_PUBLIC_PRIVY_APP_ID to enable Privy login"
      >
        <LogIn />
        Privy (not configured)
      </Button>
    );
  }

  return <PrivyLoginButtonInner {...props} />;
}

function PrivyLoginButtonInner(props: Omit<Props, "missingConfig">) {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <Button {...props} disabled variant={props.variant ?? "outline"}>
        <Loader2 className="animate-spin" />
        Loading Privy…
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
      Sign in with Privy
    </Button>
  );
}
