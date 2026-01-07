// Load environment variables before anything else
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../../../.env');
config({ path: envPath });

console.log('[Preload] Environment variables loaded from:', envPath);
console.log('[Preload] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
