# Migration plan

## Sources

- Marginal UI/UX: visual system, public site, themes, waitlist, referrals, legal pages, branding, and marketing interactions.
- MS Upgrade: authenticated app, Supabase model, grading, Live Examiner, MCQ engine, learning tools, diagrams, admin controls, and AI integrations.

## Decisions

1. Keep MS Upgrade as the functional core to preserve assessment and database behavior.
2. Replace its public route and global visual tokens with Marginal UI/UX.
3. Mount the waitlist API ahead of TanStack routing while retaining authenticated server-function middleware.
4. Add sign-in to the public navigation and use one theme system across public and authenticated screens.
5. Retire classroom routes, assignment UI, teacher self-signup, and teacher privilege. Preserve old SQL migrations as immutable history; the final migration normalizes legacy roles.
6. Preserve all other student/admin features and fix strict TypeScript mismatches uncovered during integration.

Back up the database, apply migrations in staging, create the approved admin explicitly, test with separate student/admin accounts, validate storage and AI integrations, and only then deploy. Existing essays and attempts are preserved.
