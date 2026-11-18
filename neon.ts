import { defineConfig } from "@neondatabase/config/v1";

// PostgreSQL is the only Neon service this app provisions initially.
// Auth0 remains the identity provider; the app validates Auth0 access tokens
// in Cloudflare Pages Functions.
export default defineConfig({});
