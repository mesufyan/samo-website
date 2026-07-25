/* ==========================================================================
   SAMO — Profile wizard
   Seven steps, saves after every one, resumes where you left off.
   ========================================================================== */

(function () {
  'use strict';

  var $ = Core.$, $$ = Core.$$, esc = Core.esc;
  var D = window.SAMO;

  var user = null;
  var profile = {};
  var step = 0;
  var STEPS = ['Photo', 'Languages', 'City', 'About you', 'Interests', 'Privacy', 'Review'];

  Core.boot({ requireAuth: true }).then(function (ctx) {
    user = ctx.user;
    profile = ctx.profile || {};
    profile.motherTongues = profile.motherTongues || [];
    profile.alsoSpeaks = profile.alsoSpeaks || [];
    profile.lookingFor = profile.lookingFor || [];
    profile.interests = profile.interests || [];
    profile.availability = profile.availability || [];
    profile.visibility = profile.visibility || 'all';

    build();
    hydrate();
    step = Number(Core.storage.get('samo.wizardStep') || 0);
    if (step > 6) step = 6;
    show(step);
  }).catch(function () {});

  /* ------------------------------------------------------------ building */

  function build() {
    /* cities */
    $('#city').innerHTML = '<option value="">Choose your city</option>' +
      D.CITIES.map(function (c) {
        return '<option value="' + c.code + '">' + esc(c.label + ' · ' + c.district) + '</option>';
      }).join('') +
      '<option value="other">My city is not listed yet</option>';

    /* genders */
    $('#gender').innerHTML = '<option value="">Choose</option>' +
      Core.GENDERS.map(function (g) { return '<option value="' + esc(g) + '">' + esc(g) + '</option>'; }).join('');

    /* visibility */
    $('#visibility').innerHTML = Core.VISIBILITY.map(function (v) {
      return '<option value="' + v.id + '">' + esc(v.label) + '</option>';
    }).join('');

    /* chip sets */
    chipSet('#lookingForSet', Core.LOOKING_FOR.map(function (l) {
      return { id: l.id, label: l.icon + ' ' + l.label };
    }), 'lookingFor');
    chipSet('#interestSet', Core.INTERESTS.map(function (i) { return { id: i, label: i }; }), 'interests');
    chipSet('#availabilitySet', Core.AVAILABILITY.map(function (a) { return { id: a, label: a }; }), 'availability');

    /* language pickers */
    langPicker('#motherList', '#motherSearch', '#motherChosen', 'motherTongues');
    langPicker('#alsoList', '#alsoSearch', '#alsoChosen', 'alsoSpeaks');

    /* photo */
    $('#photoPick').addEventListener('click', function () { $('#photoInput').click(); });
    $('#photoDrop').addEventListener('click', function () { $('#photoInput').click(); });
    $('#photoInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      Backend.uploadPhoto(file).then(function (src) {
        profile.photo = src;
        paintPhoto();
        Core.toast('Photo added', 'You can swap it any time.');
      }).catch(function (err) { Core.toast('That photo did not work', err.message, 'warn'); });
    });
    $('#photoRemove').addEventListener('click', function () {
      profile.photo = '';
      $('#photoInput').value = '';
      paintPhoto();
    });

    /* plain fields */
    bindText('#displayName', 'displayName');
    bindText('#fromCountry', 'fromCountry');
    bindText('#occupation', 'occupation');
    bindText('#birthYear', 'birthYear');
    bindText('#bio', 'bio');
    bindSelect('#city', 'city');
    bindSelect('#gender', 'gender');
    bindSelect('#visibility', 'visibility');

    $('#bio').addEventListener('input', function () {
      var n = $('#bio').value.length;
      $('#bioCount').textContent = n;
      $('#bioCount').parentElement.classList.toggle('over', n > 600);
    });

    /* navigation */
    $('#nextBtn').addEventListener('click', next);
    $('#backBtn').addEventListener('click', function () { if (step > 0) show(step - 1); });
    $('#saveExitBtn').addEventListener('click', function () {
      save().then(function () {
        Core.toast('Saved', 'Come back to your profile whenever you like.');
        setTimeout(function () { Core.go('profile.html'); }, 900);
      });
    });
  }

  function bindText(sel, key) {
    var el = $(sel);
    if (!el) return;
    el.addEventListener('input', function () { profile[key] = el.value; });
  }
  function bindSelect(sel, key) {
    var el = $(sel);
    if (!el) return;
    el.addEventListener('change', function () { profile[key] = el.value; });
  }

  /* ----------------------------------------------------------- hydration */

  function hydrate() {
    $('#displayName').value = profile.displayName || '';
    $('#fromCountry').value = profile.fromCountry || '';
    $('#occupation').value = profile.occupation || '';
    $('#birthYear').value = profile.birthYear || '';
    $('#bio').value = profile.bio || '';
    $('#bioCount').textContent = (profile.bio || '').length;
    $('#city').value = profile.city || '';
    $('#gender').value = profile.gender || '';
    $('#visibility').value = profile.visibility || 'all';
    paintPhoto();
    paintChips();
    paintLangs();
  }

  function paintPhoto() {
    var img = $('#photoPreview');
    if (profile.photo) {
      img.src = profile.photo;
      img.hidden = false;
      $('#photoRemove').classList.remove('hidden');
    } else {
      img.hidden = true;
      img.removeAttribute('src');
      $('#photoRemove').classList.add('hidden');
    }
  }

  /* ---------------------------------------------------------- chip sets */

  function chipSet(sel, options, key) {
    var host = $(sel);
    host.innerHTML = options.map(function (o) {
      return '<button type="button" class="chip" data-val="' + esc(o.id) + '" aria-pressed="false">' +
        esc(o.label) + '</button>';
    }).join('');

    host.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var val = chip.dataset.val;
      var list = profile[key] || (profile[key] = []);
      var i = list.indexOf(val);
      if (i === -1) list.push(val); else list.splice(i, 1);
      chip.setAttribute('aria-pressed', String(i === -1));
    });
  }

  function paintChips() {
    [['#lookingForSet', 'lookingFor'], ['#interestSet', 'interests'], ['#availabilitySet', 'availability']]
      .forEach(function (pair) {
        var list = profile[pair[1]] || [];
        $$(pair[0] + ' .chip').forEach(function (chip) {
          chip.setAttribute('aria-pressed', String(list.indexOf(chip.dataset.val) !== -1));
        });
      });
  }

  /* ---------------------------------------------------- language pickers */

  function langPicker(listSel, searchSel, chosenSel, key) {
    var list = $(listSel);
    var search = $(searchSel);

    function draw(filter) {
      var q = (filter || '').trim().toLowerCase();
      var items = D.LANGUAGES.filter(function (l) {
        if (!q) return true;
        return l.label.toLowerCase().indexOf(q) !== -1 || l.native.toLowerCase().indexOf(q) !== -1;
      });
      if (!items.length) {
        list.innerHTML = '<p class="muted" style="padding:14px">No language matches that. Tell us on the waitlist form and we will add it.</p>';
        return;
      }
      var chosen = profile[key] || [];
      list.innerHTML = items.map(function (l) {
        var on = chosen.indexOf(l.code) !== -1;
        return '<button type="button" class="lang-row" data-code="' + l.code + '" aria-pressed="' + on + '">' +
          '<span class="tick">✓</span>' +
          '<span>' + esc(l.label) + '</span>' +
          '<span class="native"' + (l.rtl ? ' dir="rtl"' : '') + '>' + esc(l.native) + '</span>' +
          '</button>';
      }).join('');
    }

    draw('');
    search.addEventListener('input', Core.debounce(function () { draw(search.value); }, 150));

    list.addEventListener('click', function (e) {
      var row = e.target.closest('.lang-row');
      if (!row) return;
      var code = row.dataset.code;
      var arr = profile[key] || (profile[key] = []);
      var i = arr.indexOf(code);
      if (i === -1) {
        if (key === 'motherTongues' && arr.length >= 3) {
          Core.toast('Three is the limit', 'Put anything else under other languages you speak.', 'warn');
          return;
        }
        arr.push(code);
      } else {
        arr.splice(i, 1);
      }
      row.setAttribute('aria-pressed', String(i === -1));
      paintLangs();
    });
  }

  function paintLangs() {
    [['#motherChosen', 'motherTongues'], ['#alsoChosen', 'alsoSpeaks']].forEach(function (pair) {
      var arr = profile[pair[1]] || [];
      var host = $(pair[0]);
      host.innerHTML = arr.length
        ? arr.map(function (c) {
            var l = D.getLanguage(c);
            return '<span class="tag">' + esc(l.label) +
              '<button type="button" data-remove="' + c + '" data-key="' + pair[1] + '" aria-label="Remove ' + esc(l.label) + '" ' +
              'style="background:none;border:0;cursor:pointer;color:inherit;font-size:16px;line-height:1;padding:0 0 0 2px">&times;</button></span>';
          }).join('')
        : '<span class="tiny">Nothing chosen yet</span>';
    });

    $$('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.dataset.key;
        var arr = profile[key] || [];
        var i = arr.indexOf(b.dataset.remove);
        if (i !== -1) arr.splice(i, 1);
        paintLangs();
        $$('.lang-row[data-code="' + b.dataset.remove + '"]').forEach(function (r) {
          if ((profile[key] || []).indexOf(b.dataset.remove) === -1) r.setAttribute('aria-pressed', 'false');
        });
      });
    });
  }

  /* -------------------------------------------------------- step control */

  function show(n) {
    step = n;
    Core.storage.set('samo.wizardStep', String(n));

    $$('.wizard-step').forEach(function (s) {
      s.classList.toggle('active', Number(s.dataset.step) === n);
    });

    $('#progressFill').style.width = Math.round((n / (STEPS.length - 1)) * 100) + '%';
    $('#stepDots').innerHTML = STEPS.map(function (label, i) {
      var cls = i === n ? 'current' : (i < n ? 'done' : '');
      return '<span class="step-dot ' + cls + '">' + esc(label) + '</span>';
    }).join('');

    $('#backBtn').style.visibility = n === 0 ? 'hidden' : 'visible';
    $('#nextBtn').textContent = n === STEPS.length - 1 ? 'Publish my profile' : 'Continue';

    if (n === STEPS.length - 1) renderReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------------------------------------------------- validation */

  function validateStep(n) {
    var errs = [];
    if (n === 0) {
      if (!profile.photo) errs.push('Add a photo. It is the one thing people always look at.');
      if (!(profile.displayName || '').trim()) errs.push('Add your first name.');
    }
    if (n === 1) {
      if (!(profile.motherTongues || []).length) errs.push('Pick at least one mother tongue.');
    }
    if (n === 2) {
      if (!profile.city) errs.push('Choose your city.');
    }
    if (n === 3) {
      var by = Backend.Validate.birthYear(profile.birthYear);
      if (!by.ok) errs.push(by.reason);
      if (!profile.gender) errs.push('Choose a gender, or prefer not to say.');
      var bio = (profile.bio || '').trim();
      if (bio.length < 40) errs.push('Write at least 40 characters about yourself. You are at ' + bio.length + '.');
    }
    if (n === 4) {
      if (!(profile.lookingFor || []).length) errs.push('Pick at least one thing you are here for.');
    }
    return errs;
  }

  function next() {
    var errs = validateStep(step);
    if (errs.length) {
      Core.toast('Almost', errs[0], 'warn');
      if (step === 3) {
        var by = Backend.Validate.birthYear(profile.birthYear);
        var el = $('#birthYearError');
        if (!by.ok) { el.textContent = by.reason; el.classList.remove('hidden'); $('#birthYear').setAttribute('aria-invalid', 'true'); }
        else { el.classList.add('hidden'); $('#birthYear').removeAttribute('aria-invalid'); }
      }
      return;
    }

    save().then(function () {
      if (step < STEPS.length - 1) { show(step + 1); return; }
      publish();
    });
  }

  function save() {
    return Backend.saveProfile(user.userId, profile).catch(function (err) {
      Core.toast('Could not save', err.message, 'warn');
    });
  }

  /* -------------------------------------------------------------- review */

  function renderReview() {
    var missing = Core.missingRequired(profile);
    var pct = Core.completeness(profile);
    var langs = (profile.motherTongues || []).map(function (c) { return D.getLanguage(c).label; });
    var also = (profile.alsoSpeaks || []).map(function (c) { return D.getLanguage(c).label; });
    var city = profile.city && profile.city !== 'other' ? D.getCity(profile.city) : null;
    var wants = (profile.lookingFor || []).map(function (id) {
      var f = Core.LOOKING_FOR.filter(function (l) { return l.id === id; })[0];
      return f ? f.icon + ' ' + f.label : id;
    });

    $('#reviewPane').innerHTML =
      '<div class="profile-hero mb-6">' +
      '<span class="avatar avatar--lg">' +
      (profile.photo ? '<img src="' + esc(profile.photo) + '" alt="">' : esc(Core.initials(profile.displayName))) +
      '</span>' +
      '<div class="profile-id">' +
      '<h3 class="profile-name">' + esc(profile.displayName || 'No name yet') + '</h3>' +
      '<p class="profile-meta">' +
      (profile.birthYear ? Core.age(profile.birthYear) + ' · ' : '') +
      esc(profile.gender || '') + (city ? ' · ' + esc(city.label) : '') + '</p>' +
      '<div class="chip-set">' + langs.map(function (l) { return '<span class="tag">' + esc(l) + '</span>'; }).join('') + '</div>' +
      '</div></div>' +

      '<div class="profile-section"><h2>About</h2><p class="profile-bio">' + esc(profile.bio || '') + '</p></div>' +

      (wants.length ? '<div class="profile-section"><h2>Here for</h2><div class="chip-set">' +
        wants.map(function (w) { return '<span class="tag tag--teal">' + esc(w) + '</span>'; }).join('') + '</div></div>' : '') +

      (also.length ? '<div class="profile-section"><h2>Also speaks</h2><div class="chip-set">' +
        also.map(function (l) { return '<span class="tag tag--teal">' + esc(l) + '</span>'; }).join('') + '</div></div>' : '') +

      ((profile.interests || []).length ? '<div class="profile-section"><h2>Interests</h2><div class="chip-set">' +
        profile.interests.map(function (i) { return '<span class="tag tag--teal">' + esc(i) + '</span>'; }).join('') + '</div></div>' : '') +

      '<div class="profile-section"><h2>Profile strength</h2>' +
      '<p><span class="meter-num">' + pct + '%</span></p>' +
      '<div class="progress-track mt-2"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>';

    var box = $('#reviewMissing');
    if (missing.length) {
      box.innerHTML = '<strong>Still needed before you can connect with anyone:</strong><ul style="margin:8px 0 0;padding-inline-start:20px">' +
        missing.map(function (m) { return '<li>' + esc(m.label) + '</li>'; }).join('') + '</ul>';
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }

  /* ------------------------------------------------------------- publish */

  function publish() {
    var missing = Core.missingRequired(profile);
    if (missing.length) {
      Core.toast('Nearly there', 'Still needed: ' + missing.map(function (m) { return m.label.toLowerCase(); }).join(', ') + '.', 'warn');
      renderReview();
      return;
    }
    save().then(function () {
      Core.storage.remove('samo.wizardStep');
      Core.toast('Your profile is live', 'You can edit any part of it whenever you like.');
      setTimeout(function () { Core.go('profile.html'); }, 1000);
    });
  }
})();
