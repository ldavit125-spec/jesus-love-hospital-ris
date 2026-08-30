import { defineNitroConfig } from 'nitro/config';

// Vercel deployment preset; Cloudflare/Wrangler remains the default local build.
export default defineNitroConfig({ preset: 'vercel' });
