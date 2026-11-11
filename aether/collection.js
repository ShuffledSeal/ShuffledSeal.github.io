'use strict';

// The research collection is a working instrument, not a bookmark graveyard.
// Existing saved IDs and journal entries remain owned by app.js; this module
// keeps only ordering, study state, opened dates and short marginalia.
window.AetherCollection = (() => {
  const KEY = 'aether-research-collection-v1';
  const esc = escapeHTML;
  const types = { planet: 'World', constellation: 'Star pattern', event: 'Celestial date' };
  let filter = 'all', studyFilter = 'all', sort = 'custom', query = '', tour = null;
  const blank = () => ({ version: 1, order: [], notes: {}, opened: {}, studied: [] });
  const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  function read() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return blank();
    const valid = id => validItemIds.has(id);
    return {
      version: 1,
      order: Array.isArray(raw.order) ? [...new Set(raw.order.filter(id => typeof id === 'string' && valid(id)))].slice(0, 100) : [],
      notes: Object.fromEntries(Object.entries(raw.notes && typeof raw.notes === 'object' && !Array.isArray(raw.notes) ? raw.notes : {}).filter(([id, text]) => valid(id) && typeof text === 'string').map(([id, text]) => [id, text.slice(0, 500)])),
      opened: Object.fromEntries(Object.entries(raw.opened && typeof raw.opened === 'object' && !Array.isArray(raw.opened) ? raw.opened : {}).filter(([id, date]) => valid(id) && validDate(date))),
      studied: Array.isArray(raw.studied) ? [...new Set(raw.studied.filter(id => typeof id === 'string' && valid(id)))] : [],
    };
  }
  let archive = read();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(archive)); return true; }
    catch { toast('Your research is kept for this visit. Browser storage is unavailable.'); return false; }
  }
  const savedItems = () => {
    const saved = new Set(state.saved);
    const ordered = archive.order.filter(id => saved.has(id));
    const additions = state.saved.filter(id => !ordered.includes(id));
    return [...ordered, ...additions].map(findItem).filter(Boolean);
  };
  const notesFor = item => state.journal.filter(entry => entry.subject.toLowerCase() === item.name.toLowerCase());
  const studied = item => archive.studied.includes(item.id);
  const shownItems = () => {
    let items = savedItems().filter(item => filter === 'all' || item.kind === filter);
    if (studyFilter === 'todo') items = items.filter(item => !studied(item));
    if (studyFilter === 'done') items = items.filter(studied);
    if (query) items = items.filter(item => item.name.toLowerCase().includes(query) || (archive.notes[item.id] || '').toLowerCase().includes(query));
    if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'recent') items.sort((a, b) => (archive.opened[b.id] || '').localeCompare(archive.opened[a.id] || ''));
    return items;
  };
  function syncOrder() {
    const ids = savedItems().map(item => item.id);
    archive.order = ids;
    save();
  }
  function markOpened(id) {
    if (!validItemIds.has(id)) return;
    archive.opened[id] = new Date().toISOString();
    save();
  }
  function itemDestination(item) {
    if (item.kind === 'planet') return `planet/${item.id}`;
    if (item.kind === 'constellation') return 'planetarium';
    return 'calendar';
  }

  function researchCard(item, index) {
    const note = archive.notes[item.id] || '', linked = notesFor(item), done = studied(item), opened = archive.opened[item.id];
    const orderIndex = savedItems().findIndex(saved => saved.id === item.id);
    return `<article class="research-card" data-research-card="${item.id}" data-kind="${item.kind}" data-name="${esc(item.name.toLowerCase())}" data-studied="${done}" draggable="true">
      <header class="research-card-folio"><span>${String(index + 1).padStart(2, '0')}</span><span>${types[item.kind].toUpperCase()}</span><span class="research-state ${done ? 'done' : ''}">${done ? 'STUDIED ✓' : opened ? 'REVISIT' : 'UNOPENED'}</span></header>
      <div class="research-card-plate">${collectionVisual(item)}</div>
      <div class="research-card-copy"><h2>${esc(item.name)}</h2><p class="research-card-subtitle">${esc(item.title || item.type || types[item.kind])}</p>
      <p class="research-card-note">${note ? `“${esc(note)}”` : '<span>Add a short research cue in the margin.</span>'}</p>
      <div class="research-card-links"><span>${linked.length} linked observation${linked.length === 1 ? '' : 's'}</span>${opened ? `<span>Opened ${formatDate(new Date(opened), { day: 'numeric', month: 'short' })}</span>` : ''}</div></div>
      <footer class="research-card-actions"><button class="button button-primary" data-collection="open" data-id="${item.id}">Open research ${icon('arrow-up-right')}</button><button class="icon-button" data-collection="note" data-id="${item.id}" aria-label="Edit marginalia for ${esc(item.name)}">${icon('edit')}</button><span class="research-order"><button class="icon-button" data-collection="move" data-id="${item.id}" data-direction="-1" aria-label="Move ${esc(item.name)} earlier" ${orderIndex === 0 ? 'disabled' : ''}>←</button><button class="icon-button" data-collection="move" data-id="${item.id}" data-direction="1" aria-label="Move ${esc(item.name)} later" ${orderIndex === savedItems().length - 1 ? 'disabled' : ''}>→</button></span></footer>
    </article>`;
  }

  function renderCollection() {
    const items = savedItems(), shown = shownItems(), done = items.filter(studied).length, linked = items.reduce((sum, item) => sum + notesFor(item).length, 0);
    const firstEvent = events.find(event => event.date >= dateKey(state.selectedDate));
    return `<div class="research-collection view-enter"><section class="view-header"><div><p class="eyebrow">YOUR WORKING COLLECTION · VOLUME I</p><h1>The research cabinet.</h1><p>Arrange your reading, keep marginalia, and return to a guided study instead of losing good discoveries in a list.</p></div><div class="view-header-actions"><button class="button" data-collection="export" ${items.length ? '' : 'disabled'}>${icon('download')}Export field guide</button><button class="button button-primary" data-collection="tour" ${items.length ? '' : 'disabled'}>${icon('play')}Begin guided study</button></div></section>
      <section class="research-ledger" aria-label="Research ledger"><div><small>SAVED WORKS</small><strong>${items.length}</strong><span>across ${new Set(items.map(item => item.kind)).size} collections</span></div><div><small>STUDIED</small><strong>${done} / ${items.length}</strong><span>${items.length - done} still awaiting attention</span></div><div><small>LINKED OBSERVATIONS</small><strong>${linked}</strong><span>journal pages connected by subject</span></div><div><small>MARGINALIA</small><strong>${Object.keys(archive.notes).filter(id => state.saved.includes(id)).length}</strong><span>research cues in your own words</span></div></section>
      ${items.length ? `<section class="research-workspace"><aside class="research-index"><p class="eyebrow">THE CATALOGUE</p><h2>Find your place.</h2><label class="research-search" for="collection-search">${icon('search')}<input id="collection-search" type="search" placeholder="Search the collection" value="${esc(query)}" autocomplete="off" /></label><div class="research-filters" role="group" aria-label="Collection type">${[['all','Everything'],['planet','Worlds'],['constellation','Star patterns'],['event','Celestial dates']].map(([id,label]) => `<button data-collection="filter" data-value="${id}" aria-pressed="${filter === id}">${label}<span>${id === 'all' ? items.length : items.filter(item => item.kind === id).length}</span></button>`).join('')}</div><div class="research-study-filters" role="group" aria-label="Study status">${[['all','All works'],['todo','Still to study'],['done','Studied']].map(([id,label]) => `<button data-collection="study-filter" data-value="${id}" aria-pressed="${studyFilter === id}">${label}</button>`).join('')}</div><label class="research-sort" for="collection-sort">Arrange the shelf<select id="collection-sort"><option value="custom" ${sort === 'custom' ? 'selected' : ''}>My reading order</option><option value="name" ${sort === 'name' ? 'selected' : ''}>Title A–Z</option><option value="recent" ${sort === 'recent' ? 'selected' : ''}>Recently opened</option></select></label><div class="research-method"><p class="eyebrow">THE READING METHOD</p><ol><li>Arrange works with arrows or drag.</li><li>Open a chapter and add marginalia.</li><li>Begin guided study to read in order.</li><li>Mark chapters studied and export your guide.</li></ol><p>Journal entries link automatically when their subject matches a saved work.</p></div></aside>
      <div class="research-shelf"><header class="research-shelf-heading"><div><p class="eyebrow">THE ACTIVE SHELF</p><h2 id="research-count">${shown.length} work${shown.length === 1 ? '' : 's'} in view</h2></div><button class="text-link" data-collection="first-night">Build a first-night shelf ${icon('arrow-right')}</button></header><div class="research-grid" id="research-grid">${shown.length ? shown.map(researchCard).join('') : '<div class="research-empty"><h3>No works on this shelf.</h3><p>Change the filter, or return to the complete collection.</p><button class="button" data-collection="reset">Show everything</button></div>'}</div></div></section>` : `<section class="research-empty-state"><div class="research-empty-art">${collectionVisual({ ...planets.find(planet => planet.id === 'saturn'), kind: 'planet' })}</div><div><p class="eyebrow">THE FIRST EMPTY SHELF</p><h2>A collection becomes useful when it becomes a path.</h2><p>Save Saturn, Orion and ${firstEvent ? firstEvent.name : 'the next celestial event'} to create a guided first-night study. You can change the order and add your own notes immediately.</p><div class="modal-actions"><button class="button button-primary" data-collection="first-night">Create the first-night shelf ${icon('arrow-right')}</button><a class="button" href="#planetarium">Browse the atlas</a></div></div></section>`}
    </div>`;
  }

  function openNote(id) {
    const item = findItem(id); if (!item) return;
    showModal(`<p class="eyebrow">MARGINALIA · ${types[item.kind].toUpperCase()}</p><h2 id="modal-title">${esc(item.name)}</h2><p class="modal-description">Keep a short research cue on this card. For a full observation, write a linked journal page instead.</p><form id="marginalia-form" data-id="${id}"><div class="form-field"><label for="marginalia-text">Your note in the margin</label><textarea id="marginalia-text" maxlength="500" placeholder="Compare the rings on a steadier night…">${esc(archive.notes[id] || '')}</textarea></div><div class="modal-actions"><button type="button" class="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Keep marginalia</button></div></form>`, '#marginalia-text');
  }

  function tourMarkup() {
    const item = tour.items[tour.index], done = studied(item), linked = notesFor(item);
    return `<div class="guided-folio"><p class="eyebrow">GUIDED STUDY · CHAPTER ${tour.index + 1} OF ${tour.items.length}</p><h2 id="modal-title" tabindex="-1">${esc(item.name)}</h2><p class="modal-description guided-subtitle">${types[item.kind]} · ${esc(item.title || item.type || '')}</p><div class="modal-planet-visual">${collectionVisual(item)}</div><p class="modal-description">${esc(item.description || item.note || '')}</p>${archive.notes[item.id] ? `<p class="notice">“${esc(archive.notes[item.id])}”<small>YOUR MARGINALIA</small></p>` : ''}<p class="guided-links">${linked.length} linked journal observation${linked.length === 1 ? '' : 's'} · ${done ? 'Chapter studied' : 'Awaiting study'}</p><div class="modal-actions"><button class="button" data-collection="open-current">Open full research</button><button class="button" data-action="new-entry" data-subject="${esc(item.name)}">${icon('edit')}Write observation</button><button class="button" data-collection="note-current">${icon('bookmark')}Marginalia</button></div><div class="guided-navigation"><button class="button" data-collection="tour-prev" ${tour.index === 0 ? 'disabled' : ''}>← Previous</button><button class="button" data-collection="tour-studied">${done ? 'Mark as still to study' : 'Mark studied ✓'}</button><button class="button button-primary" data-collection="tour-next">${tour.index === tour.items.length - 1 ? 'Finish study' : 'Next chapter →'}</button></div></div>`;
  }
  function showTour() { showModal(tourMarkup(), '#modal-title'); }

  function firstNight() {
    const additions = ['saturn', 'orion'];
    const next = events.find(event => event.date >= dateKey(state.selectedDate));
    if (next) additions.push(next.id);
    state.saved = [...new Set([...state.saved, ...additions])];
    archive.order = [...archive.order, ...additions.filter(id => !archive.order.includes(id))];
    persist(); save(); filter = 'all'; studyFilter = 'all'; sort = 'custom'; render();
    toast('Your first-night research shelf is ready.');
  }

  function exportGuide() {
    const items = savedItems(); if (!items.length) return;
    const lines = ['# Æther — Personal research collection', '', `Exported ${formatDate(new Date())}. ${items.length} saved works; ${items.filter(studied).length} studied.`, ''];
    for (const item of items) {
      lines.push(`## ${item.name}`, '', `${types[item.kind]} · ${item.title || item.type || ''}`, '', item.description || item.note || '', '');
      if (archive.notes[item.id]) lines.push(`**Marginalia:** ${archive.notes[item.id]}`, '');
      const linked = notesFor(item);
      if (linked.length) {
        lines.push('### Linked observations', '');
        for (const entry of linked) lines.push(`#### ${entry.title} — ${entry.date}`, '', entry.body, '');
      }
      lines.push(`**Study status:** ${studied(item) ? 'Studied' : 'Still to study'}`, '', '---', '');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `aether-research-${dateKey(new Date())}.md`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Your field guide has been exported.');
  }

  document.addEventListener('click', event => {
    const opened = event.target.closest('[data-action="open-item"][data-id]');
    if (opened) markOpened(opened.dataset.id);
    const button = event.target.closest('[data-collection]');
    if (!button) return;
    const action = button.dataset.collection, id = button.dataset.id;
    if (action === 'filter' || action === 'study-filter') {
      if (action === 'filter') filter = button.dataset.value; else studyFilter = button.dataset.value;
      render();
    } else if (action === 'reset') { filter = 'all'; studyFilter = 'all'; query = ''; sort = 'custom'; render(); }
    else if (action === 'first-night') firstNight();
    else if (action === 'export') exportGuide();
    else if (action === 'open') { markOpened(id); openItem(id); }
    else if (action === 'note') openNote(id);
    else if (action === 'move') {
      syncOrder();
      const index = archive.order.indexOf(id), target = index + Number(button.dataset.direction);
      if (index >= 0 && target >= 0 && target < archive.order.length) {
        [archive.order[index], archive.order[target]] = [archive.order[target], archive.order[index]];
        sort = 'custom'; save(); render();
        main.querySelector(`[data-collection="move"][data-id="${id}"][data-direction="${button.dataset.direction}"]`)?.focus({ preventScroll: true });
      }
    } else if (action === 'tour') {
      const items = savedItems(); if (!items.length) return;
      const first = Math.max(0, items.findIndex(item => !studied(item)));
      tour = { items, index: first }; showTour();
    } else if (action === 'open-current' && tour) { const item = tour.items[tour.index]; markOpened(item.id); openItem(item.id); }
    else if (action === 'note-current' && tour) openNote(tour.items[tour.index].id);
    else if (action === 'tour-prev' && tour && tour.index > 0) { tour.index--; showTour(); }
    else if (action === 'tour-next' && tour) {
      if (tour.index < tour.items.length - 1) { tour.index++; showTour(); }
      else { closeModal(); render(); toast('Guided study complete. Your place in the collection is saved.'); }
    } else if (action === 'tour-studied' && tour) {
      const id = tour.items[tour.index].id;
      archive.studied = studied({ id }) ? archive.studied.filter(value => value !== id) : [...archive.studied, id];
      save(); render(); showTour();
    }
  });
  document.addEventListener('submit', event => {
    if (event.target.id !== 'marginalia-form') return;
    event.preventDefault();
    const id = event.target.dataset.id, text = document.querySelector('#marginalia-text').value.trim().slice(0, 500);
    if (text) archive.notes[id] = text; else delete archive.notes[id];
    save(); closeModal(); render(); toast('Marginalia kept in your research collection.');
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'collection-search') {
      query = event.target.value.trim().toLowerCase();
      let count = 0;
      document.querySelectorAll('[data-research-card]').forEach(card => {
        const visible = !query || card.dataset.name.includes(query) || (archive.notes[card.dataset.researchCard] || '').toLowerCase().includes(query);
        card.hidden = !visible; if (visible) count++;
      });
      const label = document.querySelector('#research-count'); if (label) label.textContent = `${count} work${count === 1 ? '' : 's'} in view`;
    }
  });
  document.addEventListener('change', event => { if (event.target.id === 'collection-sort') { sort = event.target.value; render(); main.querySelector('#collection-sort')?.focus({ preventScroll: true }); } });

  // Mouse ordering is optional; the arrow buttons provide the same operation
  // for touch and keyboard users.
  document.addEventListener('dragstart', event => {
    const card = event.target.closest('[data-research-card]');
    if (card) { event.dataTransfer.setData('text/aether-research', card.dataset.researchCard); event.dataTransfer.effectAllowed = 'move'; }
  });
  document.addEventListener('dragover', event => { if (event.target.closest('[data-research-card]')) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } });
  document.addEventListener('drop', event => {
    const target = event.target.closest('[data-research-card]'), source = event.dataTransfer.getData('text/aether-research');
    if (!target || !source || source === target.dataset.researchCard) return;
    event.preventDefault(); syncOrder();
    const from = archive.order.indexOf(source), to = archive.order.indexOf(target.dataset.researchCard);
    if (from < 0 || to < 0) return;
    archive.order.splice(to, 0, archive.order.splice(from, 1)[0]); sort = 'custom'; save(); render();
  });

  renderers.collection = renderCollection;
  viewNames.collection = 'Research cabinet';
  return { mount() {}, unmount() {}, read };
})();
