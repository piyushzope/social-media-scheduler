// Load environment variables before anything else (only in development)
if (process.env.NODE_ENV !== 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { config } = require('dotenv');
    const { resolve } = require('path');
    const envPath = resolve(__dirname, '../../../.env');
    config({ path: envPath });
    console.log('[Preload] Environment variables loaded from:', envPath);
  } catch {
    console.log('[Preload] dotenv not available, using environment variables directly');
  }
}

console.log('[Preload] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
