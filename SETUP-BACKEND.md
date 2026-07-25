# Making the accounts real

The site ships in **mock mode**. This document explains what that means, and the exact steps to turn it into a real service.

## What mock mode is, honestly

Everything runs in the visitor's browser. There is no server.

- Accounts are saved in that browser's `localStorage` and nowhere else. Open the site in a different browser and your account does not exist.
- Verification codes are generated in the browser and **printed on the screen**, because there is nothing available to send an SMS or an email with.
- Passwords are hashed with SHA-256 before being stored, which stops a casual look at `localStorage` showing plaintext. That is all it does. A determined person can read, edit or bypass any of it from the developer console in about a minute.
- The rate limits and the five-attempt code lockout are real code, but they live on the same side of the wire as the attacker, so they are a user experience feature and not a security control.

Mock mode is good for demos, screenshots, usability testing and showing an investor the flow. It is not something to take real signups on. Do not put it in front of the public with real people's phone numbers.

## Why the front end still matters

Every validation rule in the browser is duplicated on the server in `supabase/schema.sql` — the 18+ check, the bio length, the requirement that a profile be complete before it can send a connection request. The browser copy exists to give a fast, kind error message. The database copy exists because that is the one that cannot be bypassed. Both are needed, and neither substitutes for the other.

## Going real with Supabase

Supabase is a hosted Postgres with authentication, storage and row-level security. It works from a purely static site because everything is client-side SDK calls, so **your GitHub Pages deployment does not change at all**. Free tier is enough to start.

### 1. Create the project

Sign up at supabase.com, create a project, pick a region close to your users (Frankfurt for Europe).

### 2. Run the schema

Open **SQL Editor**, paste the whole of `supabase/schema.sql`, run it. This creates the tables, the row-level security policies, the avatars storage bucket, and a trigger that makes an empty profile row whenever someone signs up.

Row-level security is the part people skip. Do not skip it. Without those policies your public anon key lets anyone download every profile in the database.

### 3. Point the site at it

**Settings → API** gives you the project URL and the `anon` public key. Put them in `assets/js/config.js`:

```js
window.SAMO_CONFIG = {
  BACKEND: 'supabase',
  SUPABASE_URL: 'https://yourproject.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...'
};
```

The anon key is designed to be public and is safe in a git repository. The `service_role` key is not. Never put the service role key in any file that goes to a browser.

### 4. Email

Works immediately on Supabase's built-in mailer, which is rate-limited and fine for testing. For real volume, add your own SMTP under **Authentication → Email Templates → SMTP Settings**. Postmark, Resend and Amazon SES all work.

Change the email templates to your own wording while you are there. The defaults say "Supabase".

### 5. Phone (SMS)

**Authentication → Providers → Phone**, then connect Twilio, MessageBird or Vonage. This is the one part that costs money: roughly 4 to 8 euro cents per SMS in Europe, more to Pakistan and much more to some countries.

Budget for abuse. Someone can burn through your SMS credit by requesting codes in a loop, so set Supabase's rate limits under **Authentication → Rate Limits** and consider turning on CAPTCHA (hCaptcha or Turnstile) for signup.

If you want to launch without SMS costs, set `REQUIRE_PHONE: false` in `config.js`. Email-only verification is weaker, but it is honest and it is free. You can add phone later as a "verified" badge that unlocks more.

### 6. Account deletion

Deleting an auth user needs the service role key, which cannot live in the browser. Create a Supabase Edge Function called `delete-account`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')!
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const jwt = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await admin.auth.getUser(jwt)
  if (error || !user) return new Response('Unauthorized', { status: 401 })

  await admin.auth.admin.deleteUser(user.id)
  return new Response(JSON.stringify({ deleted: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Deploy with `supabase functions deploy delete-account`. Until you do, the delete button reports that deletion is not set up yet rather than silently failing.

## Other backends

The adapter interface is small. To use Firebase, Appwrite, Pocketbase or your own API, copy the `Supabase` object in `assets/js/backend.js` and implement the same methods:

```
signUp, sendCode, verifyCode, signIn, signOut, getSession,
getProfile, getProfileById, saveProfile, listProfiles,
uploadPhoto, connect, listConnections, report, block,
changePassword, exportData, deleteAccount
```

Every one returns a Promise. No page code touches the backend directly, so nothing above `backend.js` needs to change.

## Before real people use this

- [ ] Row-level security enabled and tested (sign in as user A, try to read user B's hidden profile)
- [ ] Rate limits and CAPTCHA on signup and code sending
- [ ] A real privacy policy with your legal entity named — `privacy.html` is a template, not legal advice
- [ ] Someone actually reading the moderation reports, in the languages you support
- [ ] A written plan for what happens when a member reports being harmed
- [ ] Photo moderation, manual at first, so nobody uses a stolen photo
- [ ] Backups turned on
- [ ] Tested account deletion end to end

The last four are not technical work, and they are the ones that decide whether a service like this is safe to run. A dating-adjacent app that connects isolated people in an unfamiliar country carries real risk. Build the moderation before the growth.
