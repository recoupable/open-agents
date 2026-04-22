"use client";

import Image from "next/image";
import { Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOrgs, type Org } from "@/hooks/use-orgs";

type OrgSelectorProps = {
  onSelectOrg: (orgSlug: string) => void;
  disabled?: boolean;
};

export function OrgSelector({ onSelectOrg, disabled }: OrgSelectorProps) {
  const { orgs, loading, error } = useOrgs();
  const [selectedOrgSlug, setSelectedOrgSlug] = useState<string | null>(null);

  function handleOrgClick(org: Org) {
    if (disabled) return;
    setSelectedOrgSlug(org.organization_name);
    onSelectOrg(org.organization_name);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading organizations...</span>
      </div>
    );
  }

  if (error || orgs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-sm text-muted-foreground">
        Select an organization to start
      </p>
      <div className="grid gap-2">
        {orgs.map((org) => {
          const isSelected = selectedOrgSlug === org.organization_name;
          return (
            <Button
              key={org.id}
              variant="outline"
              className="flex h-auto items-center justify-start gap-3 px-4 py-3"
              onClick={() => handleOrgClick(org)}
              disabled={disabled}
            >
              {isSelected && disabled ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              ) : org.organization_image ? (
                <Image
                  src={org.organization_image}
                  alt={org.organization_name}
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0 rounded"
                  unoptimized
                />
              ) : (
                <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate font-medium">
                {org.organization_name}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
