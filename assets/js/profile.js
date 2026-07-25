/* SAMO — Profile view (own profile and other members) */
(function () {
  'use strict';
  var $ = Core.$, esc = Core.esc;
  var D = window.SAMO;
  var me = null, myProfile = null, target = null, targetId = null;

  Core.boot({ requireAuth: true }).then(function (ctx) {
    me = ctx.user;
    myProfile = ctx.profile || {};
    targetId = Core.param('id') || me.userId;

    var loader = targetId === me.userId
      ? Promise.resolve(myProfile)
      : Backend.getProfileById(targetId);

    return loader.then(function (p) {
      target = p;
      render();
    });
  }).catch(function (err) {
    if (err && err.message === 'redirect') return;
    $('#profileRoot').innerHTML = '<div class="card empty-state"><h2>That profile could not be opened</h2>' +
      '<p class="muted">It may have been deleted.</p>' +
      '<a class="btn btn-secondary mt-4" href="' + Core.url('discover.html') + '">Back to discover</a></div>';
  });

  function isMine() { return targetId === me.userId; }

  function render() {
    if (!target) {
      $('#profileRoot').innerHTML = '<div class="card empty-state"><h2>Profile not found</h2></div>';
      return;
    }

    var missing = Core.missingRequired(target);
    var pct = Core.completeness(target);

    if (isMine() && missing.length) {
      renderIncomplete(missing, pct);
      return;
    }

    var langs = (target.motherTongues || []).map(function (c) { return D.getLanguage(c); });
    var also = (target.alsoSpeaks || []).map(function (c) { return D.getLanguage(c); });
    var city = target.city && target.city !== 'other' ? D.getCity(target.city) : null;
    var wants = (target.lookingFor || []).map(function (id) {
      var f = Core.LOOKING_FOR.filter(function (l) { return l.id === id; })[0];
      return f ? f.icon + ' ' + f.label : id;
    });

    var actions = isMine()
      ? '<div class="btn-row"><a class="btn btn-primary" href="' + Core.url('onboarding.html') + '">Edit my profile</a>' +
        '<a class="btn btn-ghost" href="' + Core.url('settings.html') + '">Settings</a></div>'
      : '<div class="btn-row"><button class="btn btn-primary" id="connectBtn">Say hello</button>' +
        '<button class="btn btn-ghost" id="reportBtn">Report</button>' +
        '<button class="btn btn-ghost" id="blockBtn">Block</button></div>';

    $('#profileRoot').innerHTML =
      (isMine() && pct < 100 ? strengthCard(pct, target) : '') +

      '<div class="card">' +
      '<div class="profile-hero">' +
      '<span class="avatar avatar--xl">' +
      (target.photo ? '<img src="' + esc(target.photo) + '" alt="Photo of ' + esc(target.displayName) + '">'
                    : esc(Core.initials(target.displayName))) +
      '</span>' +
      '<div class="profile-id">' +
      '<h1 class="profile-name">' + esc(target.displayName) + '</h1>' +
      '<p class="profile-meta">' +
      (target.birthYear ? Core.age(target.birthYear) + ' · ' : '') +
      esc(target.gender || '') +
      (city ? ' · ' + esc(city.label) + ' ' + esc(city.district) : '') +
      (target.dist ? ' · ' + esc(target.dist) + ' away' : '') +
      '</p>' +
      '<div class="profile-badges">' +
      (target.emailVerified ? badge('Email confirmed') : badge('Email not confirmed', true)) +
      (target.phoneVerified ? badge('Phone confirmed') : badge('Phone not confirmed', true)) +
      (target.coffeeMode ? '<span class="badge badge--coffee">☕ Free right now</span>' : '') +
      '</div>' +
      '<div class="chip-set mb-4">' +
      langs.map(function (l) {
        return '<span class="tag"' + (l.rtl ? ' dir="rtl"' : '') + '>' + esc(l.label) + ' · ' + esc(l.native) + '</span>';
      }).join('') + '</div>' +
      actions +
      '</div></div>' +

      '<div class="profile-section"><h2>About</h2>' +
      '<p class="profile-bio">' + esc(target.bio || '') + '</p></div>' +

      (wants.length ? section('Here for', wants.map(tag).join('')) : '') +
      (also.length ? section('Also speaks', also.map(function (l) { return tag(l.label); }).join('')) : '') +
      ((target.interests || []).length ? section('Interests', target.interests.map(tag).join('')) : '') +
      ((target.availability || []).length ? section('Usually free', target.availability.map(tag).join('')) : '') +

      '<div class="profile-section"><h2>Details</h2><dl class="detail-grid">' +
      detail('Lives in', city ? city.label : 'Not given') +
      detail('Originally from', target.fromCountry || 'Not given') +
      detail('Does', target.occupation || 'Not given') +
      detail('Profile updated', target.updatedAt ? Core.timeAgo(target.updatedAt) : 'Unknown') +
      '</dl></div>' +

      '</div>';

    wireActions();
  }

  function badge(text, pending) {
    return '<span class="badge' + (pending ? ' badge--pending' : '') + '">' +
      (pending ? '!' : '✓') + ' ' + esc(text) + '</span>';
  }
  function tag(t) { return '<span class="tag tag--teal">' + esc(t) + '</span>'; }
  function section(title, inner) {
    return '<div class="profile-section"><h2>' + esc(title) + '</h2><div class="chip-set">' + inner + '</div></div>';
  }
  function detail(label, value) {
    return '<div class="detail"><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }

  function strengthCard(pct, p) {
    var missing = Core.PROFILE_FIELDS.filter(function (f) { return !Core.isFilled(p, f.key); });
    return '<div class="card meter-card">' +
      '<div class="row row--between"><div><h2 class="h2 mb-0">Profile strength</h2>' +
      '<p class="muted">A fuller profile gets far more replies.</p></div>' +
      '<span class="meter-num">' + pct + '%</span></div>' +
      '<div class="progress-track mt-4"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      (missing.length ? '<ul class="todo-list">' + missing.slice(0, 5).map(function (m) {
        return '<li><span class="dot"></span>' + esc(m.label) + (m.required ? ' <strong>(required)</strong>' : '') + '</li>';
      }).join('') + '</ul>' : '') +
      '<a class="btn btn-secondary btn-sm mt-4" href="' + Core.url('onboarding.html') + '">Add the missing bits</a>' +
      '</div>';
  }

  function renderIncomplete(missing, pct) {
    $('#profileRoot').innerHTML =
      '<div class="card">' +
      '<h1 class="h1">Your profile is not live yet</h1>' +
      '<p class="lede">Other members cannot see you, and you cannot send anyone a hello, until these are filled in. It takes about ten minutes.</p>' +
      '<div class="progress-track mb-4"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<ul class="todo-list">' + missing.map(function (m) {
        return '<li><span class="dot"></span>' + esc(m.label) + '</li>';
      }).join('') + '</ul>' +
      '<a class="btn btn-primary btn-lg mt-6" href="' + Core.url('onboarding.html') + '">Continue my profile</a>' +
      '</div>';
  }

  /* ------------------------------------------------------------- actions */

  function wireActions() {
    var connectBtn = $('#connectBtn');
    if (connectBtn) {
      connectBtn.addEventListener('click', function () {
        var gate = Core.canConnect(me, myProfile);
        if (!gate.ok) { Core.toast('Not yet', gate.reason, 'warn'); return; }
        $('#connectModal').hidden = false;
        $('#connectMsg').focus();
      });
    }

    var reportBtn = $('#reportBtn');
    if (reportBtn) reportBtn.addEventListener('click', function () { $('#reportModal').hidden = false; });

    var blockBtn = $('#blockBtn');
    if (blockBtn) {
      blockBtn.addEventListener('click', function () {
        Backend.block(me.userId, targetId).then(function () {
          Core.toast('Blocked', 'They will not appear in your results again and cannot see you.');
          setTimeout(function () { Core.go('discover.html'); }, 1200);
        });
      });
    }

    $('#connectCancel').addEventListener('click', function () { $('#connectModal').hidden = true; });
    $('#reportCancel').addEventListener('click', function () { $('#reportModal').hidden = true; });

    $('#connectSend').addEventListener('click', function () {
      var msg = $('#connectMsg').value.trim();
      if (msg.length < 15) { Core.toast('Say a little more', 'Fifteen characters or more. A one word hello rarely gets a reply.', 'warn'); return; }
      Backend.connect(me.userId, targetId, msg).then(function () {
        $('#connectModal').hidden = true;
        Core.toast('Request sent', 'You will hear back through your inbox.');
      }).catch(function (e) { Core.toast('Could not send', e.message, 'warn'); });
    });

    $('#reportSend').addEventListener('click', function () {
      Backend.report(me.userId, targetId, $('#reportReason').value, $('#reportDetail').value).then(function () {
        $('#reportModal').hidden = true;
        Core.toast('Report received', 'A moderator will look at this. Thank you for telling us.');
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { $('#connectModal').hidden = true; $('#reportModal').hidden = true; }
    });
  }
})();
