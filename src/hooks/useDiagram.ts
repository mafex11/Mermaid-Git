"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";

import {
  getDiagramForRepo,
  listDiagramSummaries,
  startDiagramBuild,
  type DiagramBuildResponse,
  type DiagramResponse,
  type DiagramSummariesResponse,
} from "@/app/actions/diagram";

const fetchDiagramSummaries = async (): Promise<DiagramSummariesResponse> =>
  listDiagramSummaries();

const fetchDiagram = async (repoId: number): Promise<DiagramResponse> =>
  getDiagramForRepo(repoId);

export const useDiagramSummaries = () =>
  useSWR<DiagramSummariesResponse>("diagram-summaries", fetchDiagramSummaries, {
    revalidateOnFocus: false,
  });

export const useDiagram = (repoId: number | null) =>
  useSWR<DiagramResponse>(
    repoId ? ["diagram", repoId] : null,
    () => {
      if (repoId === null) {
        return Promise.resolve({ ok: false, error: "Missing repo id" });
      }
      return fetchDiagram(repoId);
    },
    { revalidateOnFocus: false },
  );

export const useDiagramBuild = () => {
  const { mutate } = useSWRConfig();
  const mutation = useSWRMutation<
    DiagramBuildResponse,
    Error,
    string,
    number
  >("diagram-build", (_key, { arg }) => startDiagramBuild(arg));

  const trigger = async (repoId: number) => {
    const result = await mutation.trigger(repoId);
    await mutate("diagram-summaries");
    await mutate(["diagram", repoId]);
    return result;
  };

  return {
    ...mutation,
    trigger,
  };
};
