/* SAMO — Settings */
(function () {
  'use strict';
  var $ = Core.$, $$ = Core.$$, esc = Core.esc;
  var me = null, profile = null;

  Core.boot({ requireAuth: true }).then(function (ctx) {
    me = ctx.user;
    profile = ctx.profile || {};
    render();
    wire();
  }).catch(function () {});

  function render() {
    $('#accountRows').innerHTML =
      row('Email address', me.email,
        me.emailVerified ? '<span class="badge">✓ Confirmed</span>'
                         : '<a class="btn btn-secondary btn-sm" href="' + Core.url('verify.html') + '">Confirm</a>') +
      row('Mobile number', me.phone || 'Not given',
        me.phoneVerified ? '<span class="badge">✓ Confirmed</span>'
                         : '<a class="btn btn-secondary btn-sm" href="' + Core.url('verify.html') + '">Confirm</a>') +
      row('Profile', Core.completeness(profile) + '% complete',
        '<a class="btn btn-secondary btn-sm" href="' + Core.url('onboarding.html') + '">Edit</a>');

    $('#visibility').innerHTML = Core.VISIBILITY.map(function (v) {
      return '<option value="' + v.id + '"' + (v.id === profile.visibility ? ' selected' : '') + '>' +
        esc(v.label) + '</option>';
    }).join('');
    $('#coffeeMode').checked = !!profile.coffeeMode;
  }

  function row(title, value, action) {
    return '<div class="setting-row"><div class="info"><h3>' + esc(title) + '</h3>' +
      '<p>' + esc(value) + '</p></div>' + action + '</div>';
  }

  function wire() {
    $('#savePrivacy').addEventListener('click', function () {
      Backend.saveProfile(me.userId, {
        visibility: $('#visibility').value,
        coffeeMode: $('#coffeeMode').checked
      }).then(function () {
        Core.toast('Saved', 'Your privacy settings are updated.');
      });
    });

    var newPw = $('#newPw');
    newPw.addEventListener('input', function () {
      var r = Backend.Validate.password(newPw.value);
      $$('.pw-seg').forEach(function (seg) {
        var n = Number(seg.dataset.seg);
        seg.className = 'pw-seg' + (n <= r.score ? ' on-' + r.score : '');
      });
      $('#pwLabel').textContent = newPw.value ? (r.ok ? r.label : r.label + '. Add ' + r.problems.join(', ') + '.') : '';
    });

    $('#changePwBtn').addEventListener('click', function () {
      var btn = $('#changePwBtn');
      btn.disabled = true;
      Backend.changePassword(me.userId, $('#currentPw').value, newPw.value).then(function () {
        $('#currentPw').value = ''; newPw.value = ''; $('#pwLabel').textContent = '';
        $$('.pw-seg').forEach(function (s) { s.className = 'pw-seg'; });
        Core.toast('Password changed', 'Use the new one next time you sign in.');
      }).catch(function (e) {
        Core.toast('Could not change it', e.message, 'warn');
      }).then(function () { btn.disabled = false; });
    });

    $('#exportBtn').addEventListener('click', function () {
      Backend.exportData(me.userId).then(function (data) {
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'samo-my-data.json';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        Core.toast('Downloaded', 'Everything we hold about you is in that file.');
      });
    });

    $('#deleteBtn').addEventListener('click', function () { $('#deleteModal').hidden = false; $('#delConfirm').focus(); });
    $('#delCancel').addEventListener('click', function () { $('#deleteModal').hidden = true; });
    $('#delConfirm').addEventListener('input', function () {
      $('#delConfirmBtn').disabled = $('#delConfirm').value.trim() !== 'DELETE';
    });
    $('#delConfirmBtn').addEventListener('click', function () {
      Backend.deleteAccount(me.userId).then(function () {
        Core.go('index.html');
      }).catch(function (e) {
        Core.toast('Could not delete', e.message, 'warn');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') $('#deleteModal').hidden = true;
    });
  }
})();
