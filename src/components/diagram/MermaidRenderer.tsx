"use client";

import { useEffect, useRef, useState } from "react";
import mermaid, { type MermaidConfig } from "mermaid";
import panzoom from "panzoom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MermaidRendererProps = {
  chart: string;
  className?: string;
  options?: MermaidStyleOptions;
};

type MermaidDirection = "TB" | "LR";
type MermaidCurve = "monotoneY" | "basis" | "linear" | "step";
type MermaidDensity = "compact" | "comfortable" | "spacious";
type MermaidFontSize = "sm" | "md" | "lg";
type MermaidTheme = "zinc" | "contrast";

export type MermaidStyleOptions = {
  direction: MermaidDirection;
  curve: MermaidCurve;
  density: MermaidDensity;
  fontSize: MermaidFontSize;
  theme: MermaidTheme;
};

export const defaultMermaidStyleOptions: MermaidStyleOptions = {
  direction: "TB",
  curve: "monotoneY",
  density: "comfortable",
  fontSize: "md",
  theme: "zinc",
};

type MermaidThemeVariables = {
  darkMode: boolean;
  background: string;
  fontFamily: string;
  fontSize: string;
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  secondaryColor: string;
  secondaryTextColor: string;
  secondaryBorderColor: string;
  tertiaryColor: string;
  tertiaryTextColor: string;
  tertiaryBorderColor: string;
  lineColor: string;
  textColor: string;
  mainBkg: string;
  noteBkgColor: string;
  noteTextColor: string;
  noteBorderColor: string;
  edgeLabelBackground: string;
  clusterBkg: string;
  clusterBorder: string;
  titleColor: string;
  nodeTextColor: string;
};

const themeVariablesByTheme: Record<MermaidTheme, MermaidThemeVariables> = {
  zinc: {
    darkMode: true,
    background: "#09090b",
    fontFamily:
      "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    fontSize: "14px",
    primaryColor: "#18181b",
    primaryTextColor: "#e4e4e7",
    primaryBorderColor: "#27272a",
    secondaryColor: "#111113",
    secondaryTextColor: "#f4f4f5",
    secondaryBorderColor: "#3f3f46",
    tertiaryColor: "#0b0b0d",
    tertiaryTextColor: "#fafafa",
    tertiaryBorderColor: "#27272a",
    lineColor: "#52525b",
    textColor: "#e4e4e7",
    mainBkg: "#18181b",
    noteBkgColor: "#18181b",
    noteTextColor: "#e4e4e7",
    noteBorderColor: "#3f3f46",
    edgeLabelBackground: "#18181b",
    clusterBkg: "#0f0f12",
    clusterBorder: "#27272a",
    titleColor: "#fafafa",
    nodeTextColor: "#e4e4e7",
  },
  contrast: {
    darkMode: true,
    background: "#050507",
    fontFamily:
      "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    fontSize: "14px",
    primaryColor: "#1f1f25",
    primaryTextColor: "#fafafa",
    primaryBorderColor: "#52525b",
    secondaryColor: "#0f0f14",
    secondaryTextColor: "#fafafa",
    secondaryBorderColor: "#3f3f46",
    tertiaryColor: "#09090d",
    tertiaryTextColor: "#fafafa",
    tertiaryBorderColor: "#3f3f46",
    lineColor: "#a1a1aa",
    textColor: "#fafafa",
    mainBkg: "#1f1f25",
    noteBkgColor: "#1f1f25",
    noteTextColor: "#fafafa",
    noteBorderColor: "#52525b",
    edgeLabelBackground: "#111116",
    clusterBkg: "#0c0c11",
    clusterBorder: "#3f3f46",
    titleColor: "#fafafa",
    nodeTextColor: "#fafafa",
  },
};

const spacingByDensity: Record<
  MermaidDensity,
  { nodeSpacing: number; rankSpacing: number; diagramPadding: number; wrappingWidth: number }
