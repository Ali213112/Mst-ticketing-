import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './shared/db/postgres.service.js';
import { checkRedisConnection } from './shared/cache/redis.service.js';
import { checkMstRpcConnection } from './shared/blockchain/mst.service.js';
import { ensureJwtKeysExist } from './modules/auth/token.service.js';
import authRoutes from './modules/auth/auth.routes.js';
import platformRoutes from './modules/platform/platform.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import eventsRoutes from './modules/events/events.routes.js';
import ticketsRoutes from './modules/tickets/tickets.routes.js';
import webhooksRoutes from './modules/payments/webhooks.routes.js';
import orgRoutes from './modules/org/org.routes.js';
import volunteerRoutes from './modules/volunteer/volunteer.routes.js';

ensureJwtKeysExist();

const app = express();

app.use(
  pinoHttp({
    level: env.LOG_LEVEL,
  })
);
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', eventsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/volunteer', volunteerRoutes);

app.get('/health', async (_req, res) => {
  const [dbOk, redisOk, mst] = await Promise.all([
    checkDatabaseConnection().catch(() => false),
    checkRedisConnection().catch(() => false),
    checkMstRpcConnection(),
  ]);

  const healthy = dbOk && redisOk;
  const status = healthy ? 'ok' : 'degraded';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
      mstRpc: mst.ok ? 'up' : 'down',
      mstBlockNumber: mst.blockNumber ?? null,
    },
  });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'TicketChain MST API',
    version: '0.1.0',
    docs: '/health',
    auth: {
      verify: 'POST /api/auth/verify',
      me: 'GET /api/auth/me',
      refresh: 'POST /api/auth/refresh',
      logout: 'POST /api/auth/logout',
      acceptInvite: 'POST /api/auth/accept-invite',
    },
    platform: {
      organisations: 'GET/POST /api/platform/organisations',
    },
    admin: {
      organisation: 'GET/PATCH /api/admin/organisation',
      members: 'GET /api/admin/members',
      invite: 'POST /api/admin/members/invite',
      events: 'GET/POST /api/admin/events',
    },
    events: {
      browse: 'GET /api/events',
      detail: 'GET /api/events/:eventId',
    },
    tickets: {
      checkout: 'POST /api/tickets/checkout',
      mint: 'POST /api/tickets/mint (dev/direct only)',
      order: 'GET /api/tickets/orders/:orderId',
      mine: 'GET /api/tickets',
      qr: 'GET /api/tickets/:ticketId/qr',
    },
    webhooks: {
      chainpay: 'POST /api/webhooks/chainpay?order_id=',
      payments: 'POST /api/webhooks/payments?order_id=&provider=',
    },
    orgs: {
      mine: 'GET /api/orgs/me',
      profile: 'GET /api/orgs/:orgId',
      bySlug: 'GET /api/orgs/slug/:slug',
      acceptInvite: 'POST /api/orgs/accept-invite',
    },
    volunteer: {
      verifyCheckin: 'POST /api/volunteer/checkin/verify',
      events: 'GET /api/volunteer/events',
      eventDetail: 'GET /api/volunteer/events/:eventId',
      checkinStats: 'GET /api/volunteer/checkin/stats?eventId=',
      checkinHistory: 'GET /api/volunteer/checkin/history?eventId=&page=&limit=',
      offlineSnapshot: 'GET /api/volunteer/checkin/offline-snapshot?eventId=',
    },
  });
});

const port = env.PORT;

app.listen(port, () => {
  console.log(`TicketChain API listening on http://localhost:${port}`);
});

export default app;
