import { headers } from "next/headers";
import Link from "next/link";

import { DiagramView } from "@/components/diagram/DiagramView";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DiagramPageProps = {
  params: {
    repoId: string;
  };
};

export default async function DiagramPage({ params }: DiagramPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="flex min-h-screen justify-center bg-background px-6 py-16 text-foreground">
        <div className="w-full max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Session missing</CardTitle>
              <CardDescription>
                Sign in to view this diagram.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/sign-in">Go to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const rawRepoId = params.repoId?.trim() ?? "";
  const repoId = Number.parseInt(rawRepoId, 10);
  if (!Number.isFinite(repoId)) {
    return (
      <main className="flex min-h-screen justify-center bg-background px-6 py-16 text-foreground">
        <div className="w-full max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Invalid repository</CardTitle>
              <CardDescription>
                The repository id in the URL is not valid: "{rawRepoId}".
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/repos">Back to repositories</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-5xl">
        <DiagramView repoId={repoId} />
      </div>
    </main>
  );
}
