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
          theme: "light",
          accentColor: "#000000",
          logo: "/Recoup_Icon_Wordmark_Black.svg",
          showWalletLoginFirst: false,
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
