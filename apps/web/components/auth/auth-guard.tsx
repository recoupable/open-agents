"use client";

import { usePrivy } from "@privy-io/react-auth";
import { SignInButton } from "./sign-in-button";

export function AuthGuard({
  children,
  loadingFallback,
  unauthenticatedFallback,
}: {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  unauthenticatedFallback?: React.ReactNode;
}) {
  const { ready, authenticated } = usePrivy();

  if (!ready) {
    return <>{loadingFallback ?? <div>Loading...</div>}</>;
  }

  if (!authenticated) {
    return (
      <>
        {unauthenticatedFallback ?? (
          <div className="flex flex-col items-center gap-4 p-8">
            <p>Please sign in to continue</p>
            <SignInButton />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