> = {
  compact: { nodeSpacing: 40, rankSpacing: 50, diagramPadding: 12, wrappingWidth: 200 },
  comfortable: { nodeSpacing: 60, rankSpacing: 70, diagramPadding: 16, wrappingWidth: 240 },
  spacious: { nodeSpacing: 80, rankSpacing: 100, diagramPadding: 20, wrappingWidth: 280 },
};

const fontSizeByScale: Record<MermaidFontSize, string> = {
  sm: "12px",
  md: "14px",
  lg: "16px",
};

const buildMermaidConfig = (options: MermaidStyleOptions): MermaidConfig => {
  const spacing = spacingByDensity[options.density];
  const themeVariables = {
    ...themeVariablesByTheme[options.theme],
    fontSize: fontSizeByScale[options.fontSize],
  };
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables,
    flowchart: {
      curve: options.curve,
      nodeSpacing: spacing.nodeSpacing,
      rankSpacing: spacing.rankSpacing,
      diagramPadding: spacing.diagramPadding,
      wrappingWidth: spacing.wrappingWidth,
    },
  };
};

const applyFlowDirection = (chart: string, direction: MermaidDirection): string => {
  const lines = chart.split("\n");
  const firstLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstLineIndex < 0) {
    return chart;
  }
  const firstLine = lines[firstLineIndex];
  if (!/^flowchart\s+/i.test(firstLine)) {
    return chart;
  }
  lines[firstLineIndex] = firstLine.replace(
    /^(\s*flowchart\s+)\w+/i,
    `$1${direction}`,
  );
  return lines.join("\n");
};

type PanzoomController = ReturnType<typeof panzoom>;

export const MermaidRenderer = ({
  chart,
  className,
  options = defaultMermaidStyleOptions,
}: MermaidRendererProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const zoomStep = 1.35;
  const resolvedChart = applyFlowDirection(chart, options.direction);

  useEffect(() => {
    let cancelled = false;
    const renderDiagram = async () => {
      if (!containerRef.current) {
        return;
      }
      setError(null);
      containerRef.current.innerHTML = "";
      try {
        mermaid.initialize(buildMermaidConfig(options));
        const { svg } = await mermaid.render(
          `diagram-${Date.now()}`,
          resolvedChart,
          containerRef.current,
        );
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgElement = containerRef.current.querySelector("svg");
          if (svgElement) {
            svgElement.setAttribute("width", "100%");
            svgElement.setAttribute("height", "100%");
            svgElement.style.width = "100%";
            svgElement.style.height = "100%";
            panzoomRef.current?.dispose();
            panzoomRef.current = panzoom(svgElement, {
              maxZoom: 4,
              minZoom: 0.2,
              zoomSpeed: 0.2,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setError("Diagram render failed.");
        }
      }
    };
    renderDiagram();
    return () => {
      cancelled = true;
      panzoomRef.current?.dispose();
      panzoomRef.current = null;
    };
  }, [resolvedChart, options]);

  const zoomAtCenter = (factor: number) => {
    const instance = panzoomRef.current;
    const viewport = viewportRef.current;
    if (!instance || !viewport) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    instance.smoothZoom(centerX, centerY, factor);
  };

  const resetView = () => {
    const instance = panzoomRef.current;
    const viewport = viewportRef.current;
    if (!instance || !viewport) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    instance.smoothMoveTo(0, 0);
    instance.smoothZoomAbs(centerX, centerY, 1);
  };

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Render failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div
        ref={viewportRef}
        className={cn(
          "relative h-[560px] w-full overflow-hidden rounded-md border bg-background",
          className,
        )}
      >
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => zoomAtCenter(zoomStep)}
          >
            Zoom in
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => zoomAtCenter(1 / zoomStep)}
          >
            Zoom out
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
          >
            Reset
          </Button>
        </div>
        <div
          ref={containerRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        />
      </div>
    </div>
  );
};
