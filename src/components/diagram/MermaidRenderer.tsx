"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type MermaidRendererProps = {
  chart: string;
};

export const MermaidRenderer = ({ chart }: MermaidRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

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
    };
  }, [chart]);

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Render failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div ref={containerRef} />
    </div>
  );
};
