"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";

type SignInCardProps = {
  appInstallUrl?: string;
};

export const SignInCard = ({ appInstallUrl }: SignInCardProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSignIn = () => {
    setError(null);
    startTransition(async () => {
      try {
        await authClient.signIn.social({ provider: "github" });
      } catch {
        setError("GitHub sign-in failed. Try again.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in with GitHub</CardTitle>
        <CardDescription>
          Connect your GitHub account to list repositories and enable push
          updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button onClick={handleSignIn} disabled={isPending}>
          {isPending ? "Redirecting..." : "Continue with GitHub"}
        </Button>
      </CardContent>
      {appInstallUrl ? (
        <CardFooter>
          <Button asChild variant="outline">
            <Link href={appInstallUrl} target="_blank" rel="noreferrer">
              Install GitHub App
            </Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
};
