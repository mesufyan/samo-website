/* ==========================================================================
   SAMO — Core
   Shared helpers, storage, chrome (header/footer), and the profile schema.
   Loaded on every page.
   ========================================================================== */

window.Core = (function () {
  'use strict';

  var CFG = window.SAMO_CONFIG || {};

  /* ------------------------------------------------------------ selectors */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* -------------------------------------------------------------- storage */
  var mem = {};
  var storage = {
    get: function (k) {
      try { var v = localStorage.getItem(k); return v === null ? (mem[k] || null) : v; }
      catch (e) { return mem[k] || null; }
    },
    set: function (k, v) {
      mem[k] = v;
      try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
    },
    remove: function (k) {
      delete mem[k];
      try { localStorage.removeItem(k); } catch (e) {}
    },
    json: function (k, fallback) {
      try { return JSON.parse(storage.get(k)) || fallback; } catch (e) { return fallback; }
    },
    setJson: function (k, v) { return storage.set(k, JSON.stringify(v)); }
  };

  /* ---------------------------------------------------------------- paths */
  /* Works whether the site sits at a domain root or a /repo-name/ subpath. */
  function base() {
    var p = location.pathname;
    var i = p.lastIndexOf('/');
    return p.slice(0, i + 1);
  }
  function url(page) { return base() + page; }
  function go(page) { location.href = url(page); }

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  /* ----------------------------------------------------------------- misc */
  function uid(prefix) {
    var r = '';
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(9);
      crypto.getRandomValues(a);
      for (var i = 0; i < a.length; i++) r += a[i].toString(36);
    } else {
      r = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    return (prefix || 'id') + '_' + r.slice(0, 14);
  }

  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function age(birthYear) {
    return new Date().getFullYear() - Number(birthYear);
  }

  function timeAgo(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 604800) return Math.floor(s / 86400) + ' d ago';
    return new Date(ts).toLocaleDateString();
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 250);
    };
  }

  /* ---------------------------------------------------------------- toast */
  function toast(title, msg, kind) {
    var host = $('#toast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast';
      host.className = 'toast';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      host.innerHTML =
        '<span class="toast-icon" id="toastIcon"></span>' +
        '<div class="min-w-0"><p class="toast-title" id="toastTitle"></p>' +
        '<p class="toast-msg" id="toastMsg"></p></div>' +
        '<button class="toast-close" id="toastClose" aria-label="Dismiss">&times;</button>';
      document.body.appendChild(host);
      $('#toastClose').addEventListener('click', function () { host.classList.remove('show'); });
    }
    var icons = {
      ok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      warn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    };
    kind = kind || 'ok';
    $('#toastIcon').innerHTML = icons[kind] || icons.ok;
    $('#toastIcon').className = 'toast-icon toast-icon--' + kind;
    $('#toastTitle').textContent = title;
    $('#toastMsg').textContent = msg || '';
    host.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { host.classList.remove('show'); }, 5500);
  }

  /* --------------------------------------------------------------- chrome */
  var NAV_PUBLIC = [
    { href: 'index.html#features', label: 'How it works' },
    { href: 'index.html#languages', label: 'Languages' },
    { href: 'index.html#pricing', label: 'Pricing' },
    { href: 'safety.html', label: 'Safety' }
  ];
  var NAV_AUTHED = [
    { href: 'discover.html', label: 'Discover' },
    { href: 'profile.html', label: 'My profile' },
    { href: 'settings.html', label: 'Settings' }
  ];

  var LOGO =
    '<svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
    '<rect width="32" height="32" rx="8" fill="#E07A5F"/>' +
    '<path d="M16 8L22 16H10L16 8Z" fill="#fff"/>' +
    '<circle cx="16" cy="20" r="3" fill="#fff"/></svg>';

  function renderHeader(session) {
    var host = $('#siteHeader');
    if (!host) return;
    var authed = !!session;
    var links = authed ? NAV_AUTHED : NAV_PUBLIC;
    var here = location.pathname.split('/').pop() || 'index.html';

    var right = authed
      ? '<a href="' + url('profile.html') + '" class="avatar avatar--sm" title="My profile">' +
        (session.photo
          ? '<img src="' + esc(session.photo) + '" alt="">'
          : '<span>' + esc(initials(session.displayName || session.email)) + '</span>') +
        '</a>' +
        '<button class="btn btn-ghost btn-sm" id="navSignOut">Sign out</button>'
      : '<a href="' + url('login.html') + '" class="btn btn-ghost btn-sm">Sign in</a>' +
        '<a href="' + url('signup.html') + '" class="btn btn-primary btn-sm">Create account</a>';

    host.innerHTML =
      '<nav class="site-nav" id="siteNav" aria-label="Main">' +
      '<div class="wrap nav-inner">' +
      '<a href="' + url('index.html') + '" class="nav-brand" aria-label="SAMO home">' + LOGO +
      '<span>SAMO</span></a>' +
      '<div class="nav-links">' +
      links.map(function (l) {
        var active = l.href.split('#')[0] === here ? ' aria-current="page"' : '';
        return '<a href="' + url(l.href) + '"' + active + '>' + esc(l.label) + '</a>';
      }).join('') +
      '</div>' +
      '<div class="nav-actions">' + right + '</div>' +
      '<button class="nav-burger" id="navBurger" aria-label="Menu" aria-expanded="false">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
      '</button>' +
      '</div>' +
      '<div class="nav-drawer" id="navDrawer" hidden>' +
      links.map(function (l) { return '<a href="' + url(l.href) + '">' + esc(l.label) + '</a>'; }).join('') +
      (authed
        ? '<button class="btn btn-ghost w-full" id="navSignOutM">Sign out</button>'
        : '<a href="' + url('login.html') + '" class="btn btn-ghost">Sign in</a>' +
          '<a href="' + url('signup.html') + '" class="btn btn-primary">Create account</a>') +
      '</div>' +
      '</nav>';

    var burger = $('#navBurger'), drawer = $('#navDrawer');
    burger.addEventListener('click', function () {
      var open = drawer.hidden;
      drawer.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
    });

    ['#navSignOut', '#navSignOutM'].forEach(function (sel) {
      var b = $(sel);
      if (b) b.addEventListener('click', function () {
        window.Backend.signOut().then(function () { go('index.html'); });
      });
    });

    var nav = $('#siteNav');
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 12); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    var host = $('#siteFooter');
    if (!host) return;
    host.innerHTML =
      '<footer class="site-footer"><div class="wrap">' +
      '<div class="footer-grid">' +
      '<div><div class="nav-brand nav-brand--footer">' + LOGO + '<span>SAMO</span></div>' +
      '<p class="footer-blurb">Find your language. Find your people.</p></div>' +
      '<div><h3>Product</h3><ul>' +
      '<li><a href="' + url('index.html#features') + '">How it works</a></li>' +
      '<li><a href="' + url('index.html#languages') + '">Languages</a></li>' +
      '<li><a href="' + url('index.html#pricing') + '">Pricing</a></li>' +
      '<li><a href="' + url('discover.html') + '">Discover</a></li>' +
      '</ul></div>' +
      '<div><h3>Trust</h3><ul>' +
      '<li><a href="' + url('safety.html') + '">Safety</a></li>' +
      '<li><a href="' + url('privacy.html') + '">Privacy</a></li>' +
      '<li><a href="' + url('settings.html') + '">Your data</a></li>' +
      '</ul></div>' +
      '</div>' +
      '<div class="footer-base"><p>© <span>' + new Date().getFullYear() + '</span> SAMO. ' +
      (CFG.BACKEND === 'mock' ? 'Prototype build — accounts are stored in this browser only.' : '') +
      '</p></div>' +
      '</div></footer>';
  }

  /* --------------------------------------------------------- demo notice */
  function renderDemoBanner() {
    if (CFG.BACKEND !== 'mock') return;
    if (storage.get('samo.demoNoticeDismissed') === '1') return;
    var bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.innerHTML =
      '<span><strong>Demo mode.</strong> Accounts, codes and photos stay in this browser and are not sent anywhere. ' +
      'Verification is simulated, so it is not real security. ' +
      '<a href="' + url('SETUP-BACKEND.md') + '">How to make it real</a></span>' +
      '<button aria-label="Dismiss">&times;</button>';
    document.body.prepend(bar);
    document.body.classList.add('has-demo-bar');
    bar.querySelector('button').addEventListener('click', function () {
      storage.set('samo.demoNoticeDismissed', '1');
      bar.remove();
      document.body.classList.remove('has-demo-bar');
    });
  }

  /* ================================================== PROFILE SCHEMA ==== */

  /* Fields marked required must be filled before a profile can go live and
     before the account can send a connection request. */
  var PROFILE_FIELDS = [
    { key: 'photo',         label: 'Profile photo',      required: true,  weight: 15 },
    { key: 'displayName',   label: 'First name',         required: true,  weight: 8 },
    { key: 'birthYear',     label: 'Year of birth',      required: true,  weight: 6 },
    { key: 'gender',        label: 'Gender',             required: true,  weight: 4 },
    { key: 'motherTongues', label: 'Mother tongue',      required: true,  weight: 15 },
    { key: 'city',          label: 'City',               required: true,  weight: 10 },
    { key: 'bio',           label: 'About you',          required: true,  weight: 15 },
    { key: 'lookingFor',    label: 'What you are here for', required: true, weight: 10 },
    { key: 'alsoSpeaks',    label: 'Other languages',    required: false, weight: 4 },
    { key: 'fromCountry',   label: 'Where you are from',  required: false, weight: 3 },
    { key: 'occupation',    label: 'What you do',        required: false, weight: 3 },
    { key: 'interests',     label: 'Interests',          required: false, weight: 4 },
    { key: 'availability',  label: 'When you are usually free', required: false, weight: 3 }
  ];

  var LOOKING_FOR = [
    { id: 'coffee',   label: 'Coffee and conversation', icon: '☕' },
    { id: 'language', label: 'Language exchange',       icon: '🔤' },
    { id: 'family',   label: 'Friends for my family',   icon: '👨‍👩‍👧' },
    { id: 'sport',    label: 'Sport and walking',       icon: '⚽' },
    { id: 'food',     label: 'Cooking and eating together', icon: '🍲' },
    { id: 'faith',    label: 'Faith community',         icon: '🕌' },
    { id: 'work',     label: 'Professional networking',  icon: '💼' },
    { id: 'newcomer', label: 'Help settling in',        icon: '🧭' },
    { id: 'study',    label: 'Study partners',          icon: '📚' },
    { id: 'events',   label: 'Local events',            icon: '🎉' }
  ];

  var INTERESTS = [
    'Cricket', 'Football', 'Hiking', 'Cooking', 'Poetry', 'Music', 'Films',
    'Photography', 'Reading', 'Gym', 'Cycling', 'Board games', 'Gardening',
    'Volunteering', 'Tech', 'Art', 'Travel', 'Chess', 'Running', 'Podcasts',
    'Calligraphy', 'Fishing', 'Dancing', 'Coffee', 'Tea', 'Startups'
  ];

  var AVAILABILITY = [
    'Weekday mornings', 'Weekday lunchtimes', 'Weekday evenings',
    'Saturday', 'Sunday', 'Late evenings', 'Varies with my shifts'
  ];

  var GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

  var VISIBILITY = [
    { id: 'all',       label: 'Everyone on SAMO' },
    { id: 'same',      label: 'Only people of my gender' },
    { id: 'verified',  label: 'Only fully verified members' },
    { id: 'hidden',    label: 'Nobody — hide my profile' }
  ];

  function isFilled(profile, key) {
    var v = profile ? profile[key] : null;
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (key === 'bio') return String(v).trim().length >= 40;
    return String(v).trim().length > 0;
  }

  function missingRequired(profile) {
    return PROFILE_FIELDS.filter(function (f) {
      return f.required && !isFilled(profile, f.key);
    });
  }

  function completeness(profile) {
    var total = 0, got = 0;
    PROFILE_FIELDS.forEach(function (f) {
      total += f.weight;
      if (isFilled(profile, f.key)) got += f.weight;
    });
    return Math.round((got / total) * 100);
  }

  /** A profile can connect only when required fields are done and identity
   *  checks have passed. */
  function canConnect(user, profile) {
    if (!user || !profile) return { ok: false, reason: 'Sign in first.' };
    if (!user.emailVerified) return { ok: false, reason: 'Verify your email address.' };
    if (CFG.REQUIRE_PHONE && !user.phoneVerified) return { ok: false, reason: 'Verify your phone number.' };
    var missing = missingRequired(profile);
    if (missing.length) {
      return {
        ok: false,
        reason: 'Finish your profile first: ' + missing.map(function (m) { return m.label.toLowerCase(); }).join(', ') + '.'
      };
    }
    return { ok: true };
  }

  /* ---------------------------------------------------------- page setup */
  /**
   * boot({ requireAuth, requireProfile })
   * Renders chrome and enforces access rules. Resolves with { user, profile }.
   */
  function boot(opts) {
    opts = opts || {};
    return window.Backend.getSession().then(function (session) {
      renderHeader(session);
      renderFooter();
      renderDemoBanner();

      if (opts.requireAuth && !session) {
        storage.set('samo.returnTo', location.pathname + location.search);
        go('login.html');
        return Promise.reject(new Error('redirect'));
      }

      if (!session) return { user: null, profile: null };

      return window.Backend.getProfile(session.userId).then(function (profile) {
        if (opts.requireVerified && !session.emailVerified) { go('verify.html'); return Promise.reject(new Error('redirect')); }
        if (opts.requireProfile && missingRequired(profile).length) { go('onboarding.html'); return Promise.reject(new Error('redirect')); }
        return { user: session, profile: profile };
      });
    });
  }

  return {
    CFG: CFG, $: $, $$: $$, esc: esc, storage: storage,
    base: base, url: url, go: go, param: param,
    uid: uid, initials: initials, age: age, timeAgo: timeAgo, debounce: debounce,
    toast: toast, boot: boot,
    renderHeader: renderHeader, renderFooter: renderFooter,
    PROFILE_FIELDS: PROFILE_FIELDS, LOOKING_FOR: LOOKING_FOR, INTERESTS: INTERESTS,
    AVAILABILITY: AVAILABILITY, GENDERS: GENDERS, VISIBILITY: VISIBILITY,
    isFilled: isFilled, missingRequired: missingRequired,
    completeness: completeness, canConnect: canConnect
  };
})();
