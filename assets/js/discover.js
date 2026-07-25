/* SAMO — Discover people nearby */
(function () {
  'use strict';
  var $ = Core.$, esc = Core.esc;
  var D = window.SAMO;
  var me = null, myProfile = null;

  Core.boot({ requireAuth: true }).then(function (ctx) {
    me = ctx.user;
    myProfile = ctx.profile || {};
    buildFilters();
    gate();
    search();
  }).catch(function () {});

  function gate() {
    var check = Core.canConnect(me, myProfile);
    var box = $('#gateNotice');
    if (check.ok) { box.hidden = true; return; }
    box.hidden = false;
    box.className = 'card notice--warn';
    box.innerHTML = '<strong>You can look, but you cannot say hello yet.</strong><p class="mb-0 mt-2">' +
      esc(check.reason) + '</p>' +
      '<a class="btn btn-primary btn-sm mt-4" href="' +
      Core.url(me.emailVerified && (!Core.CFG.REQUIRE_PHONE || me.phoneVerified) ? 'onboarding.html' : 'verify.html') +
      '">Sort this out</a>';
  }

  function buildFilters() {
    var mine = (myProfile.motherTongues || [])[0] || 'ur';

    $('#filterLang').innerHTML = D.LANGUAGES.map(function (l) {
      return '<option value="' + l.code + '"' + (l.code === mine ? ' selected' : '') + '>' +
        esc(l.label + '  ' + l.native) + '</option>';
    }).join('');

    $('#filterCity').innerHTML = D.CITIES.map(function (c) {
      return '<option value="' + c.code + '"' + (c.code === myProfile.city ? ' selected' : '') + '>' +
        esc(c.label + ' · ' + c.district) + '</option>';
    }).join('');

    $('#filterWant').innerHTML = '<option value="">Anything</option>' +
      Core.LOOKING_FOR.map(function (l) {
        return '<option value="' + l.id + '">' + esc(l.icon + ' ' + l.label) + '</option>';
      }).join('');

    $('#searchBtn').addEventListener('click', search);
    ['#filterLang', '#filterCity', '#filterWant'].forEach(function (s) {
      $(s).addEventListener('change', search);
    });
  }

  function search() {
    var grid = $('#peopleGrid');
    grid.innerHTML = new Array(6).join('x').split('x').map(function () {
      return '<div class="skeleton skeleton-card"></div>';
    }).join('');
    $('#resultCount').textContent = 'Searching…';

    Backend.listProfiles({
      language: $('#filterLang').value,
      city: $('#filterCity').value,
      lookingFor: $('#filterWant').value || null
    }).then(function (people) {
      var blocks = Core.storage.json('samo.blocks.' + me.userId, []);
      people = people.filter(function (p) {
        return p.userId !== me.userId && blocks.indexOf(p.userId) === -1;
      });
      render(people);
    }).catch(function (err) {
      $('#resultCount').textContent = '';
      grid.innerHTML = '<div class="card empty-state"><h2>Search failed</h2><p class="muted">' + esc(err.message) + '</p></div>';
    });
  }

  function render(people) {
    var grid = $('#peopleGrid');
    var lang = D.getLanguage($('#filterLang').value);
    var city = D.getCity($('#filterCity').value);

    if (!people.length) {
      $('#resultCount').textContent = '';
      grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1">' +
        '<h2>Nobody here yet</h2>' +
        '<p class="muted">No ' + esc(lang.label.replace(/^\S+\s/, '')) + ' speakers in ' + esc(city.label) + ' so far. ' +
        'Try a nearby city, or a language you also speak.</p></div>';
      return;
    }

    $('#resultCount').textContent = people.length + ' ' +
      lang.label.replace(/^\S+\s/, '') + ' speaker' + (people.length === 1 ? '' : 's') + ' in ' + city.label;

    grid.innerHTML = people.map(function (p) {
      var wants = (p.lookingFor || []).slice(0, 2).map(function (id) {
        var f = Core.LOOKING_FOR.filter(function (l) { return l.id === id; })[0];
        return f ? f.icon + ' ' + f.label : id;
      });
      return '<a class="person-card" href="' + Core.url('profile.html?id=' + encodeURIComponent(p.userId)) + '">' +
        '<div class="person-top">' +
        '<span class="avatar">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="">' : esc(Core.initials(p.displayName))) + '</span>' +
        '<div><p class="person-name">' + esc(p.displayName) +
        (p.phoneVerified ? ' <span title="Verified" style="color:#15803D">✓</span>' : '') + '</p>' +
        '<p class="person-sub">' +
        (p.birthYear ? Core.age(p.birthYear) + ' · ' : '') +
        esc(p.occupation || '') + (p.dist ? ' · ' + esc(p.dist) : '') + '</p></div>' +
        '</div>' +
        '<p class="person-bio">' + esc(p.bio || '') + '</p>' +
        '<div class="person-tags">' +
        (p.coffeeMode ? '<span class="tag tag--green chip--sm">☕ Free now</span>' : '') +
        wants.map(function (w) { return '<span class="tag chip--sm">' + esc(w) + '</span>'; }).join('') +
        '</div></a>';
    }).join('');
  }
})();
