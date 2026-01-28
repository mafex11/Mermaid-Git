import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

import { getMongoClient, getMongoDb } from "@/lib/db/mongo";
import { requireEnv } from "@/lib/env";

export const auth = betterAuth({
  secret: requireEnv("BETTER_AUTH_SECRET"),
  baseURL: requireEnv("BETTER_AUTH_URL"),
  database: mongodbAdapter(getMongoDb(), {
    client: getMongoClient(),
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
