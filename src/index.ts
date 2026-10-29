import { app } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';

async function main(): Promise<void> {
  if (env.RUN_MIGRATIONS_ON_BOOT) {
    await runMigrations();
    console.log('[db] migrations up to date');
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(() => {
      void closeDb().finally(() => process.exit(0));
    });
    // Don't hang forever on lingering connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});
