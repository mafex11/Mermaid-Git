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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-lg">
        <SignInCard appInstallUrl={getAppInstallUrl()} />
      </div>
    </main>
  );
}
