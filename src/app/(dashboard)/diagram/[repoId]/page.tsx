import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DiagramView } from "@/components/diagram/DiagramView";
import { auth } from "@/lib/auth";

type DiagramPageProps = {
  params: {
    repoId: string;
  };
};

export default async function DiagramPage({ params }: DiagramPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const repoId = Number(params.repoId);
  if (!Number.isFinite(repoId)) {
    redirect("/repos");
  }

  return (
    <main className="flex min-h-screen justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-5xl">
        <DiagramView repoId={repoId} />
      </div>
    </main>
  );
}
