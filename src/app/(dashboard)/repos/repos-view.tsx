"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, startTransition] = useTransition();

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

  return (
    <div className="w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>
            Signed in as {userName}
            {userEmail ? ` (${userEmail})` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Select a repository to generate and view its graph.
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            {appInstallUrl ? (
              <Button asChild variant="outline">
                <Link href={appInstallUrl} target="_blank" rel="noreferrer">
                  Install GitHub App
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
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
          {data.repos.map((repo) => (
            <Card key={repo.id}>
              <CardHeader>
                <CardTitle>{repo.fullName}</CardTitle>
                <CardDescription>
                  {repo.private ? "Private" : "Public"} | Default{" "}
                  {repo.defaultBranch}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <Button asChild variant="outline">
                  <Link href={repo.htmlUrl} target="_blank" rel="noreferrer">
                    View on GitHub
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
};
