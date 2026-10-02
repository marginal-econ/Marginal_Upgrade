# Marginal

Marginal is an AS and A Level Economics learning platform that combines the polished public experience from the Marginal UI/UX project with the working learning, assessment, AI, admin, and Supabase systems from MS Upgrade.

## Included

- Marginal marketing site, waitlist, referrals, responsive light/dark themes, and legal pages
- Student dashboard and progress review
- Structured essay marking with AO breakdowns and two-pass review
- Live Examiner, AO skills practice, model essay generation, and response guidance
- Real past-paper MCQ practice with timers, review, diagrams, and topic performance
- Question bank, Economics diagram library, OCR/handwriting support, and knowledge retrieval
- Admin console for users, content, calibration, AI providers, limits, waitlist, and analytics

Marginal supports student and administrator accounts. Teacher self-signup and classroom routes have been retired.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the public backend values and server-only secrets.
2. Install packages with `npm install`.
3. Apply the Supabase migrations in timestamp order.
4. Create the first admin using the procedure in `SUPABASE_SETUP.md`.
5. Start the app with `npm run dev`.

## Checks

```bash
npm run build
npx tsc --noEmit
npm run lint
```

The build targets Cloudflare Workers through Nitro. See `DEPLOYMENT.md` for deployment steps and `ARCHITECTURE.md` for the system map.
