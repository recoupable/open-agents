"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

type Props = {
  readonly children: ReactNode;
};

export function PrivyProvider({ children }: Props) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return children;
  }

  return (
    <BasePrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#ffffff",
        },
        loginMethods: ["email"],
        embeddedWallets: {
          createOnLogin: "off",
        },
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}

export function isPrivyClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
}
