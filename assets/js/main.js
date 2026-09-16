/* ==========================================================================
   HONO INK · main.js
   Sem dependências. Tudo por IntersectionObserver ou eventos do próprio
   container; nenhum listener de scroll global medindo layout.
   Módulos: reveal · header · menu · carrossel · FAQ · ano.
   ========================================================================== */
document.documentElement.classList.add('js');

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. REVEAL ------------------------------------------------- */
  (function reveal() {
    var els = $$('[data-reveal]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (e) { e.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  })();

  /* ---------- 2. HEADER: fundo ao rolar + tema papel/noite + FAB -------- */
  (function header() {
    var head = $('[data-header]');
    var night = $('.night');
    if (!head || !night) return;

    // Sentinela no topo: enquanto visível, header fica transparente.
    var top = document.createElement('div');
    top.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none';
    document.body.prepend(top);
    new IntersectionObserver(function (en) {
      head.classList.toggle('is-scrolled', !en[0].isIntersecting);
    }, { rootMargin: '24px 0px 0px 0px' }).observe(top);

    // rootMargin -100% embaixo reduz a área de teste à linha do topo do
    // viewport: o bloco noturno "intersecta" enquanto ainda passa sob o header.
    new IntersectionObserver(function (en) {
      head.classList.toggle('on-paper', !en[0].isIntersecting);
    }, { rootMargin: '0px 0px -100% 0px', threshold: 0 }).observe(night);

    // FAB aparece depois que os CTAs do hero sobem para fora da tela.
    var fab = $('[data-fab]');
    var actions = $('.hero-actions');
    if (fab && actions) {
      new IntersectionObserver(function (en) {
        fab.classList.toggle('is-visible', !en[0].isIntersecting && en[0].boundingClientRect.top < 0);
      }, { threshold: 0 }).observe(actions);
    }
  })();

  /* ---------- 2b. VÍDEO DO HERO: carrega depois do load, pausa fora de cena */
  (function heroVideo() {
    var wrap = $('[data-hero-video]');
    var video = wrap && $('video', wrap);
    if (!video) return;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData) return;               // fica só o poster

    var loaded = false;
    function load() {
      if (loaded) return;
      loaded = true;
      // Celular em pé recebe o corte 9:16 (mais leve, mesmo enquadramento que o CSS faria)
      var portrait = window.matchMedia('(orientation: portrait) and (max-width: 47.99em)').matches;
      video.src = (portrait && video.getAttribute('data-src-mobile')) || video.getAttribute('data-src');
      video.addEventListener('playing', function () { wrap.classList.add('is-playing'); }, { once: true });
      video.play().catch(function () {});          // autoplay bloqueado: poster segue no lugar
    }
    if (document.readyState === 'complete') load();
    else window.addEventListener('load', load, { once: true });

    new IntersectionObserver(function (en) {
      if (!loaded) return;
      if (en[0].isIntersecting) video.play().catch(function () {});
      else video.pause();
    }, { threshold: 0.05 }).observe(wrap);
  })();

  /* ---------- 3. MENU MOBILE -------------------------------------------- */
  (function menu() {
    var btn = $('[data-menu-toggle]');
    var panel = $('[data-menu]');
    if (!btn || !panel) return;
    var label = $('.sr-only', btn);
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      panel.hidden = false;
      void panel.offsetWidth; // reflow: garante que a transição parta do estado fechado
      panel.classList.add('is-open');
      document.body.classList.add('menu-open');
      btn.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Fechar menu';
    }
    function close() {
      if (btn.getAttribute('aria-expanded') !== 'true') return;
      panel.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Abrir menu';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    btn.addEventListener('click', function () {
      btn.getAttribute('aria-expanded') === 'true' ? close() : open();
    });
    $$('[data-menu-link]', panel).forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.matchMedia('(min-width: 64em)').addEventListener('change', function (m) { if (m.matches) close(); });
  })();

  /* ---------- 4. CARROSSEL: setas, contador, teclado, arrasto ----------- */
  (function carousel() {
    var root = $('[data-carousel]');
    if (!root) return;
    var track = $('[data-carousel-track]', root);
    var items = $$('.carousel-item', track);
    var prev = $('[data-carousel-prev]');
    var next = $('[data-carousel-next]');
    var cur = $('[data-carousel-current]');
    var tot = $('[data-carousel-total]');
    if (!track || !items.length) return;
    if (tot) tot.textContent = String(items.length);

    var index = 0;
    var behavior = reduce ? 'auto' : 'smooth';

    function step() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return items[0].offsetWidth + gap;
    }
    function goTo(i) {
      index = Math.max(0, Math.min(i, items.length - 1));
      track.scrollTo({ left: index * step(), behavior: behavior });
    }
    function sync() {
      index = Math.max(0, Math.min(Math.round(track.scrollLeft / step()), items.length - 1));
      if (cur) cur.textContent = String(index + 1);
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = atEnd;
    }

    if (prev) prev.addEventListener('click', function () { goTo(index - 1); });
    if (next) next.addEventListener('click', function () { goTo(index + 1); });

    // Scroll do container, não da janela: barato, e é o que alimenta o contador.
    var raf = 0;
    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; sync(); });
    }, { passive: true });
    window.addEventListener('resize', sync);

    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-label', 'Portfólio. Use as setas do teclado para navegar.');
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    });

    // Arrasto com mouse; no toque o scroll nativo já resolve.
    var drag = { on: false, x: 0, left: 0, moved: false };
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      drag.on = true; drag.moved = false; drag.x = e.clientX; drag.left = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', function (e) {
      if (!drag.on) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      track.scrollLeft = drag.left - dx;
    });
    function endDrag() {
      if (!drag.on) return;
      drag.on = false;
      track.classList.remove('is-dragging');
      goTo(Math.round(track.scrollLeft / step()));
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('click', function (e) {
      if (drag.moved) { e.preventDefault(); drag.moved = false; }
    }, true);

    sync();
  })();

  /* ---------- 5. FAQ: um aberto por vez ---------------------------------- */
  (function faq() {
    var list = $('[data-faq]');
    if (!list) return;
    list.addEventListener('toggle', function (e) {
      if (!e.target.open) return;
      $$('details[open]', list).forEach(function (d) { if (d !== e.target) d.open = false; });
    }, true);
  })();

  /* ---------- 6. ANO NO RODAPÉ ------------------------------------------ */
  var y = $('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
