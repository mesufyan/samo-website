/* ==========================================================================
   SAMO — Landing page
   ========================================================================== */

(function () {
  'use strict';

  var $ = Core.$, $$ = Core.$$, esc = Core.esc;
  var D = window.SAMO;

  var state = {
    lang: Core.storage.get('samo.lang') || 'ur',
    city: Core.storage.get('samo.city') || 'berlin',
    cycle: 'monthly'
  };

  var ICONS = {
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    script: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>'
  };

  function icon(name, size) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      ICONS[name] + '</svg>';
  }

  var observer = null;

  /* --------------------------------------------------------- language */

  function applyLanguage(code) {
    state.lang = code;
    Core.storage.set('samo.lang', code);
    var lang = D.getLanguage(code);

    var pill = $('#phoneLangFilter');
    if (pill) pill.textContent = lang.label;

    var ui = D.UI[code];
    var native = $('#nativeTagline');
    if (native) {
      if (ui) {
        native.textContent = ui.tagline;
        native.setAttribute('dir', lang.rtl ? 'rtl' : 'ltr');
        native.classList.remove('hidden');
      } else {
        native.classList.add('hidden');
      }
    }

    $$('.lang-chip').forEach(function (chip) {
      var on = chip.dataset.lang === code;
      chip.classList.toggle('selected', on);
      chip.setAttribute('aria-pressed', String(on));
    });

    var sel = $('#demoLang');
    if (sel && sel.value !== code) sel.value = code;

    renderPhoneCards();
    renderDemo();
  }

  /* ------------------------------------------------------ language grid */

  function renderLanguageGrid() {
    var wrap = $('#languageGrid');
    if (!wrap) return;
    var order = ['sa', 'mena', 'africa', 'asia', 'eu'];

    wrap.innerHTML = order.map(function (tier) {
      var items = D.LANGUAGES.filter(function (l) { return l.tier === tier; });
      if (!items.length) return '';
      return '<div class="mb-10">' +
        '<h3 class="lang-group-title mb-4">' + esc(D.TIER_LABELS[tier]) + ' · ' + items.length + '</h3>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">' +
        items.map(function (l) {
          return '<button class="lang-chip" data-lang="' + l.code + '" aria-pressed="false">' +
            '<span class="font-medium">' + esc(l.label) + '</span>' +
            '<span class="lang-chip-native"' + (l.rtl ? ' dir="rtl"' : '') + '>' + esc(l.native) + '</span>' +
            '</button>';
        }).join('') + '</div></div>';
    }).join('');

    wrap.addEventListener('click', function (e) {
      var chip = e.target.closest('.lang-chip');
      if (!chip) return;
      applyLanguage(chip.dataset.lang);
      var demo = $('#demo');
      if (demo && demo.scrollIntoView) demo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    var count = $('#langCount');
    if (count) count.textContent = D.LANGUAGES.length;
  }

  /* ------------------------------------------------------------ features */

  function renderFeatures() {
    var grid = $('#featuresGrid');
    if (!grid) return;
    grid.innerHTML = D.FEATURES.map(function (f, i) {
      return '<article class="feature-card animate-on-scroll" style="--delay:' + (i * 0.07).toFixed(2) + 's">' +
        '<div class="feature-icon">' + icon(f.icon, 22) + '</div>' +
        '<h3 class="text-lg font-bold text-samo-teal mb-2">' + esc(f.title) + '</h3>' +
        '<p class="text-sm leading-relaxed text-samo-text-muted">' + esc(f.body) + '</p>' +
        '</article>';
    }).join('');
  }

  /* --------------------------------------------------------------- phone */

  function personCard(p, dark) {
    return '<div class="user-card' + (dark ? ' user-card--dark' : '') + '">' +
      '<div class="user-avatar">' + esc(p.initials) + '</div>' +
      '<div class="user-info"><div class="user-name-row">' +
      '<span class="user-name">' + esc(p.name) + '</span>' +
      (p.verified ? '<span class="text-samo-terracotta" title="Verified">' + icon('shield', 14) + '</span>' : '') +
      '<span class="user-distance">' + esc(p.dist) + '</span></div>' +
      '<p class="user-bio">' + esc(p.role + ' · ' + p.tenure) + '</p></div>' +
      '<span class="user-status' + (p.coffee ? ' coffee' : '') + '">' + esc(p.status) + '</span></div>';
  }

  function renderPhoneCards() {
    var wrap = $('#phoneUserCards');
    if (!wrap) return;
    var people = D.getMatches(state.lang, state.city, 4);
    wrap.innerHTML = people.map(function (p) { return personCard(p, false); }).join('');

    var banner = $('#phoneCoffeeCount');
    if (banner) {
      var n = people.filter(function (p) { return p.coffee; }).length;
      var lang = D.getLanguage(state.lang);
      banner.textContent = n + ' ' + lang.label.replace(/^\S+\s/, '') + ' speaker' + (n === 1 ? '' : 's') + ' free nearby';
    }
  }

  /* ---------------------------------------------------------------- demo */

  function fillSelects() {
    var ls = $('#demoLang'), cs = $('#demoCity');
    if (ls) {
      var order = ['sa', 'mena', 'africa', 'asia', 'eu'];
      ls.innerHTML = order.map(function (tier) {
        var items = D.LANGUAGES.filter(function (l) { return l.tier === tier; });
        return '<optgroup label="' + esc(D.TIER_LABELS[tier]) + '">' +
          items.map(function (l) {
            return '<option value="' + l.code + '">' + esc(l.label + '  ' + l.native) + '</option>';
          }).join('') + '</optgroup>';
      }).join('');
      ls.value = state.lang;
    }
    if (cs) {
      cs.innerHTML = D.CITIES.map(function (c) {
        return '<option value="' + c.code + '">' + esc(c.label + ' · ' + c.district) + '</option>';
      }).join('');
      cs.value = state.city;
    }
  }

  function renderMap(people) {
    var pins = $('#mapPins');
    if (!pins) return;
    pins.innerHTML = people.map(function (p, i) {
      return '<span class="map-pin' + (p.coffee ? ' coffee-mode' : '') + '" ' +
        'style="left:' + p.x.toFixed(1) + '%;top:' + p.y.toFixed(1) + '%;animation-delay:' + (i * 0.08).toFixed(2) + 's" ' +
        'tabindex="0" role="img" aria-label="' + esc(p.name + ', ' + p.dist + ' away') + '">' +
        '<span class="map-pin-label">' + esc(p.name + ' · ' + p.dist) + '</span></span>';
    }).join('');
  }

  function renderDemo() {
    var results = $('#demoResult');
    if (!results) return;

    var lang = D.getLanguage(state.lang);
    var city = D.getCity(state.city);
    var people = D.getMatches(state.lang, state.city, 7);

    $('#resultLang').textContent = lang.label;
    $('#resultCity').textContent = city.label;

    var total = $('#resultTotal');
    if (total) total.textContent = D.estimateNearby(state.lang, state.city).toLocaleString();

    $('#resultCards').innerHTML = people.slice(0, 4).map(function (p) { return personCard(p, true); }).join('');

    var you = $('#youLabel');
    if (you) you.textContent = 'You · ' + city.label.replace(/^\S+\s/, '') + ' ' + city.district;

    renderMap(people);
    results.classList.remove('hidden');
  }

  function initDemo() {
    fillSelects();
    var ls = $('#demoLang'), cs = $('#demoCity'), btn = $('#demoSearch');
    if (ls) ls.addEventListener('change', function () { applyLanguage(ls.value); });
    if (cs) cs.addEventListener('change', function () {
      state.city = cs.value;
      Core.storage.set('samo.city', state.city);
      renderPhoneCards();
      renderDemo();
    });
    if (btn) btn.addEventListener('click', renderDemo);
    renderDemo();
  }

  /* ------------------------------------------------------------- pricing */

  function renderPricing() {
    var grid = $('#pricingCards');
    if (!grid) return;

    grid.innerHTML = D.PRICING.map(function (p, i) {
      var price = state.cycle === 'monthly' ? p.monthly : p.yearly;
      var suffix = p.monthly === 0 ? '' : (state.cycle === 'monthly' ? '/month' : '/year');
      var display = p.monthly === 0 ? 'Free' : '€' + price.toFixed(price % 1 === 0 ? 0 : 2);

      return '<div class="pricing-card animate-on-scroll' + (p.featured ? ' featured' : '') +
        '" style="--delay:' + (i * 0.08).toFixed(2) + 's">' +
        (p.featured ? '<span class="pricing-badge">Most chosen</span>' : '') +
        '<h3 class="text-lg font-bold text-samo-teal">' + esc(p.name) + '</h3>' +
        '<p class="text-sm text-samo-text-muted mt-1 mb-5">' + esc(p.tagline) + '</p>' +
        '<div class="flex items-baseline gap-1 mb-6">' +
        '<span class="text-4xl font-extrabold text-samo-teal">' + display + '</span>' +
        '<span class="text-sm text-samo-text-muted">' + suffix + '</span></div>' +
        '<ul class="space-y-3 mb-8 flex-1">' +
        p.features.map(function (f) {
          return '<li class="flex items-start gap-2 text-sm text-samo-text">' +
            '<span class="text-samo-terracotta mt-0.5 flex-shrink-0">' + icon('check', 16) + '</span>' +
            '<span>' + esc(f) + '</span></li>';
        }).join('') + '</ul>' +
        '<a href="' + Core.url('signup.html') + '" class="' + (p.featured ? 'btn-primary' : 'btn-secondary') +
        ' w-full py-3 rounded-full text-center text-sm font-semibold block">' + esc(p.cta) + '</a>' +
        '</div>';
    }).join('');

    if (observer) $$('.animate-on-scroll', grid).forEach(function (el) { observer.observe(el); });
  }

  function initPricingToggle() {
    $$('.pricing-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.cycle = btn.dataset.cycle;
        $$('.pricing-toggle-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
        renderPricing();
      });
    });
  }

  /* -------------------------------------------------------- testimonials */

  function renderTestimonials() {
    var grid = $('#testimonialCards');
    if (!grid) return;
    if (!D.DEMO_MODE) { grid.closest('section').style.display = 'none'; return; }

    grid.innerHTML = D.TESTIMONIALS.map(function (t, i) {
      return '<figure class="testimonial-card animate-on-scroll" style="--delay:' + (i * 0.07).toFixed(2) + 's">' +
        '<blockquote class="testimonial-quote"><span>' + esc(t.quote) + '</span></blockquote>' +
        '<figcaption class="testimonial-author">' +
        '<div class="testimonial-avatar">' + esc(t.name.slice(0, 1)) + '</div>' +
        '<div><div class="testimonial-name">' + esc(t.name) + '</div>' +
        '<div class="testimonial-role">' + esc(t.role) + '</div></div>' +
        '<span class="ms-auto text-sm text-samo-text-muted">' + esc(t.lang) + '</span>' +
        '</figcaption></figure>';
    }).join('');
  }

  /* ----------------------------------------------------------------- FAQ */

  function renderFaq() {
    var list = $('#faqList');
    if (!list) return;

    list.innerHTML = D.FAQ.map(function (f, i) {
      return '<div class="faq-item animate-on-scroll" style="--delay:' + (i * 0.05).toFixed(2) + 's">' +
        '<button class="faq-question" aria-expanded="false" aria-controls="faq-a-' + i + '" id="faq-q-' + i + '">' +
        '<span>' + esc(f.q) + '</span>' + icon('chevron', 20) + '</button>' +
        '<div class="faq-answer" id="faq-a-' + i + '" role="region" aria-labelledby="faq-q-' + i + '">' +
        '<p>' + esc(f.a) + '</p></div></div>';
    }).join('');

    list.addEventListener('click', function (e) {
      var q = e.target.closest('.faq-question');
      if (!q) return;
      var item = q.parentElement;
      var answer = item.querySelector('.faq-answer');
      var open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', String(open));
      answer.style.maxHeight = open ? answer.scrollHeight + 40 + 'px' : '0px';
    });
  }

  /* ------------------------------------------------------------ waitlist */

  function initWaitlist() {
    var form = $('#waitlistForm');
    if (!form) return;

    var input = $('#email');
    var langField = $('#waitlistLang');

    if (langField) {
      langField.innerHTML = '<option value="">Which language do you want to hear? (optional)</option>' +
        D.LANGUAGES.map(function (l) {
          return '<option value="' + l.code + '">' + esc(l.label + '  ' + l.native) + '</option>';
        }).join('') + '<option value="other">Not listed — I will tell you</option>';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      if (!Backend.Validate.email(value)) {
        input.setAttribute('aria-invalid', 'true');
        Core.toast('That email does not look right', 'Check the address and try again.', 'warn');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');

      var endpoint = Core.CFG.FORM_ENDPOINT;
      var payload = { email: value, language: langField ? langField.value : '', city: state.city };

      var done = function () {
        form.reset();
        Core.toast('You are on the list', 'We will email you when your city and language open.');
      };

      if (endpoint) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        }).then(done).catch(function () {
          Core.toast('That did not send', 'Check your connection and try again in a moment.', 'warn');
        });
      } else {
        var saved = Core.storage.json('samo.waitlist', []);
        saved.push(payload);
        Core.storage.setJson('samo.waitlist', saved);
        done();
      }
    });
  }

  /* ------------------------------------------------------------- reveal */

  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.animate-on-scroll').forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.animate-on-scroll').forEach(function (el) { observer.observe(el); });
  }

  function initParticles() {
    var host = $('#particles');
    if (!host) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var colors = ['#E07A5F', '#3D405B', '#F2CC8F'];
    var html = '';
    for (var i = 0; i < 16; i++) {
      var size = 8 + Math.random() * 26;
      html += '<span class="particle" style="width:' + size + 'px;height:' + size + 'px;left:' +
        (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;background:' +
        colors[i % 3] + ';animation-delay:' + (Math.random() * 8).toFixed(1) + 's;animation-duration:' +
        (7 + Math.random() * 6).toFixed(1) + 's"></span>';
    }
    host.innerHTML = html;
  }

  function initCounters() {
    var live = $('#liveCount');
    if (!live) return;
    if (!D.DEMO_MODE) { live.style.display = 'none'; return; }

    var base = D.estimateNearby(state.lang, state.city) * 4;
    var render = function (n) { live.textContent = n.toLocaleString() + ' nearby now'; };
    render(base);
    setInterval(function () {
      base += Math.round((Math.random() - 0.35) * 6);
      if (base < 100) base = 100;
      render(base);
    }, 4000);
  }

  /* ---------------------------------------------------------------- boot */

  Core.boot({}).then(function (ctx) {
    /* Send signed-in visitors straight into the app from the hero buttons. */
    if (ctx.user) {
      $$('[data-signed-out-cta]').forEach(function (a) {
        a.href = Core.url('discover.html');
        a.textContent = 'Go to Discover';
      });
    }
    renderLanguageGrid();
    renderFeatures();
    initDemo();
    initPricingToggle();
    renderPricing();
    renderTestimonials();
    renderFaq();
    initWaitlist();
    initParticles();
    initCounters();
    applyLanguage(state.lang);
    initReveal();
  }).catch(function () {});
})();
