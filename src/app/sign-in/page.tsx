import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SignInCard } from "@/components/auth/SignInCard";
import { auth } from "@/lib/auth";

const getAppInstallUrl = (): string | undefined => {
  const appSlug =
    process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? process.env.GITHUB_APP_SLUG;
  if (!appSlug) {
    return undefined;
  }
  return `https://github.com/apps/${appSlug}/installations/new`;
};

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/repos");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Repo Graph</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in to map repositories
          </h1>
          <p className="text-muted-foreground">
            Connect GitHub to sync graphs, track updates, and share Mermaid
            exports.
          </p>
        </div>
        <div className="max-w-xl">
          <SignInCard appInstallUrl={getAppInstallUrl()} />
        </div>
      </div>
    </main>
  );
}
