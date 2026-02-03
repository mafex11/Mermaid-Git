"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type DiagramSummary } from "@/app/actions/diagram";
import { useDiagramBuild, useDiagramSummaries } from "@/hooks/useDiagram";
import { useRepos } from "@/hooks/useRepos";
import { authClient } from "@/lib/auth/client";

type ReposViewProps = {
  userName: string;
  userEmail?: string | null;
  appInstallUrl?: string;
};

export const ReposView = ({
  userName,
  userEmail,
  appInstallUrl,
}: ReposViewProps) => {
  const { data, isLoading } = useRepos();
  const { data: diagramSummaries } = useDiagramSummaries();
  const { trigger: triggerBuild, isMutating: isBuilding } = useDiagramBuild();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, startTransition] = useTransition();
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildNotice, setBuildNotice] = useState<string | null>(null);
  const [activeBuildRepoId, setActiveBuildRepoId] = useState<number | null>(null);

  const summariesByRepoId = useMemo(() => {
    if (!diagramSummaries?.ok) {
      return new Map<number, DiagramSummary>();
    }
    return new Map(
      diagramSummaries.summaries.map((summary) => [summary.repoId, summary]),
    );
  }, [diagramSummaries]);

  const handleSignOut = () => {
    setSignOutError(null);
    startTransition(async () => {
      try {
        await authClient.signOut();
      } catch {
        setSignOutError("Sign out failed. Try again.");
      }
    });
  };

  const handleBuild = async (repoId: number) => {
    setBuildError(null);
    setBuildNotice(null);
    setActiveBuildRepoId(repoId);
    try {
      const result = await triggerBuild(repoId);
      if (!result?.ok) {
        setBuildError(result?.error ?? "Build failed. Try again.");
        return;
      }
      setBuildNotice("Diagram build queued.");
    } catch {
      setBuildError("Build failed. Try again.");
    } finally {
      setActiveBuildRepoId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Badge variant="secondary">Workspace</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground">
          Signed in as {userName}
          {userEmail ? ` (${userEmail})` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repo actions</CardTitle>
          <CardDescription>
            Select a repository to generate and view its graph.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Graph refreshes keep Mermaid exports current after each push.
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            {appInstallUrl ? (
              <Button asChild variant="outline">
                <Link href={appInstallUrl} target="_blank" rel="noreferrer">
                  Install GitHub App
                </Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {signOutError ? (
        <Alert variant="destructive">
          <AlertTitle>Sign out failed</AlertTitle>
          <AlertDescription>{signOutError}</AlertDescription>
        </Alert>
      ) : null}

      {buildError ? (
        <Alert variant="destructive">
          <AlertTitle>Diagram build failed</AlertTitle>
          <AlertDescription>{buildError}</AlertDescription>
        </Alert>
      ) : null}

      {buildNotice ? (
        <Alert>
          <AlertTitle>Diagram build queued</AlertTitle>
          <AlertDescription>{buildNotice}</AlertDescription>
        </Alert>
      ) : null}

      {diagramSummaries && !diagramSummaries.ok ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load diagram status</AlertTitle>
          <AlertDescription>{diagramSummaries.error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Loading repositories...
          </CardContent>
        </Card>
      ) : null}

      {data && !data.ok ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load repositories</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      {data?.ok && data.repos.length === 0 ? (
        <Alert>
          <AlertTitle>No repositories found</AlertTitle>
          <AlertDescription>
            Install the GitHub App to grant access to repositories.
          </AlertDescription>
        </Alert>
      ) : null}

      {data?.ok && data.repos.length > 0 ? (
        <div className="grid gap-4">
          {data.repos.map((repo) => {
            const summary = diagramSummaries?.ok
              ? summariesByRepoId.get(repo.id)
              : undefined;
            return (
              <Card key={repo.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>{repo.fullName}</CardTitle>
                    <Badge variant="secondary">
                      {repo.private ? "Private" : "Public"}
                    </Badge>
                  </div>
                  <CardDescription>Default {repo.defaultBranch}</CardDescription>
                  {diagramSummaries?.ok ? (
                    <CardDescription>
                      {summary?.diagramUpdatedAt
                        ? `Diagram updated ${new Date(summary.diagramUpdatedAt).toLocaleString()}`
                        : "Diagram not built yet."}
                    </CardDescription>
                  ) : null}
                  {diagramSummaries?.ok ? (
                    <CardDescription>
                      Build status: {summary?.buildStatus ?? "idle"}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex w-full flex-col gap-2">
                    {summary?.progress ? (
                      <div className="space-y-2">
                        <Progress value={summary.progress.percent} />
                        <span className="text-xs text-muted-foreground">
                          Progress {summary.progress.percent}% (
                          {summary.progress.processedFiles}/
                          {summary.progress.totalFiles} files)
                        </span>
                      </div>
                    ) : null}
                    {summary?.buildStatus === "failed" &&
                    summary.buildError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Build failed</AlertTitle>
                        <AlertDescription>{summary.buildError}</AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => handleBuild(repo.id)}
                      disabled={isBuilding}
                    >
                      {isBuilding && activeBuildRepoId === repo.id
                        ? "Building..."
                        : "Build diagram"}
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/diagram/${repo.id}`}>Open diagram</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={repo.htmlUrl} target="_blank" rel="noreferrer">
                        View on GitHub
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
