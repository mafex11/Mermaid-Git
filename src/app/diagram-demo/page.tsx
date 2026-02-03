"use client";

import { useState } from "react";

import { DiagramStyleControls } from "@/components/diagram/DiagramStyleControls";
import { defaultMermaidStyleOptions, MermaidRenderer } from "@/components/diagram/MermaidRenderer";
import { SiteNav } from "@/components/site/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sampleDiagrams = [
  {
    id: "small",
    title: "Small repo",
    description: "Simple file dependency map",
    chart: `flowchart TD
api_ts["src/api.ts"] --> db_ts["src/db.ts"]
api_ts --> auth_ts["src/auth.ts"]
auth_ts --> db_ts
ui_tsx["src/ui.tsx"] --> api_ts
`,
  },
  {
    id: "medium",
    title: "Medium repo",
    description: "More files and cross-links",
    chart: `flowchart TD
app_tsx["src/app.tsx"] --> routes_ts["src/routes.ts"]
routes_ts --> controller_ts["src/controller.ts"]
controller_ts --> service_ts["src/service.ts"]
service_ts --> repo_ts["src/repo.ts"]
repo_ts --> db_ts["src/db.ts"]
service_ts --> cache_ts["src/cache.ts"]
jobs_ts["src/jobs.ts"] --> service_ts
cli_ts["src/cli.ts"] --> service_ts
`,
  },
  {
    id: "large",
    title: "Large repo",
    description: "Roughly 30 file nodes to test density",
    chart: `flowchart TD
app_tsx["src/app.tsx"] --> routes_ts["src/routes.ts"]
routes_ts --> controller_ts["src/controller.ts"]
controller_ts --> service_ts["src/service.ts"]
service_ts --> repo_ts["src/repo.ts"]
repo_ts --> db_ts["src/db.ts"]
service_ts --> cache_ts["src/cache.ts"]
jobs_ts["src/jobs.ts"] --> service_ts
cli_ts["src/cli.ts"] --> service_ts
config_ts["src/config.ts"] --> env_ts["src/env.ts"]
logger_ts["src/logger.ts"] --> config_ts
auth_ts["src/auth.ts"] --> service_ts
auth_ts --> repo_ts
router_ts["src/router.ts"] --> routes_ts
http_ts["src/http.ts"] --> router_ts
api_ts["src/api.ts"] --> http_ts
api_ts --> auth_ts
ui_tsx["src/ui.tsx"] --> api_ts
ui_tsx --> theme_ts["src/theme.ts"]
theme_ts --> tokens_ts["src/tokens.ts"]
store_ts["src/store.ts"] --> reducer_ts["src/reducer.ts"]
reducer_ts --> actions_ts["src/actions.ts"]
actions_ts --> api_ts
hooks_ts["src/hooks.ts"] --> store_ts
components_ts["src/components.ts"] --> hooks_ts
pages_tsx["src/pages.tsx"] --> components_ts
feature_ts["src/feature.ts"] --> service_ts
feature_ts --> cache_ts
worker_ts["src/worker.ts"] --> jobs_ts
metrics_ts["src/metrics.ts"] --> logger_ts
errors_ts["src/errors.ts"] --> logger_ts
guards_ts["src/guards.ts"] --> auth_ts
`
  },
];

export default function DiagramDemoPage() {
  const [activeId, setActiveId] = useState(sampleDiagrams[0]?.id ?? "small");
  const [styleOptions, setStyleOptions] = useState(defaultMermaidStyleOptions);
  const activeDiagram =
    sampleDiagrams.find((diagram) => diagram.id === activeId) ?? sampleDiagrams[0];

  return (
    <main className="min-h-screen bg-zinc-950 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="space-y-10">
          <SiteNav anchorPrefix="/" />
          <div className="space-y-3">
            <Badge variant="secondary">Demo</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">
              Diagram rendering
            </h1>
            <p className="text-muted-foreground">
              Preview how Mermaid graphs look across different repo sizes.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Diagram presets</CardTitle>
            <CardDescription>
              Switch sizes to test density and interaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            {sampleDiagrams.map((diagram) => (
              <Button
                key={diagram.id}
                variant={diagram.id === activeId ? "default" : "outline"}
                onClick={() => setActiveId(diagram.id)}
              >
                {diagram.title}
              </Button>
            ))}
          </CardContent>
        </Card>

        <DiagramStyleControls options={styleOptions} onChange={setStyleOptions} />

        {activeDiagram ? (
          <Card>
            <CardHeader>
              <CardTitle>{activeDiagram.title}</CardTitle>
              <CardDescription>{activeDiagram.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <MermaidRenderer chart={activeDiagram.chart} options={styleOptions} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
