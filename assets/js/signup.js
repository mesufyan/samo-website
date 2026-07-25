/* SAMO — Create account */
(function () {
  'use strict';
  var $ = Core.$;

  Core.boot({}).then(function (ctx) {
    if (ctx.user) { Core.go('discover.html'); return; }
    start();
  }).catch(function () {});

  function start() {
    var form = $('#signupForm');
    var pw = $('#password');
    var btn = $('#submitBtn');

    if (!Core.CFG.REQUIRE_PHONE) {
      $('#phoneField').classList.add('hidden');
    }

    /* live password strength */
    pw.addEventListener('input', function () {
      var r = Backend.Validate.password(pw.value);
      Core.$$('.pw-seg').forEach(function (seg) {
        var n = Number(seg.dataset.seg);
        seg.className = 'pw-seg' + (n <= r.score ? ' on-' + r.score : '');
      });
      $('#pwLabel').textContent = pw.value
        ? (r.ok ? r.label : r.label + '. Add ' + r.problems.join(', ') + '.')
        : 'Use ten characters or more, with a capital letter and a number.';
    });

    function showError(id, msg) {
      var el = $('#' + id + 'Error');
      var input = $('#' + id);
      if (msg) {
        el.textContent = msg; el.classList.remove('hidden');
        if (input) input.setAttribute('aria-invalid', 'true');
      } else {
        el.classList.add('hidden');
        if (input) input.removeAttribute('aria-invalid');
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showError('email', ''); showError('phone', ''); showError('password2', '');

      var email = $('#email').value.trim();
      var phone = $('#phone').value.trim();
      var pass = pw.value;
      var pass2 = $('#password2').value;

      var bad = false;
      if (!Backend.Validate.email(email)) { showError('email', 'That email address does not look right.'); bad = true; }
      if (Core.CFG.REQUIRE_PHONE && !Backend.Validate.phone(phone)) {
        showError('phone', 'Start with the country code, for example +92 300 1234567.'); bad = true;
      }
      if (pass !== pass2) { showError('password2', 'The two passwords do not match.'); bad = true; }
      if (!$('#age').checked) { Core.toast('One more thing', 'Confirm you are 18 or older.', 'warn'); bad = true; }
      if (!$('#terms').checked) { Core.toast('One more thing', 'Accept the privacy notice and community rules.', 'warn'); bad = true; }
      if (bad) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creating your account';

      Backend.signUp({
        email: email, phone: phone, password: pass, acceptedTerms: true
      }).then(function () {
        Core.go('verify.html');
      }).catch(function (err) {
        Core.toast('Could not create the account', err.message, 'warn');
        btn.disabled = false;
        btn.textContent = 'Create account';
      });
    });
  }
})();
