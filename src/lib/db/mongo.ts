import { type Db, MongoClient } from "mongodb";

import { requireEnv } from "@/lib/env";

const mongoUri = requireEnv("MONGODB_URI");
const mongoDbName = requireEnv("MONGODB_DB_NAME");

type GlobalMongo = {
  mongoClient?: MongoClient;
};

const globalForMongo = globalThis as unknown as GlobalMongo;

const mongoClient = globalForMongo.mongoClient ?? new MongoClient(mongoUri);

if (process.env.NODE_ENV !== "production") {
  globalForMongo.mongoClient = mongoClient;
}

export const getMongoClient = (): MongoClient => mongoClient;

export const getMongoDb = (): Db => mongoClient.db(mongoDbName);
