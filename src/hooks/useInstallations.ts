"use client";

import useSWR from "swr";

import {
  listGitHubInstallations,
  type InstallationsResponse,
} from "@/app/actions/repos";

const fetchInstallations = async (): Promise<InstallationsResponse> =>
  listGitHubInstallations();

export const useInstallations = () =>
  useSWR<InstallationsResponse>("github-installations", fetchInstallations, {
    revalidateOnFocus: false,
  });
