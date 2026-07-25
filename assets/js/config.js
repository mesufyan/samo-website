/* ==========================================================================
   SAMO — Configuration
   This is the only file you need to edit to go from demo to real accounts.
   ========================================================================== */

window.SAMO_CONFIG = {

  /* ------------------------------------------------------------------
     BACKEND: 'mock' | 'supabase'

     'mock'
       Everything runs in the visitor's own browser. Accounts, codes and
       profiles are stored in that browser and nowhere else. Verification
       codes are DISPLAYED ON SCREEN because there is nothing to send them
       with. This is a demo. It is not security and it is not private.
       Use it for showing the product, testing flows, and screenshots.

     'supabase'
       Real accounts, real email codes, real password hashing, real database
       with row-level security. Free tier is enough to start. Phone SMS
       needs a Twilio account and costs money per message.
       Setup instructions: SETUP-BACKEND.md
     ------------------------------------------------------------------ */
  BACKEND: 'mock',

  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  /* Waitlist form on the landing page. Formspree, Buttondown, your own
     endpoint. Empty means entries stay in the browser. */
  FORM_ENDPOINT: '',

  /* Require a verified phone number before a profile can go live.
     Turn off if you launch email-only to avoid SMS costs. */
  REQUIRE_PHONE: true,

  /* Minimum age to register. */
  MIN_AGE: 18,

  /* How long a signed-in session lasts in mock mode, in days. */
  SESSION_DAYS: 30
};
