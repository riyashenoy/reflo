import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`Reflo server listening on http://localhost:${env.port}`);
  console.log('Identity source of truth: Firebase Auth');
  console.log('Postgres users table: synced mirror (upserted on authenticated requests)');
});
