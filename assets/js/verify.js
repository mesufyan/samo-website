/* SAMO — Email and phone confirmation */
(function () {
  'use strict';
  var $ = Core.$, $$ = Core.$$;
  var session = null;
  var channel = 'email';
  var cooldown = 0, cooldownTimer = null;

  Core.boot({ requireAuth: true }).then(function (ctx) {
    session = ctx.user;
    render();
    if (!isDone()) send(true);
  }).catch(function () {});

  function needPhone() { return Core.CFG.REQUIRE_PHONE; }

  function isDone() {
    return session.emailVerified && (!needPhone() || session.phoneVerified);
  }

  function currentChannel() {
    if (!session.emailVerified) return 'email';
    if (needPhone() && !session.phoneVerified) return 'phone';
    return null;
  }

  function render() {
    channel = currentChannel();

    var steps = [
      { key: 'email', label: 'Email address', value: session.email, done: session.emailVerified }
    ];
    if (needPhone()) {
      steps.push({ key: 'phone', label: 'Mobile number', value: session.phone || 'Not given', done: session.phoneVerified });
    }

    $('#stepList').innerHTML = steps.map(function (s, i) {
      var state = s.done ? 'done' : (s.key === channel ? 'active' : '');
      return '<div class="verify-step ' + state + '">' +
        '<span class="verify-step-icon">' + (s.done ? '✓' : (i + 1)) + '</span>' +
        '<div><strong style="color:var(--teal)">' + Core.esc(s.label) + '</strong>' +
        '<p class="tiny mb-0">' + Core.esc(s.value) + '</p></div>' +
        '<span class="tag ' + (s.done ? 'tag--green' : 'tag--teal') + '" style="margin-inline-start:auto">' +
        (s.done ? 'Confirmed' : 'Waiting') + '</span></div>';
    }).join('');

    if (isDone()) {
      $('#codePanel').classList.add('hidden');
      $('#allDone').classList.remove('hidden');
      return;
    }

    $('#codePanel').classList.remove('hidden');
    $('#allDone').classList.add('hidden');
    $('#codeTitle').textContent = channel === 'email' ? 'Check your email' : 'Check your phone';
    $('#codeSubtitle').textContent = 'We sent a six digit code to ' +
      (channel === 'email' ? session.email : session.phone) + '. It expires in ten minutes.';
    $('#skipPhoneBtn').classList.toggle('hidden', channel !== 'phone');
  }

  function send(quiet) {
    Backend.sendCode(channel).then(function (res) {
      if (!quiet) Core.toast('Code sent', 'Check ' + res.to + '.');
      if (res.demoCode) {
        $('#demoCodeBox').innerHTML =
          '<div class="demo-code">Demo mode — there is no server to send SMS or email, so the code is shown here. ' +
          'A real backend never does this.<b>' + Core.esc(res.demoCode) + '</b></div>';
      }
      startCooldown(60);
    }).catch(function (err) {
      Core.toast('Could not send the code', err.message, 'warn');
    });
  }

  function startCooldown(seconds) {
    cooldown = seconds;
    var btn = $('#resendBtn');
    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(function () {
      cooldown--;
      if (cooldown <= 0) {
        clearInterval(cooldownTimer);
        btn.disabled = false;
        btn.textContent = 'Send a new code';
      } else {
        btn.disabled = true;
        btn.textContent = 'Send a new code in ' + cooldown + 's';
      }
    }, 1000);
    btn.disabled = true;
    btn.textContent = 'Send a new code in ' + cooldown + 's';
  }

  /* six separate boxes that behave like one field */
  function wireCodeInputs() {
    var boxes = $$('.code-input');
    boxes.forEach(function (box, i) {
      box.addEventListener('input', function () {
        box.value = box.value.replace(/\D/g, '').slice(0, 1);
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener('paste', function (e) {
        e.preventDefault();
        var digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        digits.split('').forEach(function (d, k) { if (boxes[k]) boxes[k].value = d; });
        boxes[Math.min(digits.length, 5)].focus();
      });
    });
    return boxes;
  }

  var boxes = wireCodeInputs();

  $('#codeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = boxes.map(function (b) { return b.value; }).join('');
    var err = $('#codeError');
    err.classList.add('hidden');

    if (code.length !== 6) {
      err.textContent = 'Enter all six digits.';
      err.classList.remove('hidden');
      return;
    }

    var btn = $('#verifyBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Checking';

    Backend.verifyCode(channel, code).then(function () {
      return Backend.getSession();
    }).then(function (s) {
      session = s;
      boxes.forEach(function (b) { b.value = ''; });
      btn.disabled = false;
      btn.textContent = 'Confirm code';
      $('#demoCodeBox').innerHTML = '';
      Core.toast('Confirmed', channel === 'email' ? 'Email address confirmed.' : 'Phone number confirmed.');
      render();
      if (!isDone()) { send(false); boxes[0].focus(); }
    }).catch(function (e2) {
      err.textContent = e2.message;
      err.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Confirm code';
      boxes.forEach(function (b) { b.value = ''; });
      boxes[0].focus();
    });
  });

  $('#resendBtn').addEventListener('click', function () { send(false); });

  $('#skipPhoneBtn').addEventListener('click', function () {
    Core.toast('Saved for later', 'You can confirm your phone from Settings, but you cannot connect with anyone until you do.');
    setTimeout(function () { Core.go('onboarding.html'); }, 1200);
  });
})();
