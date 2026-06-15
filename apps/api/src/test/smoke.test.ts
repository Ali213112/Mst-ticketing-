/**
 * API integration smoke test — DB, Redis, and Express app routes.
 */
import 'dotenv/config';
import request from 'supertest';

async function run(): Promise<void> {
  const { checkDatabaseConnection } = await import('../shared/db/postgres.service.js');
  const { checkRedisConnection } = await import('../shared/cache/redis.service.js');

  const [dbOk, redisOk] = await Promise.all([
    checkDatabaseConnection().catch(() => false),
    checkRedisConnection().catch(() => false),
  ]);

  if (!dbOk) {
    console.error('Smoke test failed: database unreachable');
    process.exit(1);
  }
  if (!redisOk) {
    console.error('Smoke test failed: redis unreachable');
    process.exit(1);
  }

  const { default: app } = await import('../app.js');

  const health = await request(app).get('/health');
  if (!health.body.services) {
    console.error('Smoke test failed: health response missing services');
    process.exit(1);
  }

  const index = await request(app).get('/');
  if (!index.body.name) {
    console.error('Smoke test failed: API index missing name');
    process.exit(1);
  }

  const marketplace = await request(app).get('/api/marketplace');
  if (!marketplace.body.success) {
    console.error('Smoke test failed: marketplace route');
    process.exit(1);
  }

  console.log('API smoke test passed');
}

void run().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
