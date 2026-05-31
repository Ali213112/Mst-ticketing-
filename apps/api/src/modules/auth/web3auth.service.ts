import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose';

import { env } from '../../config/env.js';



export interface Web3AuthClaims {

  sub: string;

  email?: string;

  name?: string;

  verifier?: string;

  verifierId?: string;

}



const jwks = createRemoteJWKSet(new URL(env.WEB3AUTH_JWKS_URL));



const ALLOWED_ISSUERS = new Set([

  'https://api-auth.web3auth.io',

  'https://api.openlogin.com',

]);



function normalizeIssuer(issuer: string): string {

  return issuer.replace(/\/+$/, '');

}



function audienceMatches(payloadAud: unknown, clientId: string): boolean {

  if (typeof payloadAud === 'string') return payloadAud === clientId;

  if (Array.isArray(payloadAud)) return payloadAud.some((aud) => aud === clientId);

  return false;

}



function resolveUserId(payload: Record<string, unknown>): string {

  if (typeof payload.sub === 'string' && payload.sub) return payload.sub;

  if (typeof payload.userId === 'string' && payload.userId) return payload.userId;

  if (typeof payload.verifierId === 'string' && typeof payload.verifier === 'string') {

    return `${payload.verifier}:${payload.verifierId}`;

  }

  throw new Error('Invalid token: missing user identifier (sub/userId/verifierId)');

}



function logVerifyFailure(idToken: string, error: unknown): void {

  if (env.NODE_ENV !== 'development') return;



  try {

    const header = decodeProtectedHeader(idToken);

    const decoded = decodeJwt(idToken);

    console.error('[web3auth] JWT verification failed:', error instanceof Error ? error.message : error);

    console.error('[web3auth] token alg:', header.alg, 'iss:', decoded.iss, 'aud:', decoded.aud);

    console.error('[web3auth] identifiers:', {

      sub: decoded.sub,

      userId: decoded.userId,

      verifier: decoded.verifier,

      verifierId: decoded.verifierId,

    });

    console.error('[web3auth] expected audience prefix:', env.WEB3AUTH_CLIENT_ID.trim().slice(0, 12));

  } catch {

    console.error('[web3auth] could not decode token for debug');

  }

}



export async function verifyWeb3AuthIdToken(idToken: string): Promise<Web3AuthClaims> {

  const clientId = env.WEB3AUTH_CLIENT_ID.trim();



  let payload: Record<string, unknown>;

  try {

    // Match Web3Auth examples: verify signature via JWKS, then validate claims manually.

    const result = await jwtVerify(idToken, jwks, {

      algorithms: ['ES256'],

      clockTolerance: 30,

    });

    payload = result.payload as Record<string, unknown>;

  } catch (error) {

    logVerifyFailure(idToken, error);

    throw error;

  }



  const issuer = typeof payload.iss === 'string' ? normalizeIssuer(payload.iss) : '';

  if (!ALLOWED_ISSUERS.has(issuer)) {

    throw new Error(`Unexpected token issuer: ${payload.iss ?? 'missing'}`);

  }



  if (!audienceMatches(payload.aud, clientId)) {

    throw new Error('Token audience does not match WEB3AUTH_CLIENT_ID');

  }



  const sub = resolveUserId(payload);



  return {

    sub,

    email: typeof payload.email === 'string' ? payload.email : undefined,

    name: typeof payload.name === 'string' ? payload.name : undefined,

    verifier: typeof payload.verifier === 'string' ? payload.verifier : undefined,

    verifierId: typeof payload.verifierId === 'string' ? payload.verifierId : undefined,

  };

}


