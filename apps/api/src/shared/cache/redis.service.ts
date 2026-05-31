import { createClient } from 'redis';
import { env } from '../../config/env.js';

export const redisClient = createClient({ url: env.REDIS_URL });

redisClient.on('error', (err) => {
  console.error('Redis client error', err);
});

let connected = false;

export async function connectRedis(): Promise<void> {
  if (!connected) {
    await redisClient.connect();
    connected = true;
  }
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await connectRedis();
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
