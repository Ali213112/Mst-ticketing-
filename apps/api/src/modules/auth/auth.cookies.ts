import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.js';

export function getAuthCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    maxAge: maxAgeMs,
    path: '/',
  };
}

export function getRefreshCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    maxAge: maxAgeMs,
    path: '/api/auth/refresh',
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, getAuthCookieOptions(15 * 60 * 1000));
  res.cookie('refresh_token', refreshToken, getRefreshCookieOptions(7 * 24 * 60 * 60 * 1000));
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/', domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN });
  res.clearCookie('refresh_token', {
    path: '/api/auth/refresh',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
  });
}
