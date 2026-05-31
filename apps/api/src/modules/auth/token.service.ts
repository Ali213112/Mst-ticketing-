import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { randomBytes } from 'crypto';
import { env } from '../../config/env.js';
import { redisClient, connectRedis } from '../../shared/cache/redis.service.js';
import type { AccessTokenPayload } from '@ticketchain/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveKeyPath(configPath: string): string {
  if (path.isAbsolute(configPath)) return configPath;
  const apiRoot = path.resolve(__dirname, '../../..');
  return path.resolve(apiRoot, configPath.replace(/^\.\//, ''));
}

let privateKeyPromise: ReturnType<typeof importPKCS8> | null = null;
let publicKeyPromise: ReturnType<typeof importSPKI> | null = null;

async function getPrivateKey() {
  if (!privateKeyPromise) {
    const pem = fs.readFileSync(resolveKeyPath(env.JWT_PRIVATE_KEY_PATH), 'utf8');
    privateKeyPromise = importPKCS8(pem, 'RS256');
  }
  return privateKeyPromise;
}

async function getPublicKey() {
  if (!publicKeyPromise) {
    const pem = fs.readFileSync(resolveKeyPath(env.JWT_PUBLIC_KEY_PATH), 'utf8');
    publicKeyPromise = importSPKI(pem, 'RS256');
  }
  return publicKeyPromise;
}

function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 60);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const key = await getPrivateKey();
  const expiresIn = parseDurationToSeconds(env.JWT_ACCESS_EXPIRY);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(key);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const key = await getPublicKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ['RS256'] });

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.walletAddress !== 'string' ||
      typeof payload.role !== 'number' ||
      typeof payload.isPlatformAdmin !== 'boolean'
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role as AccessTokenPayload['role'],
      walletAddress: payload.walletAddress,
      orgIds: Array.isArray(payload.orgIds) ? (payload.orgIds as string[]) : [],
      isPlatformAdmin: payload.isPlatformAdmin,
    };
  } catch {
    return null;
  }
}

export async function createRefreshToken(userId: string): Promise<string> {
  await connectRedis();
  const tokenId = randomBytes(32).toString('hex');
  const token = `${userId}.${tokenId}`;
  const ttlSeconds = parseDurationToSeconds(env.JWT_REFRESH_EXPIRY);

  await redisClient.set(`refresh:${userId}:${tokenId}`, JSON.stringify({ userId, issuedAt: Date.now() }), {
    EX: ttlSeconds,
  });

  return token;
}

export async function rotateRefreshToken(refreshToken: string): Promise<{ userId: string; newToken: string } | null> {
  const [userId, tokenId] = refreshToken.split('.');
  if (!userId || !tokenId) return null;

  await connectRedis();
  const key = `refresh:${userId}:${tokenId}`;
  const stored = await redisClient.get(key);
  if (!stored) return null;

  await redisClient.del(key);
  const newToken = await createRefreshToken(userId);
  return { userId, newToken };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const [userId, tokenId] = refreshToken.split('.');
  if (!userId || !tokenId) return;
  await connectRedis();
  await redisClient.del(`refresh:${userId}:${tokenId}`);
}

export function ensureJwtKeysExist(): void {
  const privatePath = resolveKeyPath(env.JWT_PRIVATE_KEY_PATH);
  const publicPath = resolveKeyPath(env.JWT_PUBLIC_KEY_PATH);
  if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
    console.error(
      'JWT keys missing. Run: node apps/api/scripts/generate-jwt-keys.mjs'
    );
    process.exit(1);
  }
}
