import { MongoClient, type Db, type Collection } from 'mongodb';

/**
 * MongoDB connection (free tier M0 Atlas or the docker-compose Mongo).
 * Used for semi-structured content that doesn't need relational integrity:
 * notifications, banners, FAQ/content, support tickets, activity logs.
 */
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prinzex';
const dbName = process.env.MONGODB_DB || 'prinzex';

const globalForMongo = globalThis as unknown as {
  mongo?: { client: MongoClient; db: Db; promise?: Promise<Db> };
};

export async function getMongoDb(): Promise<Db> {
  if (globalForMongo.mongo?.db) return globalForMongo.mongo.db;

  const client = new MongoClient(uri);
  const promise = client.connect().then(() => client.db(dbName));

  if (process.env.NODE_ENV === 'production') {
    globalForMongo.mongo = { client, db: await promise };
  } else {
    globalForMongo.mongo = { client, db: await promise, promise };
  }
  return globalForMongo.mongo.db;
}

/** Typed accessor for a specific Mongo collection. */
export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getMongoDb();
  return db.collection<T>(name);
}

export type { Db };
