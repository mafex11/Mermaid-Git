"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import panzoom from "panzoom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MermaidRendererProps = {
  chart: string;
  className?: string;
};

type PanzoomController = ReturnType<typeof panzoom>;

export const MermaidRenderer = ({ chart, className }: MermaidRendererProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const zoomStep = 1.35;

  useEffect(() => {
    let cancelled = false;
    const renderDiagram = async () => {
      if (!containerRef.current) {
        return;
      }
      setError(null);
      containerRef.current.innerHTML = "";
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        const { svg } = await mermaid.render(
          `diagram-${Date.now()}`,
          chart,
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
  }, [chart]);

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
            onClick={() => panzoomRef.current?.reset()}
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
