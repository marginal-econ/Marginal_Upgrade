# Deployment

Marginal builds as a Cloudflare Workers application through Nitro.

1. Complete `SUPABASE_SETUP.md`.
2. Set every server-only value as a Worker secret; never put secrets in `wrangler.jsonc` or a `VITE_*` variable.
3. Run:

```bash
npm ci
npx tsc --noEmit
npm run lint
npm run build
```

4. Preview with `npm run preview`.
5. Deploy with `npx wrangler deploy` or the configured CI pipeline.
6. Add the production origin to Supabase Auth redirect URLs and verify sign-in, recovery, waitlist submission, uploads, grading, and admin denial for a student account.

The build output is `.output/`. Configure Worker and AI error monitoring before opening access broadly.
