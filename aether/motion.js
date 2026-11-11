'use strict';

// Shared presentation motion only. Never advances game state, consumes gameplay
// RNG, or runs a permanent JavaScript animation loop.
window.AetherMotion = (() => {
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const revealed = new WeakSet(), waking = new WeakSet(), tilting = new WeakSet();
  const scoreTimes = new WeakMap();
  let initialised = false, revealObserver, routeTimer, tilt = null, tiltFrame = 0;
  let chapter = 'The celestial cabinet';

  const reduced = () => motionQuery.matches;
  function travel(nextChapter) {
    if (reduced() || !document.body) return;
    clearTimeout(routeTimer);
    document.querySelector('.aether-route')?.remove();
    const next = nextChapter || document.querySelector('#breadcrumb-current')?.textContent || 'The Grand Tour';
    const previous = chapter;
    chapter = next;
    const curtain = document.createElement('div');
    curtain.className = 'aether-route book-route';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML = `<div class="route-book" role="presentation"><div class="route-book-spread"><section class="route-page route-page-left"><span class="route-folio">THE OBSERVER’S ATLAS</span><h2>${previous}</h2><p>Every observation leaves a mark.</p><i>✧</i></section><section class="route-page route-page-right"><span class="route-folio">THE NEXT CHAPTER</span><h2>${next}</h2><p>Turn the page. Continue the expedition.</p><i>✦</i></section><div class="route-page-turn"><div class="route-turn-front"><span>Æ</span><small>THE CELESTIAL CABINET</small></div><div class="route-turn-back"><span>✧</span><small>PER ASPERA AD ASTRA</small></div></div></div></div>`;
    document.body.append(curtain);
    routeTimer = setTimeout(() => curtain.remove(), 1150);
  }

  function wake(canvas) {
    if (reduced() || waking.has(canvas) || !canvas.isConnected) return;
    waking.add(canvas);
    const frame = canvas.closest('.instrument-stage, .game-screen, .trial-frame, .tour-hunt-frame, .starforge-shell, .df-board-frame, .room-play, .world-stage, .orchestra-stage, .history-stage, .signal-stage, .darkroom-stage') || canvas.parentElement;
    if (!frame) return;
    frame.classList.add('instrument-wake');
    const line = document.createElement('span');
    line.className = 'instrument-wake-line'; line.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
    frame.append(line);
    setTimeout(() => { frame.classList.remove('instrument-wake'); line.remove(); }, 980);
  }

  function reveal(element) {
    if (revealed.has(element)) return;
    revealed.add(element);
    if (reduced() || element.getBoundingClientRect().top < innerHeight * .9) return;
    element.classList.add('motion-reveal');
    revealObserver?.observe(element);
  }

  function score(element) {
    if (reduced()) return;
    const now = performance.now(), previous = scoreTimes.get(element) || 0;
    if (now - previous < 140) return;
    scoreTimes.set(element, now);
    element.classList.remove('motion-score');
    void element.offsetWidth;
    element.classList.add('motion-score');
  }

  function decorate(root = document) {
    if (root.matches?.('.view-enter')) [...root.children].forEach((child, index) => child.style.setProperty('--motion-order', Math.min(index, 7)));
    root.querySelectorAll('.view-enter').forEach(view => {
      [...view.children].forEach((child, index) => child.style.setProperty('--motion-order', Math.min(index, 7)));
    });
    root.querySelectorAll('canvas').forEach(wake);
    if (root.matches?.('.atlas-card, .destination-card, .cartridge-choice, .journal-card, .collection-card, .room-card, .research-card, .atlas-features article, .experience, .manifesto, .statbar .stat, .reveal')) reveal(root);
    if (root.matches?.('.hero-engraving, .landing-engraving, .cartridge-card, .destination-card') && !tilting.has(root)) { tilting.add(root); root.classList.add('motion-tilt'); }
    root.querySelectorAll('.atlas-card, .destination-card, .cartridge-choice, .journal-card, .collection-card, .room-card, .research-card, .atlas-features article, .experience, .manifesto, .statbar .stat, .reveal').forEach((element, index) => {
      element.style.setProperty('--motion-delay', `${(index % 4) * 45}ms`);
      reveal(element);
    });
    root.querySelectorAll('.hero-engraving, .landing-engraving, .cartridge-card, .destination-card').forEach(element => {
      if (!tilting.has(element)) { tilting.add(element); element.classList.add('motion-tilt'); }
    });
    root.querySelectorAll('#game-score, #game-best, .cartridge-record strong, [data-stardust], .tour-dust, #starforge-energy, #starforge-heat, .df-hud strong').forEach(element => {
      if (!scoreTimes.has(element)) scoreTimes.set(element, performance.now() - 200);
    });
  }

  function resetTilt() {
    if (!tilt) return;
    tilt.element.style.setProperty('--tilt-x', '0deg');
    tilt.element.style.setProperty('--tilt-y', '0deg');
    tilt.element.style.setProperty('--lift', '0px');
    tilt.element.classList.remove('is-tilting');
    tilt = null;
  }

  function onTilt(event) {
    if (reduced() || !finePointer.matches || event.pointerType === 'touch') { resetTilt(); return; }
    const element = event.target.closest?.('.motion-tilt');
    if (!element) { resetTilt(); return; }
    if (tilt?.element !== element) {
      resetTilt();
      tilt = { element, rect: element.getBoundingClientRect() };
      element.classList.add('is-tilting');
    }
    const { rect } = tilt;
    if (!rect.width || !rect.height) return;
    const x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
    const y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
    element.style.setProperty('--tilt-x', `${(-y * 1.5).toFixed(2)}deg`);
    element.style.setProperty('--tilt-y', `${(x * 1.7).toFixed(2)}deg`);
    element.style.setProperty('--lift', '-3px');
  }

  function init() {
    if (initialised) return;
    initialised = true;
    if (!reduced()) {
      const ambience = document.createElement('div');
      ambience.className = 'aether-ambience'; ambience.setAttribute('aria-hidden', 'true');
      document.body.prepend(ambience);
    }
    revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-seen');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: .08, rootMargin: '0px 0px -4% 0px' }) : null;
    decorate(document);

    const main = document.querySelector('main');
    if (main) new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches('canvas')) wake(node);
          if (node.matches('#game-score, #game-best, .cartridge-record strong, [data-stardust], .tour-dust, #starforge-energy, #starforge-heat, .df-hud strong')) score(node);
          decorate(node.matches?.('canvas') ? node.parentElement : node);
        }
        if (record.type === 'childList' && record.target.matches?.('#game-score, #game-best, .cartridge-record strong, [data-stardust], .tour-dust, #starforge-energy, #starforge-heat, .df-hud strong') && record.addedNodes.length) score(record.target);
        if (record.type === 'characterData') {
          const element = record.target.parentElement;
          if (element?.matches('#game-score, #game-best, .cartridge-record strong, [data-stardust], .tour-dust, #starforge-energy, #starforge-heat, .df-hud strong')) score(element);
        }
      }
    }).observe(main, { childList: true, subtree: true, characterData: true });

    document.addEventListener('pointermove', event => {
      if (tiltFrame) return;
      tiltFrame = requestAnimationFrame(() => { tiltFrame = 0; onTilt(event); });
    }, { passive: true });
    document.addEventListener('pointerout', event => {
      if (tilt && !tilt.element.contains(event.relatedTarget)) resetTilt();
    }, { passive: true });
    document.addEventListener('click', event => {
      const filter = event.target.closest?.('[data-cabinet-filter]');
      if (!filter || reduced()) return;
      requestAnimationFrame(() => document.querySelectorAll('[data-cabinet-family]:not([hidden])').forEach((element, index) => {
        element.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: index * 45, fill: 'both', easing: 'cubic-bezier(.2,.75,.25,1)' });
      }));
    });
    document.addEventListener('visibilitychange', () => {
      document.body.classList.toggle('motion-hidden', document.hidden);
      if (document.hidden) resetTilt();
    });
    motionQuery.addEventListener('change', () => {
      resetTilt();
      document.querySelectorAll('.motion-reveal').forEach(element => { if (reduced()) element.classList.remove('motion-reveal'); });
      document.querySelector('.aether-ambience')?.remove();
      if (!reduced()) {
        const ambience = document.createElement('div'); ambience.className = 'aether-ambience'; ambience.setAttribute('aria-hidden', 'true'); document.body.prepend(ambience);
      }
    });
    travel();
  }

  return { init, travel, decorate };
})();

window.AetherMotion.init();
