# Supabase setup

1. Create a Supabase project.
2. In Project Settings → API, copy the project URL, publishable key, and service-role key.
3. Copy `.env.example` to `.env.local`. Put public browser values only in `VITE_*` variables. Keep service-role, waitlist, and AI secrets in server-only variables.
4. Link the project and apply the migrations:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

5. Run `supabase/waitlist.sql` and `supabase/admin-settings.sql` if those standalone modules are not already present in the target database.
6. Enable email/password sign-in, require email confirmation in production, and add local and production `/auth` redirect URLs.
7. Confirm RLS is enabled on user-owned and administrative tables. Do not add broad anon write policies.
8. Configure the storage buckets and policies created by the migrations.

## Create the first administrator

Register the approved account normally, confirm its email, then run this in the Supabase SQL editor after replacing the address:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('approved-admin@example.com')
on conflict (user_id, role) do nothing;
```

Do not expose this as a public RPC and do not let the first registered user claim the role. The final migration revokes the legacy bootstrap function.

Verify that a new account receives only the student role, students are denied admin mutations, the approved admin can open `/admin`, and waitlist, uploads, MCQs, grading, and AI provider tests all work.
