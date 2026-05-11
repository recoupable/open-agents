"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivy } from "@privy-io/react-auth";

export function ProfileSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your profile information is synced from Vercel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <div className="grid gap-4 pt-4">
          <div className="grid gap-2">
            <Label>Username</Label>
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Skeleton className="h-5 w-36" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileSection() {
  const { ready, user } = usePrivy();

  if (!ready) {
    return <ProfileSectionSkeleton />;
  }

  if (!user) {
    return null;
  }

  const email = user.email?.address;
  const username = email ?? user.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your profile information is synced from Privy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-medium">{username}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
        </div>

        <div className="grid gap-4 pt-4">
          <div className="grid gap-2">
            <Label>Username</Label>
            <p className="text-sm text-muted-foreground">{username}</p>
          </div>

          {email && (
            <div className="grid gap-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
