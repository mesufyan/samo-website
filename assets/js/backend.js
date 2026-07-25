/* ==========================================================================
   SAMO — Backend adapter

   One interface, two implementations.

   MockBackend      Browser-only. For demos. Codes are shown on screen.
   SupabaseBackend  Real accounts, real emailed codes, real database.

   Switch with SAMO_CONFIG.BACKEND in config.js. Page code never knows which
   one it is talking to, so nothing above this file changes when you swap.
   ========================================================================== */

window.Backend = (function () {
  'use strict';

  var CFG = window.SAMO_CONFIG || {};

  /* ============================================================= helpers */

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fail(msg) { return Promise.reject(new Error(msg)); }

  /** SHA-256 with a per-user salt. In mock mode this stops a casual reader of
      localStorage seeing plaintext passwords. It is not a substitute for
      server-side hashing with a slow KDF, which is what Supabase does. */
  function hash(password, salt) {
    var data = new TextEncoder().encode(salt + '::' + password);
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest('SHA-256', data).then(function (buf) {
        return Array.from(new Uint8Array(buf))
          .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      });
    }
    // Non-secure context fallback. Weak by design; mock mode only.
    var h = 5381;
    for (var i = 0; i < data.length; i++) h = ((h << 5) + h + data[i]) >>> 0;
    return Promise.resolve('weak_' + h.toString(16));
  }

  function randomCode() {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return String(a[0] % 1000000).padStart(6, '0');
    }
    return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  }

  /* -------------------------------------------------------- validation */

  var Validate = {
    email: function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
    },

    /** E.164-ish. Accepts +country then 6 to 14 digits. */
    phone: function (v) {
      var cleaned = String(v || '').replace(/[\s()\-.]/g, '');
      return /^\+[1-9]\d{6,14}$/.test(cleaned);
    },

    normalisePhone: function (v) {
      return String(v || '').replace(/[\s()\-.]/g, '');
    },

    /** Returns { score 0-4, label, problems[] }. */
    password: function (v) {
      v = String(v || '');
      var problems = [];
      if (v.length < 10) problems.push('at least 10 characters');
      if (!/[a-z]/.test(v)) problems.push('a lowercase letter');
      if (!/[A-Z]/.test(v)) problems.push('a capital letter');
      if (!/\d/.test(v)) problems.push('a number');

      var common = ['password', '12345678', 'qwerty', 'iloveyou', 'admin123',
        'welcome1', 'letmein', 'samo1234', '11111111', 'abc12345'];
      if (common.some(function (c) { return v.toLowerCase().indexOf(c) !== -1; })) {
        problems.push('something less guessable');
      }
      if (/^(.)\1+$/.test(v)) problems.push('more than one repeated character');

      var score = 0;
      if (v.length >= 10) score++;
      if (v.length >= 14) score++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
      if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score++;
      if (problems.length) score = Math.min(score, 1);

      var labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
      return { score: score, label: labels[score], problems: problems, ok: problems.length === 0 };
    },

    birthYear: function (y) {
      var n = Number(y);
      var now = new Date().getFullYear();
      if (!n || n < 1900 || n > now) return { ok: false, reason: 'Enter a four digit year.' };
      if (now - n < (CFG.MIN_AGE || 18)) {
        return { ok: false, reason: 'You must be at least ' + (CFG.MIN_AGE || 18) + ' to use SAMO.' };
      }
      if (now - n > 110) return { ok: false, reason: 'Check the year of birth.' };
      return { ok: true };
    }
  };

  /* ==================================================== rate limiting ==== */
  /* Real limits belong on a server. This stops accidental hammering and
     shows the user the right behaviour in the demo. */

  var Limiter = {
    key: function (action, id) { return 'samo.rl.' + action + '.' + id; },

    check: function (action, id, max, windowMs) {
      var rec = Core.storage.json(this.key(action, id), { n: 0, since: Date.now() });
      if (Date.now() - rec.since > windowMs) rec = { n: 0, since: Date.now() };
      if (rec.n >= max) {
        var wait = Math.ceil((windowMs - (Date.now() - rec.since)) / 1000);
        return { ok: false, retryIn: wait };
      }
      return { ok: true, remaining: max - rec.n };
    },

    hit: function (action, id, windowMs) {
      var rec = Core.storage.json(this.key(action, id), { n: 0, since: Date.now() });
      if (Date.now() - rec.since > windowMs) rec = { n: 0, since: Date.now() };
      rec.n++;
      Core.storage.setJson(this.key(action, id), rec);
    },

    reset: function (action, id) { Core.storage.remove(this.key(action, id)); }
  };

  /* ====================================================== MOCK BACKEND ==== */

  var Mock = {
    name: 'mock',

    _users: function () { return Core.storage.json('samo.users', {}); },
    _saveUsers: function (u) { Core.storage.setJson('samo.users', u); },
    _profiles: function () { return Core.storage.json('samo.profiles', {}); },
    _saveProfiles: function (p) { Core.storage.setJson('samo.profiles', p); },

    _findByEmail: function (email) {
      var users = this._users();
      var target = String(email).trim().toLowerCase();
      for (var id in users) if (users[id].email === target) return users[id];
      return null;
    },

    _findByPhone: function (phone) {
      var users = this._users();
      var target = Validate.normalisePhone(phone);
      for (var id in users) if (users[id].phone === target) return users[id];
      return null;
    },

    /* ------------------------------------------------------------ sign up */
    signUp: function (input) {
      var self = this;
      var email = String(input.email || '').trim().toLowerCase();
      var phone = Validate.normalisePhone(input.phone);

      if (!Validate.email(email)) return fail('That email address does not look right.');
      if (CFG.REQUIRE_PHONE && !Validate.phone(phone)) {
        return fail('Enter your phone number with the country code, for example +33 6 12 34 56 78.');
      }
      var pw = Validate.password(input.password);
      if (!pw.ok) return fail('Your password needs ' + pw.problems.join(', ') + '.');
      if (!input.acceptedTerms) return fail('Please accept the terms and the privacy notice.');

      if (this._findByEmail(email)) return fail('An account already uses that email address. Try signing in.');
      if (phone && this._findByPhone(phone)) return fail('An account already uses that phone number.');

      var salt = Core.uid('salt');
      return hash(input.password, salt).then(function (pwHash) {
        var users = self._users();
        var id = Core.uid('usr');
        users[id] = {
          userId: id,
          email: email,
          phone: phone || '',
          salt: salt,
          pwHash: pwHash,
          emailVerified: false,
          phoneVerified: false,
          createdAt: Date.now(),
          role: 'member',
          status: 'active'
        };
        self._saveUsers(users);

        var profiles = self._profiles();
        profiles[id] = {
          userId: id,
          displayName: '',
          visibility: 'all',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        self._saveProfiles(profiles);

        self._setSession(id);
        return { userId: id };
      });
    },

    /* ------------------------------------------------------ verification */
    sendCode: function (channel) {
      var s = this._rawSession();
      if (!s) return fail('Sign in first.');
      var users = this._users();
      var user = users[s.userId];
      if (!user) return fail('Account not found.');

      var limit = Limiter.check('send.' + channel, s.userId, 5, 15 * 60 * 1000);
      if (!limit.ok) {
        return fail('Too many codes requested. Try again in ' + Math.ceil(limit.retryIn / 60) + ' minutes.');
      }
      Limiter.hit('send.' + channel, s.userId, 15 * 60 * 1000);

      var code = randomCode();
      var codes = Core.storage.json('samo.codes', {});
      codes[s.userId + ':' + channel] = {
        code: code,
        expires: Date.now() + 10 * 60 * 1000,
        attempts: 0
      };
      Core.storage.setJson('samo.codes', codes);

      return sleep(600).then(function () {
        return {
          sent: true,
          to: channel === 'email' ? user.email : user.phone,
          /* Returned ONLY because there is no server to send it.
             The real backend never returns the code. */
          demoCode: code
        };
      });
    },

    verifyCode: function (channel, code) {
      var self = this;
      var s = this._rawSession();
      if (!s) return fail('Sign in first.');

      var codes = Core.storage.json('samo.codes', {});
      var key = s.userId + ':' + channel;
      var rec = codes[key];

      if (!rec) return fail('Request a code first.');
      if (Date.now() > rec.expires) { delete codes[key]; Core.storage.setJson('samo.codes', codes); return fail('That code has expired. Request a new one.'); }
      if (rec.attempts >= 5) return fail('Too many wrong attempts. Request a new code.');

      if (String(code).trim() !== rec.code) {
        rec.attempts++;
        Core.storage.setJson('samo.codes', codes);
        return fail('That code is not right. ' + (5 - rec.attempts) + ' attempts left.');
      }

      delete codes[key];
      Core.storage.setJson('samo.codes', codes);

      var users = self._users();
      users[s.userId][channel === 'email' ? 'emailVerified' : 'phoneVerified'] = true;
      self._saveUsers(users);
      self._setSession(s.userId);
      Limiter.reset('send.' + channel, s.userId);

      return sleep(300).then(function () { return { verified: true }; });
    },

    /* ------------------------------------------------------------ sign in */
    signIn: function (input) {
      var self = this;
      var email = String(input.email || '').trim().toLowerCase();

      var limit = Limiter.check('signin', email, 8, 15 * 60 * 1000);
      if (!limit.ok) {
        return fail('Too many sign in attempts. Try again in ' + Math.ceil(limit.retryIn / 60) + ' minutes.');
      }

      var user = this._findByEmail(email);
      /* Same message and same delay whether or not the account exists, so the
         form cannot be used to find out who is registered. */
      return sleep(500).then(function () {
        if (!user) {
          Limiter.hit('signin', email, 15 * 60 * 1000);
          return fail('Email or password is not correct.');
        }
        if (user.status === 'deleted') {
          return fail('That account has been deleted.');
        }
        return hash(input.password, user.salt).then(function (h) {
          if (h !== user.pwHash) {
            Limiter.hit('signin', email, 15 * 60 * 1000);
            return fail('Email or password is not correct.');
          }
          Limiter.reset('signin', email);
          self._setSession(user.userId);
          return { userId: user.userId };
        });
      });
    },

    signOut: function () {
      Core.storage.remove('samo.session');
      return Promise.resolve();
    },

    /* ----------------------------------------------------------- session */
    _rawSession: function () {
      var s = Core.storage.json('samo.session', null);
      if (!s) return null;
      if (s.expires && Date.now() > s.expires) { Core.storage.remove('samo.session'); return null; }
      return s;
    },

    _setSession: function (userId) {
      var days = CFG.SESSION_DAYS || 30;
      Core.storage.setJson('samo.session', {
        userId: userId,
        expires: Date.now() + days * 86400000
      });
    },

    getSession: function () {
      var s = this._rawSession();
      if (!s) return Promise.resolve(null);
      var user = this._users()[s.userId];
      if (!user || user.status === 'deleted') { Core.storage.remove('samo.session'); return Promise.resolve(null); }
      var profile = this._profiles()[s.userId] || {};
      return Promise.resolve({
        userId: user.userId,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        displayName: profile.displayName || '',
        photo: profile.photo || ''
      });
    },

    /* ---------------------------------------------------------- profiles */
    getProfile: function (userId) {
      return Promise.resolve(this._profiles()[userId] || null);
    },

    saveProfile: function (userId, patch) {
      var profiles = this._profiles();
      var current = profiles[userId] || { userId: userId, createdAt: Date.now() };
      for (var k in patch) current[k] = patch[k];
      current.updatedAt = Date.now();
      profiles[userId] = current;
      this._saveProfiles(profiles);
      return sleep(200).then(function () { return current; });
    },

    /** Real members plus generated sample people so the page is not empty. */
    listProfiles: function (query) {
      var profiles = this._profiles();
      var users = this._users();
      var out = [];

      for (var id in profiles) {
        var p = profiles[id];
        var u = users[id];
        if (!u || u.status === 'deleted') continue;
        if (p.visibility === 'hidden') continue;
        if (Core.missingRequired(p).length) continue;
        out.push(Object.assign({}, p, {
          real: true,
          emailVerified: u.emailVerified,
          phoneVerified: u.phoneVerified
        }));
      }

      var samples = this._samples(query);
      var combined = out.concat(samples);

      if (query && query.language) {
        combined = combined.filter(function (p) {
          return (p.motherTongues || []).indexOf(query.language) !== -1 ||
                 (p.alsoSpeaks || []).indexOf(query.language) !== -1;
        });
      }
      if (query && query.city) {
        combined = combined.filter(function (p) { return p.city === query.city; });
      }
      if (query && query.lookingFor) {
        combined = combined.filter(function (p) {
          return (p.lookingFor || []).indexOf(query.lookingFor) !== -1;
        });
      }

      combined.sort(function (a, b) { return (a.metres || 9999) - (b.metres || 9999); });
      return sleep(250).then(function () { return combined; });
    },

    /** Turns the deterministic demo generator into full profile records. */
    _samples: function (query) {
      var D = window.SAMO;
      if (!D) return [];
      var lang = (query && query.language) || 'ur';
      var city = (query && query.city) || 'berlin';
      var people = D.getMatches(lang, city, 12);

      return people.map(function (p, i) {
        var rnd = (i * 37) % Core.INTERESTS.length;
        return {
          userId: 'sample_' + p.id,
          sample: true,
          displayName: p.name,
          photo: '',
          birthYear: new Date().getFullYear() - (22 + ((i * 7) % 34)),
          gender: Core.GENDERS[i % 3],
          motherTongues: [lang],
          alsoSpeaks: i % 2 ? ['en'] : [],
          city: city,
          fromCountry: '',
          occupation: p.role,
          bio: p.role + ', ' + p.tenure + '. Happy to meet other ' +
               D.getLanguage(lang).label.replace(/^\S+\s/, '') + ' speakers nearby for a chat.',
          lookingFor: [Core.LOOKING_FOR[i % Core.LOOKING_FOR.length].id,
                       Core.LOOKING_FOR[(i + 3) % Core.LOOKING_FOR.length].id],
          interests: [Core.INTERESTS[rnd], Core.INTERESTS[(rnd + 5) % Core.INTERESTS.length],
                      Core.INTERESTS[(rnd + 11) % Core.INTERESTS.length]],
          availability: [Core.AVAILABILITY[i % Core.AVAILABILITY.length]],
          visibility: 'all',
          emailVerified: true,
          phoneVerified: p.verified,
          coffeeMode: p.coffee,
          metres: p.metres,
          dist: p.dist,
          updatedAt: Date.now() - i * 3600000
        };
      });
    },

    getProfileById: function (id) {
      if (id && id.indexOf('sample_') === 0) {
        var all = this._samples({});
        var langs = window.SAMO ? window.SAMO.LANGUAGES : [];
        for (var li = 0; li < langs.length; li++) {
          var s = this._samples({ language: langs[li].code, city: (id.split('-')[1] || 'berlin') });
          for (var i = 0; i < s.length; i++) if (s[i].userId === id) return Promise.resolve(s[i]);
        }
        return Promise.resolve(all[0] || null);
      }
      return this.getProfile(id);
    },

    /* ------------------------------------------------------------ photos */
    uploadPhoto: function (file) {
      if (!file) return fail('Choose an image first.');
      if (!/^image\//.test(file.type)) return fail('That file is not an image.');
      if (file.size > 6 * 1024 * 1024) return fail('That image is larger than 6 MB. Try a smaller one.');

      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('That image could not be read.')); };
        reader.onload = function () {
          /* Downscale to 512 px so localStorage does not fill up. */
          var img = new Image();
          img.onerror = function () { reject(new Error('That image could not be opened.')); };
          img.onload = function () {
            var max = 512;
            var scale = Math.min(1, max / Math.max(img.width, img.height));
            var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
            var canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    },

    /* ------------------------------------------------------- connections */
    connect: function (fromId, toId, message) {
      var reqs = Core.storage.json('samo.connections', []);
      var exists = reqs.some(function (r) { return r.from === fromId && r.to === toId; });
      if (exists) return fail('You have already sent this person a request.');
      reqs.push({ id: Core.uid('req'), from: fromId, to: toId, message: message || '', status: 'pending', at: Date.now() });
      Core.storage.setJson('samo.connections', reqs);
      return sleep(300).then(function () { return { sent: true }; });
    },

    listConnections: function (userId) {
      var reqs = Core.storage.json('samo.connections', []);
      return Promise.resolve(reqs.filter(function (r) { return r.from === userId || r.to === userId; }));
    },

    report: function (fromId, aboutId, reason, detail) {
      var reports = Core.storage.json('samo.reports', []);
      reports.push({ id: Core.uid('rep'), from: fromId, about: aboutId, reason: reason, detail: detail, at: Date.now() });
      Core.storage.setJson('samo.reports', reports);
      return sleep(300).then(function () { return { filed: true }; });
    },

    block: function (userId, blockedId) {
      var blocks = Core.storage.json('samo.blocks.' + userId, []);
      if (blocks.indexOf(blockedId) === -1) blocks.push(blockedId);
      Core.storage.setJson('samo.blocks.' + userId, blocks);
      return Promise.resolve({ blocked: true });
    },

    /* ---------------------------------------------------------- account */
    changePassword: function (userId, currentPw, newPw) {
      var self = this;
      var users = this._users();
      var user = users[userId];
      if (!user) return fail('Account not found.');

      var check = Validate.password(newPw);
      if (!check.ok) return fail('Your new password needs ' + check.problems.join(', ') + '.');

      return hash(currentPw, user.salt).then(function (h) {
        if (h !== user.pwHash) return fail('Your current password is not correct.');
        var salt = Core.uid('salt');
        return hash(newPw, salt).then(function (nh) {
          users[userId].salt = salt;
          users[userId].pwHash = nh;
          self._saveUsers(users);
          return { changed: true };
        });
      });
    },

    exportData: function (userId) {
      var users = this._users();
      var user = Object.assign({}, users[userId]);
      delete user.pwHash; delete user.salt;
      return Promise.resolve({
        exportedAt: new Date().toISOString(),
        account: user,
        profile: this._profiles()[userId] || null,
        connections: Core.storage.json('samo.connections', []).filter(function (r) {
          return r.from === userId || r.to === userId;
        })
      });
    },

    deleteAccount: function (userId) {
      var users = this._users();
      var profiles = this._profiles();
      delete profiles[userId];
      if (users[userId]) { users[userId].status = 'deleted'; users[userId].email = 'deleted_' + userId; users[userId].phone = ''; }
      this._saveUsers(users);
      this._saveProfiles(profiles);
      Core.storage.remove('samo.session');
      Core.storage.remove('samo.blocks.' + userId);
      return sleep(400).then(function () { return { deleted: true }; });
    }
  };

  /* ================================================== SUPABASE BACKEND ==== */
  /* Loads the SDK from a CDN only when this backend is selected.
     Table definitions and row-level security policies: supabase/schema.sql */

  var Supabase = {
    name: 'supabase',
    _client: null,

    _sb: function () {
      if (this._client) return Promise.resolve(this._client);
      var self = this;
      return new Promise(function (resolve, reject) {
        if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
          reject(new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY in assets/js/config.js.'));
          return;
        }
        var start = function () {
          self._client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
          resolve(self._client);
        };
        if (window.supabase) { start(); return; }
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        s.onload = start;
        s.onerror = function () { reject(new Error('The Supabase library could not be loaded.')); };
        document.head.appendChild(s);
      });
    },

    signUp: function (input) {
      var pw = Validate.password(input.password);
      if (!pw.ok) return fail('Your password needs ' + pw.problems.join(', ') + '.');
      if (!Validate.email(input.email)) return fail('That email address does not look right.');
      if (!input.acceptedTerms) return fail('Please accept the terms and the privacy notice.');

      return this._sb().then(function (sb) {
        return sb.auth.signUp({
          email: String(input.email).trim().toLowerCase(),
          password: input.password,
          options: { data: { phone: Validate.normalisePhone(input.phone) } }
        }).then(function (res) {
          if (res.error) throw new Error(res.error.message);
          return { userId: res.data.user.id };
        });
      });
    },

    sendCode: function (channel) {
      return this._sb().then(function (sb) {
        return sb.auth.getUser().then(function (u) {
          if (u.error || !u.data.user) throw new Error('Sign in first.');
          var user = u.data.user;
          var p = channel === 'email'
            ? sb.auth.resend({ type: 'signup', email: user.email })
            : sb.auth.signInWithOtp({ phone: user.user_metadata.phone });
          return p.then(function (res) {
            if (res.error) throw new Error(res.error.message);
            /* No demoCode. The real code goes out by email or SMS. */
            return { sent: true, to: channel === 'email' ? user.email : user.user_metadata.phone };
          });
        });
      });
    },

    verifyCode: function (channel, code) {
      return this._sb().then(function (sb) {
        return sb.auth.getUser().then(function (u) {
          if (u.error || !u.data.user) throw new Error('Sign in first.');
          var user = u.data.user;
          var args = channel === 'email'
            ? { email: user.email, token: code, type: 'email' }
            : { phone: user.user_metadata.phone, token: code, type: 'sms' };
          return sb.auth.verifyOtp(args).then(function (res) {
            if (res.error) throw new Error(res.error.message);
            return { verified: true };
          });
        });
      });
    },

    signIn: function (input) {
      return this._sb().then(function (sb) {
        return sb.auth.signInWithPassword({
          email: String(input.email).trim().toLowerCase(),
          password: input.password
        }).then(function (res) {
          if (res.error) throw new Error('Email or password is not correct.');
          return { userId: res.data.user.id };
        });
      });
    },

    signOut: function () {
      return this._sb().then(function (sb) { return sb.auth.signOut(); });
    },

    getSession: function () {
      return this._sb().then(function (sb) {
        return sb.auth.getUser().then(function (res) {
          if (res.error || !res.data.user) return null;
          var u = res.data.user;
          return sb.from('profiles').select('display_name, photo_url').eq('user_id', u.id).maybeSingle()
            .then(function (p) {
              return {
                userId: u.id,
                email: u.email,
                phone: u.phone || (u.user_metadata && u.user_metadata.phone) || '',
                emailVerified: !!u.email_confirmed_at,
                phoneVerified: !!u.phone_confirmed_at,
                displayName: (p.data && p.data.display_name) || '',
                photo: (p.data && p.data.photo_url) || ''
              };
            });
        });
      }).catch(function () { return null; });
    },

    _fromRow: function (r) {
      if (!r) return null;
      return {
        userId: r.user_id, displayName: r.display_name, photo: r.photo_url,
        birthYear: r.birth_year, gender: r.gender, motherTongues: r.mother_tongues || [],
        alsoSpeaks: r.also_speaks || [], city: r.city, fromCountry: r.from_country,
        occupation: r.occupation, bio: r.bio, lookingFor: r.looking_for || [],
        interests: r.interests || [], availability: r.availability || [],
        visibility: r.visibility, coffeeMode: r.coffee_mode,
        updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now()
      };
    },

    _toRow: function (userId, p) {
      var row = { user_id: userId, updated_at: new Date().toISOString() };
      var map = {
        displayName: 'display_name', photo: 'photo_url', birthYear: 'birth_year',
        gender: 'gender', motherTongues: 'mother_tongues', alsoSpeaks: 'also_speaks',
        city: 'city', fromCountry: 'from_country', occupation: 'occupation', bio: 'bio',
        lookingFor: 'looking_for', interests: 'interests', availability: 'availability',
        visibility: 'visibility', coffeeMode: 'coffee_mode'
      };
      for (var k in map) if (p[k] !== undefined) row[map[k]] = p[k];
      return row;
    },

    getProfile: function (userId) {
      var self = this;
      return this._sb().then(function (sb) {
        return sb.from('profiles').select('*').eq('user_id', userId).maybeSingle()
          .then(function (res) { return self._fromRow(res.data); });
      });
    },

    getProfileById: function (id) { return this.getProfile(id); },

    saveProfile: function (userId, patch) {
      var self = this;
      return this._sb().then(function (sb) {
        return sb.from('profiles').upsert(self._toRow(userId, patch), { onConflict: 'user_id' })
          .select().single()
          .then(function (res) {
            if (res.error) throw new Error(res.error.message);
            return self._fromRow(res.data);
          });
      });
    },

    listProfiles: function (query) {
      var self = this;
      return this._sb().then(function (sb) {
        var q = sb.from('profiles').select('*').neq('visibility', 'hidden').limit(60);
        if (query && query.city) q = q.eq('city', query.city);
        if (query && query.language) q = q.contains('mother_tongues', [query.language]);
        return q.then(function (res) {
          if (res.error) throw new Error(res.error.message);
          return (res.data || []).map(function (r) { return self._fromRow(r); });
        });
      });
    },

    uploadPhoto: function (file) {
      if (!file || !/^image\//.test(file.type)) return fail('That file is not an image.');
      if (file.size > 6 * 1024 * 1024) return fail('That image is larger than 6 MB.');
      return this._sb().then(function (sb) {
        return sb.auth.getUser().then(function (u) {
          var path = u.data.user.id + '/' + Date.now() + '.jpg';
          return sb.storage.from('avatars').upload(path, file, { upsert: true }).then(function (res) {
            if (res.error) throw new Error(res.error.message);
            return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
          });
        });
      });
    },

    connect: function (fromId, toId, message) {
      return this._sb().then(function (sb) {
        return sb.from('connections').insert({ from_user: fromId, to_user: toId, message: message })
          .then(function (res) {
            if (res.error) throw new Error(res.error.message);
            return { sent: true };
          });
      });
    },

    listConnections: function (userId) {
      return this._sb().then(function (sb) {
        return sb.from('connections').select('*')
          .or('from_user.eq.' + userId + ',to_user.eq.' + userId)
          .then(function (res) { return res.data || []; });
      });
    },

    report: function (fromId, aboutId, reason, detail) {
      return this._sb().then(function (sb) {
        return sb.from('reports').insert({ from_user: fromId, about_user: aboutId, reason: reason, detail: detail })
          .then(function () { return { filed: true }; });
      });
    },

    block: function (userId, blockedId) {
      return this._sb().then(function (sb) {
        return sb.from('blocks').insert({ user_id: userId, blocked_user: blockedId })
          .then(function () { return { blocked: true }; });
      });
    },

    changePassword: function (userId, currentPw, newPw) {
      var check = Validate.password(newPw);
      if (!check.ok) return fail('Your new password needs ' + check.problems.join(', ') + '.');
      return this._sb().then(function (sb) {
        return sb.auth.updateUser({ password: newPw }).then(function (res) {
          if (res.error) throw new Error(res.error.message);
          return { changed: true };
        });
      });
    },

    exportData: function (userId) {
      return this.getProfile(userId).then(function (p) {
        return { exportedAt: new Date().toISOString(), profile: p };
      });
    },

    deleteAccount: function () {
      /* Deleting an auth user needs the service role key, which must never be
         in front-end code. Call an edge function instead. See SETUP-BACKEND.md */
      return this._sb().then(function (sb) {
        return sb.functions.invoke('delete-account').then(function (res) {
          if (res.error) throw new Error('Account deletion is not set up yet. See SETUP-BACKEND.md');
          return sb.auth.signOut().then(function () { return { deleted: true }; });
        });
      });
    }
  };

  /* ================================================================ pick */

  var impl = (CFG.BACKEND === 'supabase') ? Supabase : Mock;

  return {
    name: impl.name,
    isMock: impl.name === 'mock',
    Validate: Validate,
    Limiter: Limiter,

    signUp: impl.signUp.bind(impl),
    sendCode: impl.sendCode.bind(impl),
    verifyCode: impl.verifyCode.bind(impl),
    signIn: impl.signIn.bind(impl),
    signOut: impl.signOut.bind(impl),
    getSession: impl.getSession.bind(impl),
    getProfile: impl.getProfile.bind(impl),
    getProfileById: impl.getProfileById.bind(impl),
    saveProfile: impl.saveProfile.bind(impl),
    listProfiles: impl.listProfiles.bind(impl),
    uploadPhoto: impl.uploadPhoto.bind(impl),
    connect: impl.connect.bind(impl),
    listConnections: impl.listConnections.bind(impl),
    report: impl.report.bind(impl),
    block: impl.block.bind(impl),
    changePassword: impl.changePassword.bind(impl),
    exportData: impl.exportData.bind(impl),
    deleteAccount: impl.deleteAccount.bind(impl)
  };
})();
