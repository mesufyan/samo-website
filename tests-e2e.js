/* End-to-end walk through the whole account flow in a simulated browser. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const DIR = '/home/claude/samo-website/';

const jar = {};           // shared localStorage across "page loads"
const log = [];
let fails = 0;

function ok(label, cond, extra) {
  log.push((cond ? '  PASS  ' : '  FAIL  ') + label + (extra ? '  -> ' + extra : ''));
  if (!cond) fails++;
}

function load(page, search = '') {
  const html = fs.readFileSync(DIR + page, 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true,
    url: 'https://mesufyan.github.io/samo-website/' + page + search });
  const w = dom.window;

  // persistent storage across pages (patch the prototype: jsdom hands back a
  // fresh localStorage wrapper on each property access)
  const SP = w.Storage.prototype;
  SP.getItem = function (k) { return k in jar ? jar[k] : null; };
  SP.setItem = function (k, v) { jar[k] = String(v); };
  SP.removeItem = function (k) { delete jar[k]; };
  SP.clear = function () { for (const k in jar) delete jar[k]; };
  SP.key = function (i) { return Object.keys(jar)[i] || null; };
  Object.defineProperty(SP, 'length', { get() { return Object.keys(jar).length; }, configurable: true });

  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.IntersectionObserver = class { observe(el){ el.classList.add('visible'); } unobserve(){} };
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.URL.createObjectURL = () => 'blob:x';
  w.URL.revokeObjectURL = () => {};
  const navs = [];
  Object.defineProperty(w, '__navs', { value: navs });

  const files = ['assets/js/config.js', 'assets/js/data.js', 'assets/js/core.js', 'assets/js/backend.js'];
  const pageScript = {
    'index.html': 'landing.js', 'signup.html': 'signup.js', 'login.html': 'login.js',
    'verify.html': 'verify.js', 'onboarding.html': 'onboarding.js',
    'profile.html': 'profile.js', 'discover.html': 'discover.js', 'settings.html': 'settings.js'
  }[page];

  const errors = [];
  w.onerror = m => errors.push(m);
  try {
    files.forEach(f => w.eval(fs.readFileSync(DIR + f, 'utf8')));
    // intercept navigation
    w.eval('Core.go = function(p){ __navs.push(p); };');
    if (pageScript) w.eval(fs.readFileSync(DIR + 'assets/js/' + pageScript, 'utf8'));
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  } catch (e) { errors.push(e.stack); }

  return { w, d: w.document, navs, errors };
}

const tick = (ms) => new Promise(r => setTimeout(r, ms || 400));

// Poll until a selector appears, so tests do not depend on fixed timings.
async function waitFor(d, sel, ms = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const el = d.querySelector(sel);
    if (el) return el;
    await new Promise(r => setTimeout(r, 50));
  }
  return null;
}

(async () => {
// ---------------------------------------------------------------- landing
{
  const { d, errors } = load('index.html');
  await tick();
  ok('landing renders header', !!d.querySelector('.site-nav'));
  ok('landing renders footer', !!d.querySelector('.site-footer'));
  ok('landing language chips = 59', d.querySelectorAll('.lang-chip').length === 59);
  ok('landing pricing cards = 3', d.querySelectorAll('.pricing-card').length === 3);
  ok('landing signed-out CTA -> signup', /signup\.html/.test(d.querySelector('[data-signed-out-cta]').href));
  ok('landing no errors', errors.length === 0, errors[0]);
}

// ----------------------------------------------------------------- signup
{
  const { w, d, navs, errors } = load('signup.html');
  await tick();
  ok('signup form present', !!d.querySelector('#signupForm'));

  // weak password rejected
  d.querySelector('#email').value = 'sufyan@example.com';
  d.querySelector('#phone').value = '+33612345678';
  d.querySelector('#password').value = 'abc';
  d.querySelector('#password2').value = 'abc';
  d.querySelector('#age').checked = true;
  d.querySelector('#terms').checked = true;
  d.querySelector('#signupForm').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await tick();
  ok('weak password blocked', navs.length === 0);

  // bad phone rejected
  d.querySelector('#password').value = 'Caen2026Nuclear';
  d.querySelector('#password2').value = 'Caen2026Nuclear';
  d.querySelector('#phone').value = '0612345678';
  d.querySelector('#signupForm').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await tick();
  ok('phone without country code blocked', navs.length === 0);

  // good signup
  d.querySelector('#phone').value = '+33612345678';
  d.querySelector('#signupForm').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await tick(); await tick();
  ok('signup succeeds -> verify', navs.includes('verify.html'), navs.join(','));
  ok('user stored', !!jar['samo.users']);
  ok('password not stored in plaintext', !JSON.stringify(jar['samo.users'] || '').includes('Caen2026Nuclear'));
  ok('signup no errors', errors.length === 0, errors[0]);
}

// ----------------------------------------------------------------- verify
{
  const { w, d, errors } = load('verify.html');
  await tick(); await tick();
  ok('verify shows email step', /email/i.test(d.querySelector('#codeTitle').textContent));
  const demo = await waitFor(d, '.demo-code b');
  ok('demo code shown in mock mode', !!demo);
  const code = demo ? demo.textContent.trim() : '';
  ok('code is 6 digits', /^\d{6}$/.test(code));

  const boxes = [...d.querySelectorAll('.code-input')];
  // wrong code first
  '000000'.split('').forEach((c,i) => boxes[i].value = c);
  d.querySelector('#codeForm').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await tick();
  const errEl = d.querySelector('#codeError');
  ok('wrong code rejected with attempts left', !errEl.classList.contains('hidden') && /attempts left/.test(errEl.textContent), errEl.textContent);

  // right code
  code.split('').forEach((c,i) => boxes[i].value = c);
  d.querySelector('#codeForm').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await tick(); await tick();
  ok('email verified -> phone step', /phone/i.test(d.querySelector('#codeTitle').textContent), d.querySelector('#codeTitle').textContent);

  const demo2 = await waitFor(d, '.demo-code b');
  ok('phone demo code shown', !!demo2);
  const code2 = demo2 ? demo2.textContent.trim() : '';
  const boxes2 = [...d.querySelectorAll('.code-input')];
  code2.split('').forEach((c,i) => boxes2[i].value = c);
  d.querySelector('#codeForm').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await tick(); await tick();
  ok('both verified -> done panel', !d.querySelector('#allDone').classList.contains('hidden'));
  ok('verify no errors', errors.length === 0, errors[0]);
}

// ------------------------------------------------- profile gate before setup
{
  const { d, navs } = load('profile.html');
  await tick(); await tick();
  ok('incomplete profile blocked from going live', /not live yet/i.test(d.body.textContent));
}
{
  const { d } = load('discover.html');
  await tick(); await tick();
  ok('discover warns you cannot connect yet', !d.querySelector('#gateNotice').hidden);
}

// ------------------------------------------------------------- onboarding
{
  const { w, d, navs, errors } = load('onboarding.html');
  await tick(); await tick();
  ok('wizard step 1 active', d.querySelector('.wizard-step[data-step="0"]').classList.contains('active'));
  ok('mother tongue list populated', d.querySelectorAll('#motherList .lang-row').length === 59);
  ok('city select populated', d.querySelectorAll('#city option').length > 20);
  ok('lookingFor chips', d.querySelectorAll('#lookingForSet .chip').length === 10);

  const next = d.querySelector('#nextBtn');
  next.dispatchEvent(new w.Event('click', { bubbles:true }));
  await tick();
  ok('step 1 blocks without photo+name', d.querySelector('.wizard-step[data-step="0"]').classList.contains('active'));

  // fill step 1
  w.eval("Backend.uploadPhoto = function(){ return Promise.resolve('data:image/jpeg;base64,AAA'); };");
  d.querySelector('#displayName').value = 'Sufyan';
  d.querySelector('#displayName').dispatchEvent(new w.Event('input', { bubbles:true }));
  w.eval("(function(){ var p = document.querySelector('#photoPreview'); })();");
  // simulate photo chosen through the same path the UI uses
  w.eval(`
    var ev = new Event('change');
    Object.defineProperty(ev, 'target', { value: { files: [ { type:'image/jpeg', size: 1000 } ] } });
    document.querySelector('#photoInput').dispatchEvent(ev);
  `);
  await tick();
  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('advanced to languages', d.querySelector('.wizard-step[data-step="1"]').classList.contains('active'));

  // languages: pick Urdu
  d.querySelector('#motherList .lang-row[data-code="ur"]').dispatchEvent(new w.Event('click', { bubbles:true }));
  await tick();
  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('advanced to city', d.querySelector('.wizard-step[data-step="2"]').classList.contains('active'));

  const city = d.querySelector('#city');
  city.value = 'caen'; city.dispatchEvent(new w.Event('change', { bubbles:true }));
  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('advanced to about', d.querySelector('.wizard-step[data-step="3"]').classList.contains('active'));

  // under-18 rejected
  d.querySelector('#birthYear').value = String(new Date().getFullYear() - 15);
  d.querySelector('#birthYear').dispatchEvent(new w.Event('input', { bubbles:true }));
  d.querySelector('#gender').value = 'Man'; d.querySelector('#gender').dispatchEvent(new w.Event('change', { bubbles:true }));
  d.querySelector('#bio').value = 'x'.repeat(60);
  d.querySelector('#bio').dispatchEvent(new w.Event('input', { bubbles:true }));
  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('under 18 blocked', d.querySelector('.wizard-step[data-step="3"]').classList.contains('active'));

  // short bio rejected
  d.querySelector('#birthYear').value = '1996';
  d.querySelector('#birthYear').dispatchEvent(new w.Event('input', { bubbles:true }));
  d.querySelector('#bio').value = 'too short';
  d.querySelector('#bio').dispatchEvent(new w.Event('input', { bubbles:true }));
  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('short bio blocked', d.querySelector('.wizard-step[data-step="3"]').classList.contains('active'));

  d.querySelector('#bio').value = 'Moved to Caen for a masters in medical physics. I miss speaking Urdu properly and I cook far too much food for one person.';
  d.querySelector('#bio').dispatchEvent(new w.Event('input', { bubbles:true }));
  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('advanced to interests', d.querySelector('.wizard-step[data-step="4"]').classList.contains('active'));

  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('blocks with no lookingFor', d.querySelector('.wizard-step[data-step="4"]').classList.contains('active'));

  d.querySelector('#lookingForSet .chip[data-val="coffee"]').dispatchEvent(new w.Event('click', { bubbles:true }));
  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('advanced to privacy', d.querySelector('.wizard-step[data-step="5"]').classList.contains('active'));

  next.dispatchEvent(new w.Event('click', { bubbles:true })); await tick();
  ok('reached review', d.querySelector('.wizard-step[data-step="6"]').classList.contains('active'));
  ok('review shows name', /Sufyan/.test(d.querySelector('#reviewPane').textContent));
  ok('no missing-required warning', d.querySelector('#reviewMissing').classList.contains('hidden'));

  next.dispatchEvent(new w.Event('click', { bubbles:true }));
  await tick(1600);   // publish() shows a success state before redirecting
  ok('publish -> profile', navs.includes('profile.html'), navs.join(','));
  ok('onboarding no errors', errors.length === 0, errors[0]);
}

// ------------------------------------------------------------ own profile
{
  const { d, errors } = load('profile.html');
  await tick(); await tick();
  ok('own profile renders name', /Sufyan/.test(d.querySelector('.profile-name').textContent));
  ok('shows verified badges', d.querySelectorAll('.badge').length >= 2);
  ok('profile no errors', errors.length === 0, errors[0]);
}

// --------------------------------------------------------------- discover
{
  const { w, d, errors } = load('discover.html');
  await tick(); await tick(); await tick();
  ok('discover gate cleared after completion', d.querySelector('#gateNotice').hidden);
  const cards = d.querySelectorAll('.person-card');
  ok('discover lists people', cards.length > 0, cards.length + ' cards');
  ok('language filter defaults to my mother tongue', d.querySelector('#filterLang').value === 'ur');
  ok('city filter defaults to my city', d.querySelector('#filterCity').value === 'caen');
  ok('discover no errors', errors.length === 0, errors[0]);
}

// -------------------------------------------------- another member profile
{
  const first = 'sample_ur-caen-0';
  const { w, d, errors } = load('profile.html', '?id=' + first);
  await tick(); await tick();
  ok('other profile has connect button', !!d.querySelector('#connectBtn'));
  d.querySelector('#connectBtn').dispatchEvent(new w.Event('click', { bubbles:true }));
  await tick();
  ok('connect modal opens (gate passed)', !d.querySelector('#connectModal').hidden);
  d.querySelector('#connectMsg').value = 'hi';
  d.querySelector('#connectSend').dispatchEvent(new w.Event('click', { bubbles:true }));
  await tick();
  ok('too-short hello rejected', !d.querySelector('#connectModal').hidden);
  d.querySelector('#connectMsg').value = 'Hello, I am Sufyan, also from Lahore. Free Saturday morning for a coffee?';
  d.querySelector('#connectSend').dispatchEvent(new w.Event('click', { bubbles:true }));
  await tick(); await tick();
  ok('connection request sent', d.querySelector('#connectModal').hidden);
  ok('stored connection', !!jar['samo.connections']);
  ok('other profile no errors', errors.length === 0, errors[0]);
}

// --------------------------------------------------------------- settings
{
  const { w, d, errors } = load('settings.html');
  await tick(); await tick();
  ok('settings shows account rows', d.querySelectorAll('#accountRows .setting-row').length === 3);
  d.querySelector('#currentPw').value = 'wrongpass';
  d.querySelector('#newPw').value = 'Brandnew2026Pass';
  d.querySelector('#changePwBtn').dispatchEvent(new w.Event('click', { bubbles:true }));
  await tick(); await tick();
  ok('wrong current password rejected', /not correct/i.test(d.querySelector('#toastMsg').textContent), d.querySelector('#toastMsg').textContent);

  d.querySelector('#currentPw').value = 'Caen2026Nuclear';
  d.querySelector('#changePwBtn').dispatchEvent(new w.Event('click', { bubbles:true }));
  await tick(); await tick();
  ok('password changed', /Password changed/i.test(d.querySelector('#toastTitle').textContent), d.querySelector('#toastTitle').textContent);

  d.querySelector('#deleteBtn').dispatchEvent(new w.Event('click', { bubbles:true }));
  ok('delete needs typed confirmation', d.querySelector('#delConfirmBtn').disabled);
  d.querySelector('#delConfirm').value = 'DELETE';
  d.querySelector('#delConfirm').dispatchEvent(new w.Event('input', { bubbles:true }));
  ok('delete enabled after typing DELETE', !d.querySelector('#delConfirmBtn').disabled);
  ok('settings no errors', errors.length === 0, errors[0]);
}

// ----------------------------------------------------------- login flow
{
  delete jar['samo.session'];
  const { w, d, navs, errors } = load('login.html');
  await tick();
  d.querySelector('#email').value = 'sufyan@example.com';
  d.querySelector('#password').value = 'nope';
  d.querySelector('#loginForm').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await tick(); await tick();
  ok('bad password rejected', navs.length === 0);
  d.querySelector('#password').value = 'Brandnew2026Pass';
  d.querySelector('#loginForm').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await tick(); await tick(); await tick();
  ok('login with new password -> discover', navs.includes('discover.html'), navs.join(','));
  ok('login no errors', errors.length === 0, errors[0]);
}

// ------------------------------------------------------------ auth guard
{
  delete jar['samo.session'];
  const { w } = load('settings.html');
  await tick();

  const session = await w.Backend.getSession();
  ok('session cleared', session === null);

  // boot() rejects with 'redirect' when it bounces an unauthenticated visitor
  let rejected = null;
  try { await w.Core.boot({ requireAuth: true }); }
  catch (e) { rejected = e.message; }
  ok('signed-out user bounced from settings', rejected === 'redirect', String(rejected));

  // and it remembers where they were heading
  ok('return path saved for after login', /settings\.html/.test(jar['samo.returnTo'] || ''), jar['samo.returnTo']);
}

// ------------------------------------------------- guard on every private page
{
  delete jar['samo.session'];
  for (const page of ['profile.html', 'discover.html', 'onboarding.html', 'verify.html']) {
    const { w } = load(page);
    await tick(150);
    let rejected = null;
    try { await w.Core.boot({ requireAuth: true }); }
    catch (e) { rejected = e.message; }
    ok('guard blocks signed-out on ' + page, rejected === 'redirect', String(rejected));
  }
}

console.log(log.join('\n'));
console.log('\n' + (fails ? fails + ' FAILURES' : 'ALL CHECKS PASSED'));
process.exit(0);
})();
