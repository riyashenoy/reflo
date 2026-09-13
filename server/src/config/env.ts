import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load server/.env (never commit this file — root .gitignore covers .env*).
dotenv.config({ path: path.join(__dirname, '../../.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 8787),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/reflo'),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    /**
     * Service-account private_key in .env must be a single quoted line with
     * literal \n escape sequences. We expand those to real newlines here.
     */
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
};
