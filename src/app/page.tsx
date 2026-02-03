import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Code2,
  Database,
  GitBranch,
  Network,
  Shield,
  Sparkles,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { SiteNav } from "@/components/site/SiteNav";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Metric = {
  value: string;
  label: string;
  detail: string;
  icon: LucideIcon;
};

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type Step = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const metrics: Metric[] = [
  {
    value: "Push-first",
    label: "Updates stay current",
    detail: "GitHub webhooks refresh graphs on each commit and merge.",
    icon: Zap,
  },
  {
    value: "Scoped",
    label: "Dependency views",
    detail: "Filter by repo, directory, or module to isolate impact.",
    icon: Network,
  },
  {
    value: "Shareable",
    label: "Graphs anyone can read",
    detail: "Mermaid output for docs, reviews, and onboarding.",
    icon: Code2,
  },
];

const features: Feature[] = [
  {
    title: "End-to-end visibility",
    description: "Track relationships across services, folders, and codeowners.",
    icon: Activity,
  },
  {
    title: "Fast repo onboarding",
    description: "Install the GitHub App once and select repos to map.",
    icon: GitBranch,
  },
  {
    title: "Security-first access",
    description: "Better Auth sessions keep OAuth and JWT scopes tight.",
    icon: Shield,
  },
  {
    title: "Reliable storage",
    description: "Graphs are stored with predictable IDs for easy reuse.",
    icon: Database,
  },
  {
    title: "Live diff context",
    description: "See what changed between pushes without guessing.",
    icon: Sparkles,
  },
  {
    title: "Predictable latency",
    description: "Status stages show where a refresh spends time.",
    icon: Timer,
  },
];

const steps: Step[] = [
  {
    title: "Install the GitHub App",
    description: "Grant repo access and confirm webhook delivery.",
    icon: GitBranch,
  },
  {
    title: "Pick scope",
    description: "Select repos or folders to map and compare.",
    icon: Network,
  },
  {
    title: "Review the graph",
    description: "Share Mermaid exports in docs and pull requests.",
    icon: ArrowRight,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
        <header className="flex flex-col gap-12">
          <SiteNav />

          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-6">
              <div className="w-fit">
                <Badge variant="secondary">Zinc 950 edition</Badge>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Graph GitHub repos with push-based updates.
              </h1>
              <p className="text-lg text-muted-foreground">
                Mermaid Graph Studio turns repos into dependency maps and keeps
                them fresh on every commit. Install once, pick scope, and share
                results across the team.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/sign-in">Connect GitHub</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/diagram-demo">View live demo</Link>
                </Button>
              </div>
              <Alert>
                <Sparkles className="size-4" />
                <AlertTitle>Live sync without manual refresh</AlertTitle>
                <AlertDescription>
                  Webhooks trigger graph rebuilds on every push so teams share
                  one source of truth.
                </AlertDescription>
              </Alert>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sample pipeline status</CardTitle>
                <CardDescription>
                  Example status snapshot for a single repo refresh.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Webhook intake
                    </span>
                    <span className="font-medium">Ready</span>
                  </div>
                  <Progress value={100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Graph build</span>
                    <span className="font-medium">Queued</span>
                  </div>
                  <Progress value={72} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cache publish</span>
                    <span className="font-medium">Pending</span>
                  </div>
                  <Progress value={45} />
                </div>
              </CardContent>
              <CardFooter className="justify-between text-sm text-muted-foreground">
                <span>Last refresh: 2 minutes ago</span>
                <span>Avg build: 38 seconds</span>
              </CardFooter>
            </Card>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">{metric.value}</CardTitle>
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <CardDescription>{metric.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {metric.detail}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section id="features" className="space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">Features that scale</h2>
            <p className="text-muted-foreground">
              Every view stays consistent with your source tree and
              authorization.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title}>
                  <CardHeader className="space-y-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section
          id="workflow"
          className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Workflow built for teams</h2>
              <p className="text-muted-foreground">
                Keep reviews, docs, and onboarding aligned with every push.
              </p>
            </div>
            <div className="grid gap-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <Card key={step.title}>
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                      <div className="mt-1 flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {step.title}
                        </CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Refresh visibility</CardTitle>
              <CardDescription>
                Track each stage so no update disappears in the background.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Webhook received</span>
                  <span className="font-medium">100%</span>
                </div>
                <Progress value={100} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Graph build</span>
                  <span className="font-medium">88%</span>
                </div>
                <Progress value={88} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cache publish</span>
                  <span className="font-medium">74%</span>
                </div>
                <Progress value={74} />
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Example values update with the live pipeline when connected.
            </CardFooter>
          </Card>
        </section>

        <section id="security" className="space-y-4">
          <h2 className="text-2xl font-semibold">Security that stays scoped</h2>
          <Alert>
            <Shield className="size-4" />
            <AlertTitle>OAuth and JWT scopes stay locked down</AlertTitle>
            <AlertDescription>
              Better Auth manages sessions and refresh, while repo access stays
              tied to your GitHub permissions.
            </AlertDescription>
          </Alert>
        </section>

        <section>
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Ready to map your repos?</CardTitle>
              <CardDescription>
                Install the GitHub App and start with one repo today.
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-in">Connect GitHub</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/diagram-demo">View demo</Link>
              </Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </main>
  );
}
