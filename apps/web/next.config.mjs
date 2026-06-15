import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import withPWAInit from '@ducanh2912/next-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../.env') });

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: {
    skipWaiting: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};

export default withPWA(nextConfig);
