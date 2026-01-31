declare module "panzoom" {
  type PanzoomOptions = {
    maxZoom?: number;
    minZoom?: number;
    zoomSpeed?: number;
  };

  type PanzoomInstance = {
    dispose: () => void;
    reset: () => void;
    zoomTo: (x: number, y: number, scale: number) => void;
    smoothZoom: (x: number, y: number, scale: number) => void;
  };

  export default function panzoom(
    element: Element,
    options?: PanzoomOptions,
  ): PanzoomInstance;
}
