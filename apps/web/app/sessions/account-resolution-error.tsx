import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AccountResolutionError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-24 text-foreground">
      <section className="flex max-w-lg flex-col items-center text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Account verification failed
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          We could not finish signing you in.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Your sign-in succeeded, but we could not verify your account with the
          account service. Please try again in a moment. If this keeps
          happening, contact support.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/sessions">Try again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
