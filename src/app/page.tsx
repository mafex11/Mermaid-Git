import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Repo graph platform
        </h1>
        <p className="text-muted-foreground">
          GitHub-connected code graphs with push-based updates.
        </p>
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/sign-in">Continue with GitHub</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
