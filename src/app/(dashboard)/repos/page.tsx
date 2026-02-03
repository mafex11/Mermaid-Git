import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { ReposView } from "./repos-view";

const getAppInstallUrl = (): string | undefined => {
  const appSlug =
    process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? process.env.GITHUB_APP_SLUG;
  if (!appSlug) {
    return undefined;
  }
  return `https://github.com/apps/${appSlug}/installations/new`;
};

export default async function ReposPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        <ReposView
          userName={session.user.name ?? session.user.email ?? "GitHub user"}
          userEmail={session.user.email}
          appInstallUrl={getAppInstallUrl()}
        />
      </div>
    </main>
  );
}
