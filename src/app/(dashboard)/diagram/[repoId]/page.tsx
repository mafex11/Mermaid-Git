"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DiagramView } from "@/components/diagram/DiagramView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DiagramPage() {
  const params = useParams();
  const rawParam = params?.repoId;
  const rawRepoId = Array.isArray(rawParam)
    ? rawParam[0]?.trim() ?? ""
    : typeof rawParam === "string"
      ? rawParam.trim()
      : "";
  const repoId = Number.parseInt(rawRepoId, 10);
  if (!Number.isFinite(repoId)) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-foreground">
        <div className="mx-auto w-full max-w-3xl">
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
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        <DiagramView repoId={repoId} />
      </div>
    </main>
  );
}
