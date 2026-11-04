# Agent notes

This project no longer syncs with Lovable. There is no special git-history
constraint — commit, rebase, and push on this repo as you normally would.

## Multi-developer Sync Protocol
Both collaborators deploy to the same production environment:
1. ALWAYS run `git pull origin main` before starting tasks, editing code, or running `npm run build` / `npx wrangler deploy` / `npx nitro deploy`.
2. After deploying, IMMEDIATELY commit and push to `origin main` (`git push origin main`) so remote always matches production.
3. Never force push without coordinating.
