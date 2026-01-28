"use client";

import useSWR from "swr";

import { listInstalledRepos, type ReposResponse } from "@/app/actions/repos";

const fetchRepos = async (): Promise<ReposResponse> => listInstalledRepos();

export const useRepos = () =>
  useSWR<ReposResponse>("repos", fetchRepos, {
    revalidateOnFocus: false,
  });
