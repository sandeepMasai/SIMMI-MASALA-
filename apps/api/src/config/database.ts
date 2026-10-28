import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDatabase(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri);
  logger.info({ db: conn.connection.name }, 'MongoDB connected');
  return conn;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export function supportsTransactions(): boolean {
  // Replica set / mongos required. Dev compose uses a single-node replica set.
  const topology = (mongoose.connection as unknown as { client?: { options?: { replicaSet?: string } } })
    .client?.options?.replicaSet;
  return Boolean(topology) || env.MONGODB_URI.includes('replicaSet=') || env.NODE_ENV === 'test';
}
