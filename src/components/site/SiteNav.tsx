import Link from "next/link";
import { GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";

type SiteNavProps = {
  anchorPrefix?: string;
};

export const SiteNav = ({ anchorPrefix = "" }: SiteNavProps) => {
  const toAnchor = (hash: "#features" | "#workflow" | "#security") =>
    `${anchorPrefix}${hash}`;

  return (
    <nav className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <GitBranch className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Repo Graph</p>
          <p className="text-base font-semibold">Mermaid Graph Studio</p>
        </div>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <Button variant="ghost" asChild>
          <Link href={toAnchor("#features")}>Features</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href={toAnchor("#workflow")}>Workflow</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href={toAnchor("#security")}>Security</Link>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/diagram-demo">View demo</Link>
        </Button>
        <Button asChild>
          <Link href="/sign-in">Connect GitHub</Link>
        </Button>
      </div>
    </nav>
  );
};
