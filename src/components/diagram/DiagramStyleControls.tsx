"use client";

import { useState } from "react";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { defaultMermaidStyleOptions, type MermaidStyleOptions } from "./MermaidRenderer";

type DiagramStyleControlsProps = {
  options: MermaidStyleOptions;
  onChange: (options: MermaidStyleOptions) => void;
};

export const DiagramStyleControls = ({
  options,
  onChange,
}: DiagramStyleControlsProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const updateOptions = (next: Partial<MermaidStyleOptions>) => {
    onChange({ ...options, ...next });
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer space-y-3"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((value) => !value);
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Diagram styling</CardTitle>
            <CardDescription>
              Tune layout, density, and typography for each diagram.
            </CardDescription>
          </div>
          <ChevronDown
            className={`mt-1 size-4 transition-transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
            aria-hidden
          />
        </div>
        <div className="border-t border-border" />
      </CardHeader>
      {isOpen ? (
        <>
          <CardContent className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Direction</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={options.direction === "TB" ? "default" : "outline"}
                    onClick={() => updateOptions({ direction: "TB" })}
                  >
                    Top to bottom
                  </Button>
                  <Button
                    size="sm"
                    variant={options.direction === "LR" ? "default" : "outline"}
                    onClick={() => updateOptions({ direction: "LR" })}
                  >
                    Left to right
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Curves</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={options.curve === "monotoneY" ? "default" : "outline"}
                    onClick={() => updateOptions({ curve: "monotoneY" })}
                  >
                    Smooth
                  </Button>
                  <Button
                    size="sm"
                    variant={options.curve === "basis" ? "default" : "outline"}
                    onClick={() => updateOptions({ curve: "basis" })}
                  >
                    Flow
                  </Button>
                  <Button
                    size="sm"
                    variant={options.curve === "linear" ? "default" : "outline"}
                    onClick={() => updateOptions({ curve: "linear" })}
                  >
                    Straight
                  </Button>
                  <Button
                    size="sm"
                    variant={options.curve === "step" ? "default" : "outline"}
                    onClick={() => updateOptions({ curve: "step" })}
                  >
                    Stepped
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Density</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={options.density === "compact" ? "default" : "outline"}
                    onClick={() => updateOptions({ density: "compact" })}
                  >
                    Compact
                  </Button>
                  <Button
                    size="sm"
                    variant={options.density === "comfortable" ? "default" : "outline"}
                    onClick={() => updateOptions({ density: "comfortable" })}
                  >
                    Comfortable
                  </Button>
                  <Button
                    size="sm"
                    variant={options.density === "spacious" ? "default" : "outline"}
                    onClick={() => updateOptions({ density: "spacious" })}
                  >
                    Spacious
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Font size</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={options.fontSize === "sm" ? "default" : "outline"}
                    onClick={() => updateOptions({ fontSize: "sm" })}
                  >
                    Small
                  </Button>
                  <Button
                    size="sm"
                    variant={options.fontSize === "md" ? "default" : "outline"}
                    onClick={() => updateOptions({ fontSize: "md" })}
                  >
                    Default
                  </Button>
                  <Button
                    size="sm"
                    variant={options.fontSize === "lg" ? "default" : "outline"}
                    onClick={() => updateOptions({ fontSize: "lg" })}
                  >
                    Large
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Theme</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={options.theme === "zinc" ? "default" : "outline"}
                  onClick={() => updateOptions({ theme: "zinc" })}
                >
                  Zinc
                </Button>
                <Button
                  size="sm"
                  variant={options.theme === "contrast" ? "default" : "outline"}
                  onClick={() => updateOptions({ theme: "contrast" })}
                >
                  Contrast
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange(defaultMermaidStyleOptions)}
            >
              Reset to defaults
            </Button>
          </CardFooter>
        </>
      ) : null}
    </Card>
  );
};
