"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDiagram, useDiagramBuild, useDiagramBuildStatus } from "@/hooks/useDiagram";

import { MermaidRenderer } from "./MermaidRenderer";

type DiagramViewProps = {
  repoId: number;
};

export const DiagramView = ({ repoId }: DiagramViewProps) => {
  const { data, isLoading } = useDiagram(repoId);
  const { trigger, isMutating } = useDiagramBuild();
  const { data: buildStatus } = useDiagramBuildStatus(repoId);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildNotice, setBuildNotice] = useState<string | null>(null);

  const handleBuild = async () => {
    setBuildError(null);
    setBuildNotice(null);
    try {
      const result = await trigger(repoId);
      if (!result?.ok) {
        setBuildError(result?.error ?? "Build failed. Try again.");
        return;
      }
      setBuildNotice("Diagram build queued.");
    } catch {
      setBuildError("Build failed. Try again.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Loading diagram...
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  if (!data.ok) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load diagram</AlertTitle>
        <AlertDescription>{data.error}</AlertDescription>
      </Alert>
    );
  }

  const buildStatusPanel = buildStatus?.ok ? (
    <Card>
      <CardHeader>
        <CardTitle>Build status</CardTitle>
        <CardDescription>
          {buildStatus.status === "idle" ? "No build running." : buildStatus.status}
        </CardDescription>
        {buildStatus.updatedAt ? (
          <CardDescription>
            Updated {new Date(buildStatus.updatedAt).toLocaleString()}
          </CardDescription>
        ) : null}
        {buildStatus.progress ? (
          <div className="space-y-2">
            <Progress value={buildStatus.progress.percent} />
            <CardDescription>
              Progress {buildStatus.progress.percent}% (
              {buildStatus.progress.processedFiles}/{buildStatus.progress.totalFiles} files)
            </CardDescription>
          </div>
        ) : null}
      </CardHeader>
      {buildStatus.error ? (
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Build error</AlertTitle>
            <AlertDescription>{buildStatus.error}</AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
    </Card>
  ) : buildStatus ? (
    <Alert variant="destructive">
      <AlertTitle>Unable to load build status</AlertTitle>
      <AlertDescription>{buildStatus.error}</AlertDescription>
    </Alert>
  ) : null;

  if (!data.diagram) {
    return (
      <div className="space-y-4">
        {buildStatusPanel}
        <Alert>
          <AlertTitle>No diagram available</AlertTitle>
          <AlertDescription>
            Build the diagram to view file dependencies.
          </AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleBuild} disabled={isMutating}>
            {isMutating ? "Building..." : "Build diagram"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/repos">Back to repositories</Link>
          </Button>
        </div>
        {buildError ? (
          <Alert variant="destructive">
            <AlertTitle>Build failed</AlertTitle>
            <AlertDescription>{buildError}</AlertDescription>
          </Alert>
        ) : null}
        {buildNotice ? (
          <Alert>
            <AlertTitle>Build queued</AlertTitle>
            <AlertDescription>{buildNotice}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {buildStatusPanel}
      {buildError ? (
        <Alert variant="destructive">
          <AlertTitle>Build failed</AlertTitle>
          <AlertDescription>{buildError}</AlertDescription>
        </Alert>
      ) : null}
      {buildNotice ? (
        <Alert>
          <AlertTitle>Build queued</AlertTitle>
          <AlertDescription>{buildNotice}</AlertDescription>
        </Alert>
      ) : null}
      {data.diagram.truncated ? (
        <Alert>
          <AlertTitle>Diagram truncated</AlertTitle>
          <AlertDescription>
            The diagram is limited to a subset of files for readability.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Repository diagram</CardTitle>
          <CardDescription>
            {data.diagram.updatedAt
              ? `Updated ${new Date(data.diagram.updatedAt).toLocaleString()}`
              : "Updated time unavailable"}
          </CardDescription>
          {typeof data.diagram.nodeCount === "number" &&
          typeof data.diagram.edgeCount === "number" ? (
            <CardDescription>
              {data.diagram.nodeCount} files, {data.diagram.edgeCount} edges
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <MermaidRenderer chart={data.diagram.mermaid} />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleBuild} disabled={isMutating} variant="outline">
          {isMutating ? "Building..." : "Rebuild diagram"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/repos">Back to repositories</Link>
        </Button>
      </div>
    </div>
  );
};
