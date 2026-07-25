/* SAMO — Sign in */
(function () {
  'use strict';
  var $ = Core.$;

  Core.boot({}).then(function (ctx) {
    if (ctx.user) { Core.go('discover.html'); return; }
    start();
  }).catch(function () {});

  function start() {
    var form = $('#loginForm');
    var btn = $('#submitBtn');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#email').value.trim();
      var pass = $('#password').value;

      if (!email || !pass) {
        Core.toast('Missing details', 'Enter your email and password.', 'warn');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Signing in';

      Backend.signIn({ email: email, password: pass }).then(function () {
        return Backend.getSession();
      }).then(function (session) {
        var back = Core.storage.get('samo.returnTo');
        Core.storage.remove('samo.returnTo');
        if (!session.emailVerified) { Core.go('verify.html'); return; }
        return Backend.getProfile(session.userId).then(function (p) {
          if (Core.missingRequired(p).length) { Core.go('onboarding.html'); return; }
          if (back) { location.href = back; return; }
          Core.go('discover.html');
        });
      }).catch(function (err) {
        Core.toast('Could not sign in', err.message, 'warn');
        btn.disabled = false;
        btn.textContent = 'Sign in';
      });
    });
  }
})();
