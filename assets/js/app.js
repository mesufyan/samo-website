/* ==========================================================================
   SAMO — Application logic
   No build step, no framework. Runs from any path, including a GitHub Pages
   project subfolder.
   ========================================================================== */

(function () {
  'use strict';

  var D = window.SAMO;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* Storage is wrapped: some embedded previews block it. */
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* no-op */ } }
  };

  var state = {
    lang: store.get('samo.lang') || 'ur',
    city: store.get('samo.city') || 'berlin',
    cycle: 'monthly'
  };

  /* ---------------------------------------------------------------- icons */
  var ICONS = {
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    script: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'
  };

  function icon(name, size, cls) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'class="' + (cls || '') + '" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ============================================================ navigation */
  function initNav() {
    var nav = $('#navbar');
    var onScroll = function () {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var toggle = $('#mobileMenuBtn');
    var menu = $('#mobileMenu');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('hidden') === false;
        toggle.setAttribute('aria-expanded', String(open));
      });
      $$('a', menu).forEach(function (a) {
        a.addEventListener('click', function () {
          menu.classList.add('hidden');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* ====================================================== language selector */
  function applyLanguage(code) {
    state.lang = code;
    store.set('samo.lang', code);
    var lang = D.getLanguage(code);

    var label = $('#langLabel');
    if (label) label.textContent = lang.label;

    var pill = $('#phoneLangFilter');
    if (pill) pill.textContent = lang.label;

    // Native tagline + CTA where a translation exists
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

    // Highlight in the directory grid
    $$('.lang-chip').forEach(function (chip) {
      chip.classList.toggle('selected', chip.dataset.lang === code);
      chip.setAttribute('aria-pressed', String(chip.dataset.lang === code));
    });

    var sel = $('#demoLang');
    if (sel && sel.value !== code) sel.value = code;

    renderPhoneCards();
    renderDemo(false);
  }

  function initLangMenu() {
    var btn = $('#langBtn');
    var menu = $('#langMenu');
    if (!btn || !menu) return;

    menu.innerHTML = D.LANGUAGES.map(function (l) {
      return '<li role="option" aria-selected="false">' +
        '<button class="w-full text-start px-4 py-2 text-sm hover:bg-samo-cream/20 flex items-center justify-between gap-3" data-lang="' + l.code + '">' +
        '<span>' + esc(l.label) + '</span>' +
        '<span class="text-xs text-samo-text-muted"' + (l.rtl ? ' dir="rtl"' : '') + '>' + esc(l.native) + '</span>' +
        '</button></li>';
    }).join('');

    var close = function () {
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle('hidden') === false;
      btn.setAttribute('aria-expanded', String(open));
    });

    menu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lang]');
      if (!b) return;
      applyLanguage(b.dataset.lang);
      close();
    });

    document.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ==================================================== language directory */
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
        }).join('') +
        '</div></div>';
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

  /* ============================================================== features */
  function renderFeatures() {
    var grid = $('#featuresGrid');
    if (!grid) return;
    grid.innerHTML = D.FEATURES.map(function (f, i) {
      return '<article class="feature-card animate-on-scroll" style="--delay:' + (i * .07).toFixed(2) + 's">' +
        '<div class="feature-icon">' + icon(f.icon, 22) + '</div>' +
        '<h3 class="text-lg font-bold text-samo-teal mb-2">' + esc(f.title) + '</h3>' +
        '<p class="text-sm leading-relaxed text-samo-text-muted">' + esc(f.body) + '</p>' +
        '</article>';
    }).join('');
  }

  /* ========================================================= phone mockup */
  function personCard(p, dark) {
    return '<div class="user-card' + (dark ? ' user-card--dark' : '') + '" style="animation-delay:' + (Math.random() * .3).toFixed(2) + 's">' +
      '<div class="user-avatar">' + esc(p.initials) + '</div>' +
      '<div class="user-info">' +
      '<div class="user-name-row">' +
      '<span class="user-name">' + esc(p.name) + '</span>' +
      (p.verified ? '<span class="text-samo-terracotta" title="Verified">' + icon('shield', 14) + '</span>' : '') +
      '<span class="user-distance">' + esc(p.dist) + '</span>' +
      '</div>' +
      '<p class="user-bio">' + esc(p.role + ' · ' + p.tenure) + '</p>' +
      '</div>' +
      '<span class="user-status' + (p.coffee ? ' coffee' : '') + '">' + esc(p.status) + '</span>' +
      '</div>';
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

  /* ============================================================= live demo */
  function fillSelects() {
    var ls = $('#demoLang');
    var cs = $('#demoCity');
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
        'style="left:' + p.x.toFixed(1) + '%;top:' + p.y.toFixed(1) + '%;animation-delay:' + (i * .08).toFixed(2) + 's" ' +
        'tabindex="0" role="img" aria-label="' + esc(p.name + ', ' + p.dist + ' away') + '">' +
        '<span class="map-pin-label">' + esc(p.name + ' · ' + p.dist) + '</span>' +
        '</span>';
    }).join('');
  }

  function renderDemo(announce) {
    var results = $('#demoResult');
    if (!results) return;

    var lang = D.getLanguage(state.lang);
    var city = D.getCity(state.city);
    var people = D.getMatches(state.lang, state.city, 7);

    $('#resultLang').textContent = lang.label;
    $('#resultCity').textContent = city.label;

    var totalEl = $('#resultTotal');
    if (totalEl) totalEl.textContent = D.estimateNearby(state.lang, state.city).toLocaleString();

    $('#resultCards').innerHTML = people.slice(0, 4).map(function (p) {
      return personCard(p, true);
    }).join('');

    var youLabel = $('#youLabel');
    if (youLabel) youLabel.textContent = 'You · ' + city.label.replace(/^\S+\s/, '') + ' ' + city.district;

    renderMap(people);
    results.classList.remove('hidden');
    if (announce) results.setAttribute('aria-busy', 'false');
  }

  function initDemo() {
    fillSelects();
    var ls = $('#demoLang');
    var cs = $('#demoCity');
    var btn = $('#demoSearch');

    if (ls) ls.addEventListener('change', function () { applyLanguage(ls.value); });
    if (cs) cs.addEventListener('change', function () {
      state.city = cs.value;
      store.set('samo.city', state.city);
      renderPhoneCards();
      renderDemo(false);
    });
    if (btn) btn.addEventListener('click', function () { renderDemo(true); });

    renderDemo(false);
  }

  /* =============================================================== pricing */
  function renderPricing() {
    var grid = $('#pricingCards');
    if (!grid) return;

    grid.innerHTML = D.PRICING.map(function (p, i) {
      var price = state.cycle === 'monthly' ? p.monthly : p.yearly;
      var suffix = p.monthly === 0 ? '' : (state.cycle === 'monthly' ? '/month' : '/year');
      var display = p.monthly === 0 ? 'Free' : '€' + price.toFixed(price % 1 === 0 ? 0 : 2);

      return '<div class="pricing-card animate-on-scroll' + (p.featured ? ' featured' : '') + '" style="--delay:' + (i * .08).toFixed(2) + 's">' +
        (p.featured ? '<span class="pricing-badge">Most chosen</span>' : '') +
        '<h3 class="text-lg font-bold text-samo-teal">' + esc(p.name) + '</h3>' +
        '<p class="text-sm text-samo-text-muted mt-1 mb-5">' + esc(p.tagline) + '</p>' +
        '<div class="flex items-baseline gap-1 mb-6">' +
        '<span class="text-4xl font-extrabold text-samo-teal">' + display + '</span>' +
        '<span class="text-sm text-samo-text-muted">' + suffix + '</span>' +
        '</div>' +
        '<ul class="space-y-3 mb-8 flex-1">' +
        p.features.map(function (f) {
          return '<li class="flex items-start gap-2 text-sm text-samo-text">' +
            '<span class="text-samo-terracotta mt-0.5 flex-shrink-0">' + icon('check', 16) + '</span>' +
            '<span>' + esc(f) + '</span></li>';
        }).join('') +
        '</ul>' +
        '<a href="#waitlist" class="' + (p.featured ? 'btn-primary' : 'btn-secondary') + ' w-full py-3 rounded-full text-center text-sm font-semibold block">' + esc(p.cta) + '</a>' +
        '</div>';
    }).join('');

    if (observer) revealNow(grid);
  }

  function initPricingToggle() {
    $$('.pricing-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.cycle = btn.dataset.cycle;
        $$('.pricing-toggle-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        renderPricing();
      });
    });
  }

  /* ========================================================== testimonials */
  function renderTestimonials() {
    var grid = $('#testimonialCards');
    if (!grid) return;
    if (!D.DEMO_MODE) { grid.closest('section').style.display = 'none'; return; }

    grid.innerHTML = D.TESTIMONIALS.map(function (t, i) {
      return '<figure class="testimonial-card animate-on-scroll" style="--delay:' + (i * .07).toFixed(2) + 's">' +
        '<blockquote class="testimonial-quote"><span>' + esc(t.quote) + '</span></blockquote>' +
        '<figcaption class="testimonial-author">' +
        '<div class="testimonial-avatar">' + esc(t.name.slice(0, 1)) + '</div>' +
        '<div><div class="testimonial-name">' + esc(t.name) + '</div>' +
        '<div class="testimonial-role">' + esc(t.role) + '</div></div>' +
        '<span class="ms-auto text-sm text-samo-text-muted">' + esc(t.lang) + '</span>' +
        '</figcaption></figure>';
    }).join('');
  }

  /* =================================================================== FAQ */
  function renderFaq() {
    var list = $('#faqList');
    if (!list) return;

    list.innerHTML = D.FAQ.map(function (f, i) {
      return '<div class="faq-item animate-on-scroll" style="--delay:' + (i * .05).toFixed(2) + 's">' +
        '<button class="faq-question" aria-expanded="false" aria-controls="faq-a-' + i + '" id="faq-q-' + i + '">' +
        '<span>' + esc(f.q) + '</span>' + icon('chevron', 20) +
        '</button>' +
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

  /* ============================================================== waitlist */
  function showToast(title, msg) {
    var toast = $('#toast');
    if (!toast) return;
    $('#toastTitle').textContent = title;
    $('#toastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 5200);
  }

  function initWaitlist() {
    var form = $('#waitlistForm');
    if (!form) return;

    var input = $('#email');
    var langField = $('#waitlistLang');

    if (langField) {
      langField.innerHTML = '<option value="">Which language do you want to hear? (optional)</option>' +
        D.LANGUAGES.map(function (l) {
          return '<option value="' + l.code + '">' + esc(l.label + '  ' + l.native) + '</option>';
        }).join('') +
        '<option value="other">Not listed — I will tell you</option>';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

      if (!valid) {
        input.classList.add('field-error');
        input.setAttribute('aria-invalid', 'true');
        showToast('That email does not look right', 'Check the address and try again.');
        input.focus();
        return;
      }

      input.classList.remove('field-error');
      input.removeAttribute('aria-invalid');

      /* Where to send it:
         Set FORM_ENDPOINT in the config below to a Formspree, Buttondown,
         Google Form or your own endpoint. Left empty, entries are kept in
         the browser only, which is fine for a demo build. */
      var endpoint = window.SAMO_CONFIG && window.SAMO_CONFIG.FORM_ENDPOINT;
      var payload = { email: value, language: langField ? langField.value : '', city: state.city };

      var done = function () {
        form.reset();
        showToast('You are on the list', 'We will email you when your city and language open.');
      };

      if (endpoint) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        }).then(done).catch(function () {
          showToast('That did not send', 'Check your connection and try again in a moment.');
        });
      } else {
        var saved = [];
        try { saved = JSON.parse(store.get('samo.waitlist') || '[]'); } catch (err) { saved = []; }
        saved.push(payload);
        store.set('samo.waitlist', JSON.stringify(saved));
        done();
      }
    });

    var dismiss = $('#toastDismiss');
    if (dismiss) dismiss.addEventListener('click', function () { $('#toast').classList.remove('show'); });
  }

  /* ========================================================== scroll reveal */
  var observer = null;
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

  function revealNow(root) {
    $$('.animate-on-scroll', root).forEach(function (el) {
      if (observer) observer.observe(el); else el.classList.add('visible');
    });
  }

  /* ============================================================= particles */
  function initParticles() {
    var host = $('#particles');
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var colors = ['#E07A5F', '#3D405B', '#F2CC8F'];
    var html = '';
    for (var i = 0; i < 16; i++) {
      var size = 8 + Math.random() * 26;
      html += '<span class="particle" style="' +
        'width:' + size + 'px;height:' + size + 'px;' +
        'left:' + (Math.random() * 100).toFixed(1) + '%;' +
        'top:' + (Math.random() * 100).toFixed(1) + '%;' +
        'background:' + colors[i % 3] + ';' +
        'animation-delay:' + (Math.random() * 8).toFixed(1) + 's;' +
        'animation-duration:' + (7 + Math.random() * 6).toFixed(1) + 's"></span>';
    }
    host.innerHTML = html;
  }

  /* ========================================================= demo counters */
  function initCounters() {
    if (!D.DEMO_MODE) {
      $$('[data-demo-stat]').forEach(function (el) { el.style.display = 'none'; });
      return;
    }
    var live = $('#liveCount');
    if (!live) return;

    var base = D.estimateNearby(state.lang, state.city) * 4;
    var render = function (n) { live.textContent = n.toLocaleString() + ' nearby now'; };
    render(base);

    setInterval(function () {
      base += Math.round((Math.random() - 0.35) * 6);
      if (base < 100) base = 100;
      render(base);
    }, 4000);
  }

  /* ============================================================ year stamp */
  function initYear() {
    var y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ================================================================== boot */
  function init() {
    initNav();
    initLangMenu();
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
    initYear();
    applyLanguage(state.lang);
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
