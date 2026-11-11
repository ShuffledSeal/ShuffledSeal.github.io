'use strict';

// An intentionally illustrative orrery: orbital periods are real, positions are composed.
const planets = [
  { id: 'mercury', name: 'Mercury', title: 'The swift messenger', type: 'Terrestrial planet', color: '#aaa28d', radius: 3.5, orbit: 35, angle: -55, period: 88, distance: '0.39 AU', diameter: '4,879 km', day: '58.6 Earth days', description: 'A small, cratered world that races around the Sun in just 88 days. Without a substantial atmosphere to hold its warmth, Mercury knows both the fierce heat of day and the deep cold of night.', note: 'Look close to the horizon just before sunrise or after sunset. This elusive little world never wanders far from the Sun.' },
  { id: 'venus', name: 'Venus', title: 'The evening star', type: 'Terrestrial planet', color: '#c4a77b', radius: 5, orbit: 60, angle: 135, period: 224.7, distance: '0.72 AU', diameter: '12,104 km', day: '243 Earth days', description: 'Wrapped in luminous clouds, Venus has inspired poets for millennia. Our nearest planetary neighbour shines brilliantly, but beneath its lovely veil lies a world of extraordinary heat and pressure.', note: 'Venus is the brightest planet in our sky. Through a telescope, it reveals phases much like our own Moon.' },
  { id: 'earth', name: 'Earth', title: 'Our pale blue home', type: 'Terrestrial planet', color: '#7faaa3', radius: 6.5, orbit: 87, angle: -145, period: 365.25, distance: '1.00 AU', diameter: '12,742 km', day: '23 h 56 min', description: 'Of all the worlds we have studied, this is the only one known to hold life. A blue-green refuge of oceans, forests, and cloud, turning quietly beneath the same stars that have always made us wonder.', note: 'Every atom of iron in your blood was forged in a star. The observer and the observed are, in a very real sense, related.' },
  { id: 'mars', name: 'Mars', title: 'The ember in the dark', type: 'Terrestrial planet', color: '#b97e5b', radius: 4.5, orbit: 115, angle: 24, period: 687, distance: '1.52 AU', diameter: '6,779 km', day: '24 h 37 min', description: 'Rust-red deserts, ancient riverbeds, and a volcano taller than any on Earth. Mars is a world of grand landscapes and unanswered questions, a familiar point of copper light in the night sky.', note: 'Its distinctive warm colour is visible to the naked eye. At opposition, a small telescope can reveal a polar ice cap.' },
  { id: 'jupiter', name: 'Jupiter', title: 'The king of worlds', type: 'Gas giant', color: '#c2a481', radius: 12, orbit: 158, angle: -57, period: 4333, distance: '5.20 AU', diameter: '139,820 km', day: '9 h 56 min', description: 'A magnificent gas giant striped with clouds and crowned by storms. Jupiter holds more than twice the mass of all the other planets combined, with a family of moons that makes a little solar system of its own.', note: 'Even binoculars can reveal its four Galilean moons. Return on another night and you will find that they have danced to new positions.' },
  { id: 'saturn', name: 'Saturn', title: 'The ringed world', type: 'Gas giant', color: '#c6b187', radius: 9.5, orbit: 204, angle: 155, period: 10759, distance: '9.58 AU', diameter: '116,460 km', day: '10 h 42 min', description: 'The jewel of the solar system. A world so light it could float in a sufficiently enormous ocean, surrounded by countless fragments of ice and stone. What appears a single golden halo is a multitude of delicate rings.', note: 'Few first sights through a telescope compare with Saturn. A modest instrument is enough to distinguish its rings from the planet itself.' },
  { id: 'uranus', name: 'Uranus', title: 'The sideways wanderer', type: 'Ice giant', color: '#9fb8ac', radius: 7, orbit: 249, angle: 42, period: 30687, distance: '19.2 AU', diameter: '50,724 km', day: '17 h 14 min', description: 'A tranquil-looking world of blue-green haze, tipped almost onto its side. Its unusual tilt brings seasons that last for decades. William Herschel discovered it in 1781, expanding the known boundaries of our solar system.', note: 'With a dark sky and a good star chart, binoculars can help you find this distant ice giant. A telescope reveals a tiny pale disc.' },
  { id: 'neptune', name: 'Neptune', title: 'Beyond the familiar', type: 'Ice giant', color: '#6f91ab', radius: 6.5, orbit: 290, angle: -160, period: 60190, distance: '30.1 AU', diameter: '49,244 km', day: '16 h 6 min', description: 'Far beyond the warmth of the inner worlds, Neptune moves through a 165-year orbit. It was found with mathematics before it was found with a telescope: a triumph of human curiosity written in pale blue light.', note: 'Neptune requires a telescope. Knowing that its light has travelled for more than four hours makes its tiny disc feel rather extraordinary.' },
];

const constellations = [
  { id: 'orion', name: 'Orion', title: 'The celestial hunter', season: 'Winter evenings', brightest: 'Rigel', family: 'Orion family', description: 'Three stars in a remarkably straight line mark the belt of the hunter. Follow them down to the misty patch of his sword and you will find the Orion Nebula, a vast stellar nursery some 1,300 light-years away.', note: 'Find the three belt stars first. The bright reddish star above them is Betelgeuse; brilliant blue-white Rigel marks the opposite foot.', points: [[111,51],[93,94],[155,101],[169,55],[122,128],[134,133],[146,138],[98,196],[164,205],[137,169]], lines: [[0,1],[0,3],[3,2],[1,4],[2,6],[4,5],[5,6],[4,7],[6,8],[5,9]], label: [130,244] },
  { id: 'cassiopeia', name: 'Cassiopeia', title: 'The queen in her chair', season: 'Northern autumn', brightest: 'Schedar', family: 'Perseus family', description: 'A queen traced in five bright stars, Cassiopeia turns around the northern pole in a distinctive W. In Greek mythology she sits upon her throne; to a patient observer she is a beautiful guide to the northern Milky Way.', note: 'Look for the W on the opposite side of Polaris from the Big Dipper. For much of the northern hemisphere, she never slips below the horizon.', points: [[264,103],[291,140],[321,87],[349,126],[379,69]], lines: [[0,1],[1,2],[2,3],[3,4]], label: [320,190] },
  { id: 'ursa-major', name: 'Ursa Major', title: 'The great northern bear', season: 'Northern spring', brightest: 'Alioth', family: 'Ursa Major family', description: 'The Great Bear holds one of the sky’s most familiar patterns: the seven stars of the Big Dipper. These lights have guided travellers, inspired stories, and measured the turning of the seasons across countless generations.', note: 'Extend a line through the two outer stars of the Dipper’s bowl about five times their separation to find Polaris, the North Star.', points: [[432,82],[458,92],[479,110],[505,122],[551,111],[545,152],[506,157]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]], label: [495,211] },
];

const events = [
  { id: 'quadrantids', date: '2026-01-04', name: 'Quadrantid meteor shower', short: 'The Quadrantids', type: 'Meteor shower', icon: 'meteor', detail: 'A bright beginning to the year', description: 'A brief but beautiful meteor shower. Find a dark northern sky after midnight and let your eyes settle into the dark. The narrow peak can reward a patient observer with lovely bright trails.', best: 'Before dawn', direction: 'Northeastern sky' },
  { id: 'lyrids', date: '2026-04-22', name: 'Lyrid meteor shower', short: 'The Lyrids', type: 'Meteor shower', icon: 'meteor', detail: 'Old visitors, new wishes', description: 'Among the oldest recorded meteor showers, the Lyrids bring small fragments of Comet Thatcher into our atmosphere. Look away from the Moon and give the whole sky your attention.', best: 'After midnight', direction: 'Near Lyra' },
  { id: 'eclipse', date: '2026-08-12', name: 'Partial solar eclipse', short: 'The solar eclipse', type: 'Solar eclipse', icon: 'sun', detail: 'The Moon takes a bite from the Sun', description: 'The Moon crosses the Sun: total over the Arctic and Spain, a deep partial across much of Europe. From London and Edinburgh, watch the Sun become a crescent low in the western evening sky. Never look at the Sun without proper eclipse glasses — this is the one appointment with a dress code.', best: 'Around sunset', direction: 'West, low on the horizon' },
  { id: 'perseids', date: '2026-08-12', name: 'Perseid meteor shower', short: 'The Perseids', type: 'Meteor shower', icon: 'meteor', detail: 'Summer’s great celestial spectacle', description: 'The summer sky fills with fleeting visitors from Comet Swift–Tuttle. A new Moon makes 2026 a particularly inviting year to find a dark place, spread a blanket, and watch the heavens. That same new Moon crosses the Sun on 12 August — a total eclipse over the Arctic and Spain.', best: 'After midnight', direction: 'Across the sky' },
  { id: 'saturn-opposition', date: '2026-10-04', name: 'Saturn at opposition', short: 'Saturn’s grand appearance', type: 'Planetary event', icon: 'orbit', detail: 'The ringed world takes centre stage', description: 'Saturn stands opposite the Sun in our sky, rising around sunset and staying with us through the night. This is a lovely season to turn a telescope toward the ringed world.', best: 'Around midnight', direction: 'Southern sky' },
  { id: 'orionids', date: '2026-10-22', name: 'Orionid meteor shower', short: 'The Orionids', type: 'Meteor shower', icon: 'meteor', detail: 'A little stardust, courtesy of Halley', description: 'Every October, Earth passes through a trail of dust left by Halley’s Comet. Those ancient grains become swift ribbons of light. The waxing Moon may wash out fainter meteors this year; the hours before dawn offer a quieter, darker window.', best: 'Before dawn, Oct 21–22', direction: 'Across the sky' },
  { id: 'hunters-moon', date: '2026-10-26', name: 'The Hunter’s Moon', short: 'The Hunter’s Moon', type: 'Full moon', icon: 'moon', detail: 'An autumn lantern in the sky', description: 'The full Moon following the Harvest Moon has long been called the Hunter’s Moon. Watch it rise through the evening haze: low on the horizon it can seem impossibly large, an old and lovely trick of perception.', best: 'At moonrise', direction: 'Eastern horizon' },
  { id: 'leonids', date: '2026-11-17', name: 'Leonid meteor shower', short: 'The Leonids', type: 'Meteor shower', icon: 'meteor', detail: 'The lion leaves a trail of light', description: 'Fine particles from Comet Tempel–Tuttle streak into the atmosphere at extraordinary speed. The Leonids are known for fast, bright meteors and the occasional lingering trail.', best: 'Before dawn, Nov 17–18', direction: 'Across the sky' },
  { id: 'geminids', date: '2026-12-14', name: 'Geminid meteor shower', short: 'The Geminids', type: 'Meteor shower', icon: 'meteor', detail: 'A winter sky full of wishes', description: 'One of the most dependable celestial spectacles of the year. Unlike most meteor showers, the Geminids come from an asteroid, 3200 Phaethon. Dress warmly, settle in, and look for bright, deliberate trails.', best: 'Late evening to dawn', direction: 'Across the sky' },
  { id: 'solstice', date: '2026-12-21', name: 'The winter solstice', short: 'The longest night', type: 'Seasonal turning', icon: 'sun', detail: 'A turning point in the year', description: 'In the northern hemisphere, the Sun follows its shortest daily path across the sky. The longest night is also a beginning: from here, the light slowly returns. In the south, it is the height of summer.', best: 'All night', direction: 'Northern hemisphere' },
];

const locations = [
  { id: 'greenwich', name: 'Greenwich, London', coordinates: '51° 28′ N · 0° 00′ W', hemisphere: 'Northern hemisphere' },
  { id: 'edinburgh', name: 'Edinburgh, Scotland', coordinates: '55° 57′ N · 3° 11′ W', hemisphere: 'Northern hemisphere' },
  { id: 'atacama', name: 'Atacama, Chile', coordinates: '23° 51′ S · 67° 29′ W', hemisphere: 'Southern hemisphere' },
  { id: 'kyoto', name: 'Kyoto, Japan', coordinates: '35° 01′ N · 135° 46′ E', hemisphere: 'Northern hemisphere' },
];

const initialJournal = [
  { id: 'first-saturn', title: 'An evening with Saturn', date: '2026-10-20', subject: 'Saturn', body: 'There it was. Not a photograph in a book, not a point of light, but a tiny, perfect world with rings.\n\nI must have stood at the eyepiece for half an hour. Some things are worth being a little cold for.' },
  { id: 'queen', title: 'Finding the queen', date: '2026-10-18', subject: 'Cassiopeia', body: 'The clouds finally parted around ten. Found Cassiopeia’s familiar W above the old oak tree, then followed it toward the faint, scattered glow of the Milky Way.\n\nThe same stars. A different kind of quiet.' },
  { id: 'quiet', title: 'Nothing in particular', date: '2026-10-12', subject: 'The night sky', body: 'No telescope tonight. Just a wool blanket, a cup of tea, and the slow appearance of stars as my eyes grew used to the dark.\n\nAn observation: wonder needs very little equipment.' },
];

const STORAGE_KEY = 'aether-observatory-v1';
const validItemIds = new Set([...planets, ...constellations, ...events].map(item => item.id));
function readStoredData() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!value || typeof value !== 'object') return {};
    return {
      name: typeof value.name === 'string' ? value.name.slice(0, 40) : undefined,
      location: locations.some(location => location.id === value.location) ? value.location : undefined,
      saved: Array.isArray(value.saved) ? [...new Set(value.saved.filter(id => validItemIds.has(id)))] : undefined,
      journal: Array.isArray(value.journal) ? value.journal.filter(entry => entry && ['id', 'title', 'date', 'subject', 'body'].every(key => typeof entry[key] === 'string') && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && dateKey(parseDate(entry.date)) === entry.date) : undefined,
    };
  } catch {
    return {};
  }
}

const stored = readStoredData();
const isNewVisitor = stored.name === undefined && stored.saved === undefined && stored.journal === undefined;
const todayNoon = new Date();
todayNoon.setHours(12, 0, 0, 0);
const state = {
  view: 'overview',
  name: stored.name || 'The Explorer',
  location: stored.location || 'greenwich',
  saved: stored.saved ?? ['saturn', 'orion'],
  journal: stored.journal ?? structuredClone(initialJournal),
  selectedDate: todayNoon,
  calendarMonth: new Date(todayNoon.getFullYear(), todayNoon.getMonth(), 1, 12),
  suppressEnter: false,
  mapMode: 'solar',
  orbitalDay: 0,
  playing: false,
  ambience: false,
};

const main = document.querySelector('#main');
const modal = document.querySelector('#modal');
const modalContent = document.querySelector('#modal-content');
let toastTimer;
let playbackFrame;
let lastFrame;
let audioContext;
let audioGain;
let modalTrigger;
let modalTriggerSelector;

function icon(name, className = '') {
  return `<svg class="${className}" aria-hidden="true"><use href="assets/victorian-icons.svg#${name}"/></svg>`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(date, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

function currentLocation() {
  return locations.find(location => location.id === state.location);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: state.name, location: state.location, saved: state.saved, journal: state.journal }));
    return true;
  } catch {
    toast('Browser storage is unavailable. This change will last for this visit.');
    return false;
  }
}

function hideToast() {
  const element = document.querySelector('#toast');
  clearTimeout(toastTimer);
  element.classList.remove('visible');
  try { if (element.matches(':popover-open')) element.hidePopover(); } catch {}
}
function toast(message) {
  const element = document.querySelector('#toast');
  clearTimeout(toastTimer);
  element.textContent = message;
  element.classList.add('visible');
  // The popover places the toast in the top layer, above any open <dialog>.
  try { if (!element.matches(':popover-open')) element.showPopover(); } catch {}
  toastTimer = setTimeout(() => {
    element.classList.remove('visible');
    setTimeout(() => { try { if (element.matches(':popover-open')) element.hidePopover(); } catch {} }, 320);
  }, 3800);
}

function lunarPhase(date) {
  const elapsedDays = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const phase = ((elapsedDays / 29.530588853) % 1 + 1) % 1;
  const illumination = Math.round((1 - Math.cos(phase * Math.PI * 2)) / 2 * 100);
  let name;
  if (phase < .025 || phase > .975) name = 'New moon';
  else if (phase < .225) name = 'Waxing crescent';
  else if (phase < .275) name = 'First quarter';
  else if (phase < .475) name = 'Waxing gibbous';
  else if (phase < .525) name = 'Full moon';
  else if (phase < .725) name = 'Waning gibbous';
  else if (phase < .775) name = 'Last quarter';
  else name = 'Waning crescent';
  return { phase, illumination, name };
}

function upcomingEvents(limit = 3) {
  return events.filter(event => event.date >= dateKey(state.selectedDate)).slice(0, limit);
}

function moonShadow(moon) {
  const side = moon.phase < .5 ? 1 : -1;
  return `box-shadow:inset ${side * Math.round((100 - moon.illumination) * .22)}px 0 0 #242b20,0 0 14px #b8a8740a`;
}

function eventRow(event) {
  const date = parseDate(event.date);
  const tonight = event.date === dateKey(state.selectedDate);
  return `<button class="event-row" data-event="${event.id}">
    <span class="event-date ${tonight ? 'highlight' : ''}">${date.getDate()}<small>${formatDate(date, { month: 'short' }).toUpperCase()}</small></span>
    <span class="event-info"><span class="event-name">${event.name}</span><span class="event-meta">${event.type}<span class="event-tag ${tonight ? 'tonight' : ''}">${tonight ? 'Tonight' : event.type === 'Full moon' ? 'Lunar' : event.type === 'Planetary event' ? 'Telescope night' : event.type === 'Seasonal turning' ? 'Solstice' : event.type === 'Solar eclipse' ? 'Dress code' : 'Look up'}</span></span></span>
    ${icon(state.saved.includes(event.id) ? 'bookmark' : 'arrow-up-right')}
  </button>`;
}

function observerPath() {
  let puzzle = {}, cartridges = {}, research = {};
  try { puzzle = JSON.parse(localStorage.getItem('aether-planet-puzzles-v1')) || {}; } catch {}
  try { cartridges = JSON.parse(localStorage.getItem('aether-cartridge-records-v1')) || {}; } catch {}
  try { research = JSON.parse(localStorage.getItem('aether-research-collection-v1')) || {}; } catch {}
  const records = puzzle.records && typeof puzzle.records === 'object' ? puzzle.records : {};
  const completed = Object.keys(records).length;
  const played = Object.values(cartridges.best && typeof cartridges.best === 'object' ? cartridges.best : {}).some(value => Number(value) > 0);
  const journaled = state.journal.some(entry => entry.date === dateKey(new Date()));
  const curated = state.saved.length >= 3 || (Array.isArray(research.studied) && research.studied.length > 0);
  const nextPlanet = planets.find(planet => Array.from({ length: 5 }, (_, index) => `${planet.id}:${index}`).some(key => !records[key])) || planets[0];
  const steps = [
    { done: completed > 0, title: completed > 0 ? 'Continue the planetary atlas' : 'Begin with a small mystery', copy: completed > 0 ? `${completed} crafted puzzle${completed === 1 ? '' : 's'} solved. ${nextPlanet.name} is next.` : `Start ${nextPlanet.name}’s first puzzle and learn its instrument.`, href: `#planet/${nextPlanet.id}`, action: completed > 0 ? 'Continue the atlas' : 'Solve a first puzzle' },
    { done: played, title: played ? 'Return to the instruments' : 'Choose a cartridge', copy: played ? 'Your record book is open. Try a different mode or Veteran Sky after a clear.' : 'Play one of the six flagship instruments. Campaign, endless and Daily Vigil are yours.', href: '#voyage', action: played ? 'Open the cabinet' : 'Play a cartridge' },
    { done: journaled, title: journaled ? 'Today’s observation is kept' : 'Write down what surprised you', copy: journaled ? 'A new page from today is in your field journal.' : 'A single sentence is enough to turn a game into an observation.', action: journaled ? 'Open the journal' : 'Write an observation', href: journaled ? '#journal' : null },
    { done: curated, title: curated ? 'Your research has a path' : 'Give the collection a purpose', copy: curated ? 'Reorder the shelf, finish a guided study, or export your field guide.' : 'Build a first-night shelf with Saturn, Orion and the next celestial event.', href: '#collection', action: curated ? 'Continue research' : 'Build a research shelf' },
  ];
  return `<section class="observer-path" aria-labelledby="observer-path-title"><header><div><p class="eyebrow">YOUR OBSERVER’S PATH</p><h2 id="observer-path-title">A reason to look up tonight.</h2></div><p>No streaks. No chores. Just a useful next chapter.</p></header><ol>${steps.map((step, index) => `<li class="${step.done ? 'done' : ''}"><span class="path-number">${step.done ? '✓' : ['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][index]}</span><div><h3>${step.title}</h3><p>${step.copy}</p></div>${step.href ? `<a class="text-link" href="${step.href}">${step.action} ${icon('arrow-right')}</a>` : `<button class="text-link" data-action="new-entry">${step.action} ${icon('arrow-right')}</button>`}</li>`).join('')}</ol></section>`;
}

function renderOverview() {
  const moon = lunarPhase(state.selectedDate);
  const next = upcomingEvents();
  return `<div class="playground-home view-enter">
    <section class="welcome"><div><p class="welcome-kicker">Your private observatory · Est. MMXXVI</p><h1>The celestial cabinet.</h1><p>Field notes, planetary puzzles, and instruments for a curious mind.</p></div><button class="date-button" data-action="date" aria-label="Change observatory date, currently ${formatDate(state.selectedDate)}">${icon('calendar')}${formatDate(state.selectedDate)}${icon('chevron-down', 'chevron')}</button></section>
    <section class="playground-hero hero" aria-labelledby="hero-title">
      <img class="hero-painting" src="assets/celestial-landscape.webp" alt="" fetchpriority="high" />
      <span class="corner tl" aria-hidden="true"></span><span class="corner tr" aria-hidden="true"></span><span class="corner bl" aria-hidden="true"></span><span class="corner br" aria-hidden="true"></span>
      <div class="hero-copy playground-copy"><p class="eyebrow"><span class="hero-kicker-star" aria-hidden="true">✦</span> THE PLANETARY ATLAS · VOLUME I</p><h2 id="hero-title">Atlas of the<br><em>Wandering Heavens.</em></h2><p class="hero-description">Eight worlds, faithfully observed. Trace a watershed, plot a rover’s passage, and unlock forty puzzles shaped by the character of each planet.</p><div class="hero-cta"><a href="#planetarium" class="button button-primary">Open the atlas ${icon('arrow-right')}</a><a href="#voyage" class="text-link">Enter the Grand Tour ${icon('arrow-up-right')}</a></div></div>
      <figure class="hero-engraving"><span class="instrument-figure">PLATE I <span>THE CELESTIAL MECHANISM</span></span><div class="engraving-mat"><img src="assets/antique-orrery-globe.webp" width="1200" height="2013" alt="A coloured antique engraving of an ornate orrery and terrestrial globe on a carved tripod" fetchpriority="high" /></div><figcaption>THE ORRERY & TERRESTRIAL GLOBE <span>·</span> OBSERVER’S COLLECTION</figcaption></figure>
      <div class="hero-colophon"><span><i aria-hidden="true"></i> ILLUSTRATED FIELD GUIDES · FORTY PUZZLES</span><span>THE OBSERVER’S ATLAS <span aria-hidden="true">✧</span> VOL. MMXXVI</span></div>
    </section>
    <section class="stats-grid" aria-label="Your observatory at a glance">
      <button class="stat" data-action="moon"><span class="stat-icon"><span class="stat-moon" style="${moonShadow(moon)}" aria-hidden="true"></span></span><span><span class="stat-label">Tonight’s moon</span><span class="stat-value">${moon.name}</span><span class="stat-detail">${moon.illumination}% illuminated <span aria-hidden="true">·</span> ${moon.phase < .5 ? 'A little more light' : 'A little less light'} each night</span></span></button>
      <a class="stat" href="#planetarium"><span class="stat-icon">${icon('orbit')}</span><span><span class="stat-label">The planetary puzzles</span><span class="stat-value">8 games · 40 levels</span><span class="stat-detail"><i class="tiny-dot"></i> Pick a planet to start</span></span></a>
      ${next[0] ? `<button class="stat" data-event="${next[0].id}"><span class="stat-icon">${icon('meteor')}</span><span><span class="stat-label">${next[0].date === dateKey(state.selectedDate) ? 'Tonight’s spectacle' : 'Next in the almanac'}</span><span class="stat-value">${next[0].short}</span><span class="stat-detail">${formatDate(parseDate(next[0].date), { month: 'long', day: 'numeric' })} · ${next[0].type}</span></span></button>` : `<a class="stat" href="#calendar"><span class="stat-icon">${icon('calendar')}</span><span><span class="stat-label">The almanac</span><span class="stat-value">A year of wonder</span><span class="stat-detail">Browse the 2026 celestial calendar</span></span></a>`}
      <a class="stat" href="#journal"><span class="stat-icon">${icon('journal')}</span><span><span class="stat-label">Your field journal</span><span class="stat-value">${state.journal.length} observations</span><span class="stat-detail">Read, edit, or add a field note</span></span></a>
      ${(() => { try { const t = JSON.parse(localStorage.getItem('aether-grand-tour-v2'))?.active; return t ? `<a class="stat" href="#voyage"><span class="stat-icon">${icon('meteor')}</span><span><span class="stat-label">The Grand Tour</span><span class="stat-value">Leg ${t.step + 1} of 12</span><span class="stat-detail"><i class="tiny-dot"></i> ${'♥'.repeat(t.hull)} · ${t.dust} stardust · resume ↗</span></span></a>` : ''; } catch { return ''; } })()}
    </section>
    ${observerPath()}
    ${window.AetherPlanets?.renderIndex() || ''}
    <section class="home-destinations" aria-labelledby="destinations-title"><header class="home-section-heading"><div><p class="section-label">ELSEWHERE IN THE OBSERVATORY</p><h2 id="destinations-title">At the <em>workbench.</em></h2></div><a class="text-link" href="#discover">All six rooms ${icon('arrow-up-right')}</a></header><div class="destination-grid"><a class="destination-card destination-play" href="#arcade"><div class="destination-top"><span>THE ARCADE</span><span class="round-arrow">↗</span></div><h3>A game<br><em>between observations.</em></h3><p>Stack planets, catch falling stars, or steer a comet. Four games with different controls and challenges.</p><div class="destination-drawing destination-engraving" aria-hidden="true"><img src="assets/celestial-hydra.webp" width="1201" height="845" alt="" loading="lazy" /></div><span class="destination-label">CHOOSE A GAME ↗</span></a><a class="destination-card destination-make" href="#discover"><div class="destination-top"><span>THE WORK ROOMS</span><span class="round-arrow">↗</span></div><h3>Observe,<br><em>then make something.</em></h3><p>Compose a telescope photograph, develop a print, or build a world at the drawing table.</p><div class="destination-drawing destination-engraving"><img src="assets/globe-projections-1807.webp" width="1200" height="1488" alt="" loading="lazy" /></div><span class="destination-label">EXPLORE THE ROOMS ↗</span></a><a class="destination-card destination-music" href="#orchestra"><div class="destination-top"><span>THE ORCHESTRA</span><span class="round-arrow">↗</span></div><h3>A score<br><em>for four planets.</em></h3><p>Arrange an eight-beat sequence, adjust the tempo, and listen to the parts together.</p><div class="destination-drawing destination-engraving" aria-hidden="true"><img src="assets/gemini-celestial-chart.webp" width="1200" height="849" alt="" loading="lazy" /></div><span class="destination-label">OPEN THE SEQUENCER ↗</span></a></div></section>
    <section class="home-almanac" aria-labelledby="almanac-title"><header class="home-section-heading"><div><p class="section-label">THE OBSERVER’S DESK</p><h2 id="almanac-title">Charts & <em>dates.</em></h2></div><span class="almanac-edition">THE OBSERVER’S ALMANAC / 2026</span></header><div class="dashboard-grid">
      ${renderChart(false)}
      <section class="panel horizon-panel"><div class="panel-heading"><div class="panel-title">${icon('calendar')}<h2>On the horizon</h2></div><a class="text-link" href="#calendar">The full almanac ${icon('arrow-up-right')}</a></div><p class="panel-subtitle">${isNewVisitor ? 'New here? Start with Saturn — few first sights compare.' : 'Good things come to those who look up.'}</p><div class="events-list">${next.length ? next.map(eventRow).join('') : '<p class="day-description">The year’s almanac is complete. There is always something to discover in the planetarium.</p>'}</div><p class="events-footnote">Some nights are worth staying up for.</p></section>
    </div></section>
    <section class="home-keepsakes" id="home-keepsakes"></section>
    <div class="bottom-note"><p class="quote">“Watch the stars, and see yourself running with them.”<span class="quote-credit">— MARCUS AURELIUS</span></p><span class="edition">${icon('sparkles')} A PLAYFUL SKY · THE 2026 ALMANAC</span></div>
  </div>`;
}

function starField(count = 65) {
  let seed = 147;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  return Array.from({ length: count }, (_, index) => {
    const twinkle = index % 5 === 0 ? ` style="animation-delay:${(random() * -5).toFixed(1)}s"` : '';
    return `<circle class="map-speck"${twinkle} cx="${(random() * 620 + 10).toFixed(1)}" cy="${(random() * 260 + 10).toFixed(1)}" r="${(random() * .65 + .25).toFixed(2)}"/>`;
  }).join('');
}

function planetPosition(planet) {
  const angle = (planet.angle + state.orbitalDay / planet.period * 360) * Math.PI / 180;
  return { x: 320 + Math.cos(angle) * planet.orbit, y: 133 + Math.sin(angle) * planet.orbit * .34 };
}

function renderSolarSystem(full = false) {
  const gradients = planets.map(planet => `<radialGradient id="grad-${planet.id}" cx=".3" cy=".25" r=".85"><stop stop-color="${planet.color}"/><stop offset=".5" stop-color="${planet.color}"/><stop offset="1" stop-color="#1a241a"/></radialGradient>`).join('');
  const orbits = planets.map(planet => `<ellipse class="orbit-line" cx="320" cy="133" rx="${planet.orbit}" ry="${planet.orbit * .34}"/>`).join('');
  const nodes = planets.map(planet => {
    const { x, y } = planetPosition(planet);
    return `<g class="planet-node" data-planet="${planet.id}" tabindex="0" role="button" aria-label="Explore ${planet.name}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><circle r="22" fill="transparent"/><circle class="planet-halo" r="${planet.radius + 5}"/><circle r="${planet.radius}" fill="url(#grad-${planet.id})"/>${planet.id === 'saturn' ? '<ellipse rx="17" ry="4.5" transform="rotate(-25)" fill="none" stroke="#c1ad81" stroke-width="2.1"/>' : ''}${planet.id === 'jupiter' ? '<path d="M-11-3Q0 0 11-3M-10 4Q0 7 10 4" fill="none" stroke="#746c52" stroke-width="1.5" opacity=".5"/>' : ''}${full || !['mercury', 'venus'].includes(planet.id) ? `<text class="planet-label" text-anchor="middle" y="${planet.id === 'mercury' ? -12 : planet.radius + 17}">${planet.name}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="orrery-svg" viewBox="0 0 640 280" role="group" aria-label="Interactive illustrative model of our solar system"><defs>${gradients}<radialGradient id="sun-gradient"><stop stop-color="#e2c478"/><stop offset=".7" stop-color="#b79a52"/><stop offset="1" stop-color="#796731"/></radialGradient><radialGradient id="sun-glow"><stop stop-color="#c7a354" stop-opacity=".13"/><stop offset="1" stop-color="#c7a354" stop-opacity="0"/></radialGradient></defs>${starField()}<path d="M320 15v11m-3-8h6M320 251v11m-3-3h6M12 133h11m-8-3v6M618 133h11m-3-3v6" stroke="#a3a57c" stroke-width=".5" opacity=".4"/>${orbits}<circle cx="320" cy="133" r="42" fill="url(#sun-glow)" class="sun-glow"/><circle cx="320" cy="133" r="15" fill="url(#sun-gradient)" class="sun-core"/><circle cx="320" cy="133" r="19" fill="none" stroke="#b8a15f" stroke-width=".5" opacity=".45"/><text x="320" y="174" class="planet-label" text-anchor="middle" style="font-size:8px;letter-spacing:2px;fill:#c5b377">SOL</text>${nodes}</svg>`;
}

function constellationGroup(constellation) {
  const lines = constellation.lines.map(([from, to]) => `<path class="constellation-line" d="M${constellation.points[from].join(' ')}L${constellation.points[to].join(' ')}"/>`).join('');
  const stars = constellation.points.map(([x, y], index) => `<circle class="constellation-glow" cx="${x}" cy="${y}" r="${index % 3 === 0 ? 6 : 3.5}"/><circle class="constellation-star" cx="${x}" cy="${y}" r="${index % 3 === 0 ? 2 : 1.4}"/>`).join('');
  return `<g class="constellation-node" data-constellation="${constellation.id}" tabindex="0" role="button" aria-label="Explore ${constellation.name}"><rect x="${Math.min(...constellation.points.map(point => point[0])) - 10}" y="40" width="${Math.max(...constellation.points.map(point => point[0])) - Math.min(...constellation.points.map(point => point[0])) + 20}" height="210" fill="transparent"/>${lines}${stars}<text class="constellation-name" text-anchor="middle" x="${constellation.label[0]}" y="${constellation.label[1]}">${constellation.name}</text></g>`;
}

function renderConstellations() {
  return `<svg class="orrery-svg" viewBox="0 0 640 280" role="group" aria-label="Illustrated star patterns of Orion, Cassiopeia, and Ursa Major">${starField(100)}${constellations.map(constellationGroup).join('')}</svg>`;
}

function renderChart(full = false) {
  return `<section class="panel chart-panel ${full ? 'full-chart' : ''}" aria-label="Interactive celestial chart">
    <div class="panel-heading"><div class="panel-title">${icon('orbit')}<h2>${full ? 'The orbital chart' : 'The solar system'}</h2></div>${full ? icon('sparkles') : `<a class="icon-button" href="#planetarium" aria-label="Expand the celestial chart">${icon('expand')}</a>`}</div>
    <p class="panel-subtitle">Select a world to open its field guide and puzzle room.</p>
    <div class="chart-topline"><div class="segmented" aria-label="Chart type"><button data-action="map-mode" data-mode="solar" aria-pressed="${state.mapMode === 'solar'}">Solar system</button><button data-action="map-mode" data-mode="constellations" aria-pressed="${state.mapMode === 'constellations'}">Constellations</button></div><span class="chart-scale">${state.mapMode === 'solar' ? 'A HELIOCENTRIC PERSPECTIVE' : 'THE NORTHERN CELESTIAL ATLAS'}</span></div>
    <div class="orrery-wrap">${state.mapMode === 'solar' ? renderSolarSystem(full) : renderConstellations()}</div>
    ${full && state.mapMode === 'solar' ? `<div class="time-controls${state.playing ? ' is-playing' : ''}"><button class="icon-button" data-action="playback" aria-label="${state.playing ? 'Pause' : 'Animate'} planetary motion" aria-pressed="${state.playing}">${icon(state.playing ? 'pause' : 'play')}</button><label for="orbital-time">PASSAGE OF TIME</label><input id="orbital-time" aria-label="Days elapsed in orbital simulation" type="range" min="0" max="730" step="1" value="${Math.floor(state.orbitalDay)}"/><output for="orbital-time" id="orbital-output">+ ${Math.floor(state.orbitalDay)} days</output><button class="text-link" data-action="reset-orbits" title="Return to tonight">Tonight</button></div><p class="form-hint" style="padding:0 28px 15px;margin-top:-4px">From tonight. The outer worlds move slowly — drag far to see Neptune stir.</p>` : ''}
    <div class="chart-footer"><span class="live-label"><i class="live-dot"></i>${state.mapMode === 'solar' ? 'ILLUSTRATIVE ORBITS · NOT TO SCALE' : 'ILLUSTRATED STAR PATTERNS'}</span>${full ? `<span class="chart-scale" style="text-transform:none;letter-spacing:.5px">Select a ${state.mapMode === 'solar' ? 'planet' : 'constellation'} to discover more</span>` : `<a class="text-link" href="#planetarium">Select a ${state.mapMode === 'solar' ? 'planet' : 'constellation'} to discover more ${icon('arrow-right')}</a>`}</div>
  </section>`;
}

function renderPlanetarium() {
  return `<div class="view-enter"><section class="view-header"><div><p class="eyebrow">THE PLANETARY ATLAS</p><h1>From Mercury to Neptune.</h1><p>Eight illustrated field guides. Eight different puzzle games, with five levels each. Your place is saved as you go.</p></div><a class="button" href="#planet/earth">Start with Earth ${icon('arrow-right')}</a></section>${window.AetherPlanets?.renderIndex() || ''}${renderChart(true)}</div>`;
}

function renderCalendar() {
  const month = state.calendarMonth;
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = dateKey(new Date());
  const dayEvents = events.filter(event => event.date === dateKey(state.selectedDate));
  const moon = lunarPhase(state.selectedDate);
  let dayMarkup = '<span aria-hidden="true"></span>'.repeat(firstWeekday);
  for (let day = 1; day <= days; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day, 12);
    const key = dateKey(date);
    const marked = events.filter(event => event.date === key);
    dayMarkup += `<button class="calendar-day ${key === dateKey(state.selectedDate) ? 'is-selected' : ''} ${key === today ? 'is-today' : ''}" data-action="select-day" data-date="${key}" ${key === dateKey(state.selectedDate) ? 'aria-current="date"' : ''} aria-label="${formatDate(date)}${marked.length ? ', ' + marked.map(event => event.name).join(', ') : ''}"><span>${day}</span><span class="event-dots">${marked.map(() => '<i></i>').join('')}</span></button>`;
  }
  return `<div class="view-enter"><section class="view-header"><div><p class="eyebrow">THE CELESTIAL ALMANAC · 2026 EDITION</p><h1>Make a date with the sky.</h1><p>Meteor showers, moonlit evenings, and moments you won’t want to miss.</p></div><button class="button" data-action="calendar-today">${icon('calendar')}Back to tonight</button></section><div class="calendar-layout"><section class="panel ${state.calendarDir || ''}"><div class="calendar-toolbar"><h2 aria-live="polite">${formatDate(month, { month: 'long', year: 'numeric' })}</h2><div class="calendar-arrows"><button class="icon-button" data-action="month-prev" aria-label="Previous month">${icon('chevron-left')}</button><button class="icon-button" data-action="month-next" aria-label="Next month">${icon('chevron-right')}</button></div></div><div class="weekdays">${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-days">${dayMarkup}</div><div class="calendar-key"><i></i>A little something to look forward to <span style="margin-left:auto">${month.getFullYear() === 2026 ? '2026 almanac' : 'Moon phases available · events in 2026'}</span></div></section><section class="panel day-panel"><span class="sr-only" role="status">${formatDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })} · ${moon.name}${dayEvents.length ? ' · ' + dayEvents.map(event => event.name).join(', ') : ''}</span><p class="eyebrow">${formatDate(state.selectedDate, { weekday: 'long' }).toUpperCase()}</p><h2>${formatDate(state.selectedDate, { day: 'numeric', month: 'long' })}</h2><p class="day-description">${dayEvents.length ? 'The heavens have something rather special in store.' : 'An unhurried night for familiar stars. Take the telescope out, or simply look up.'}</p><div class="day-events">${dayEvents.map(eventRow).join('')}</div><div class="lunar-detail"><span class="stat-moon" style="${moonShadow(moon)}" aria-hidden="true"></span><div><strong>${moon.name}</strong><p>Approximately ${moon.illumination}% illuminated</p></div></div><button class="button" style="margin-top:26px" data-action="new-entry">${icon('edit')}Make an observation</button><p class="form-hint">${currentLocation().name} · ${currentLocation().hemisphere}</p></section></div><section class="panel calendar-upcoming"><div class="panel-heading"><div class="panel-title">${icon('sparkles')}<h2>A few dates for your diary</h2></div></div><div class="events-list">${upcomingEvents(3).map(eventRow).join('') || '<p class="modal-description">The 2026 almanac ends here. Keep exploring the lunar calendar, or revisit a favourite celestial event.</p>'}</div></section></div>`;
}

function renderJournal() {
  const entries = [...state.journal].sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="view-enter"><section class="view-header"><div><p class="eyebrow">A CABINET OF SMALL WONDERS</p><h1>Your field journal.</h1><p>For the things you saw, the thoughts you had, and the nights you want to remember.</p></div><div class="view-header-actions"><button class="button" data-action="export-journal" ${entries.length ? '' : 'disabled'}>${icon('download')}Export</button><button class="button button-primary" data-action="new-entry">${icon('plus')}New observation</button></div></section><div class="journal-grid">${entries.map(entry => `<article class="panel journal-card"><p class="eyebrow">${icon('sparkles')}${formatDate(parseDate(entry.date)).toUpperCase()}</p><h2>${escapeHTML(entry.title)}</h2><p class="entry-body">${escapeHTML(entry.body)}</p><div class="journal-card-footer"><span>${escapeHTML(entry.subject)}</span><button class="text-link" data-action="read-entry" data-id="${escapeHTML(entry.id)}">Read observation ${icon('arrow-right')}</button></div></article>`).join('')}<button class="new-entry-card" data-action="new-entry">${icon('edit')}<strong>The next page is yours.</strong><small>Something caught your eye?</small></button></div><div class="bottom-note"><p class="quote">“To see a World in a Grain of Sand…”<span class="quote-credit">— WILLIAM BLAKE</span></p><span class="edition">${icon('journal')}${entries.length} ${entries.length === 1 ? 'OBSERVATION' : 'OBSERVATIONS'} · SAVED ON THIS DEVICE</span></div></div>`;
}

function findItem(id) {
  const planet = planets.find(item => item.id === id);
  if (planet) return { ...planet, kind: 'planet' };
  const constellation = constellations.find(item => item.id === id);
  if (constellation) return { ...constellation, kind: 'constellation' };
  const event = events.find(item => item.id === id);
  return event ? { ...event, kind: 'event' } : null;
}

function collectionVisual(item) {
  if (item.kind === 'planet') return `<span class="atlas-sphere planet-sphere ${item.id}" aria-hidden="true"></span>`;
  if (item.kind === 'event') return icon(item.icon);
  const xs = item.points.map(point => point[0]);
  const ys = item.points.map(point => point[1]);
  const minX = Math.min(...xs) - 15;
  const minY = Math.min(...ys) - 15;
  return `<svg class="constellation-svg" viewBox="${minX} ${minY} ${Math.max(...xs) - minX + 15} ${Math.max(...ys) - minY + 15}" aria-hidden="true">${item.lines.map(([from, to]) => `<path class="constellation-line" d="M${item.points[from].join(' ')}L${item.points[to].join(' ')}"/>`).join('')}${item.points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" class="constellation-star"/>`).join('')}</svg>`;
}

function renderCollection() {
  const items = state.saved.map(findItem).filter(Boolean);
  return `<div class="view-enter"><section class="view-header"><div><p class="eyebrow">THE THINGS THAT MAKE YOU LOOK UP</p><h1>A universe of your own.</h1><p>Your favourite worlds, star patterns, and celestial appointments. Kept close, for another night.</p></div><a class="button" href="#planetarium">${icon('plus')}Find a new wonder</a></section><div class="collection-grid">${items.length ? items.map(item => `<article class="panel collection-card"><p class="eyebrow" style="justify-content:center">${item.kind === 'planet' ? item.type.toUpperCase() : item.kind === 'constellation' ? 'CONSTELLATION' : item.type.toUpperCase()}</p><div class="collection-visual">${collectionVisual(item)}</div><h2>${item.name}</h2><p>${item.title || formatDate(parseDate(item.date))}</p><div class="collection-actions"><button class="button" data-action="open-item" data-id="${item.id}">A closer look ${icon('arrow-up-right')}</button><button class="icon-button" data-action="remove-saved" data-id="${item.id}" aria-label="Remove ${item.name} from collection">${icon('bookmark')}</button></div></article>`).join('') : `<div class="panel empty-state">${icon('sparkles')}<h2>There’s room for wonder.</h2><p>Open a planet, constellation, or event and save it here. A little cabinet of celestial curiosities, just for you.</p><a class="button button-primary" href="#planetarium">Explore the planetarium ${icon('arrow-right')}</a></div>`}</div></div>`;
}

const viewNames = { overview: 'Overview', planetarium: 'Planetarium', calendar: 'Celestial calendar', journal: 'Field journal', collection: 'My collection' };
const renderers = { overview: renderOverview, planetarium: renderPlanetarium, calendar: renderCalendar, journal: renderJournal, collection: renderCollection };

function render() {
  hideToast();
  window.AetherPlanets?.unmount();
  window.AetherExperiences?.unmount();
  window.AetherVoyage?.unmount();
  window.AetherCollection?.unmount();
  document.body.dataset.view = state.view;
  main.innerHTML = renderers[state.view]();
  if (state.suppressEnter) main.querySelector('.view-enter')?.classList.add('instant');
  document.querySelector('#breadcrumb-current').textContent = viewNames[state.view];
  document.querySelector('#journal-count').textContent = state.journal.length;
  document.querySelector('#journal-access').textContent = `${viewNames.journal} ${state.journal.length}`;
  document.querySelector('#profile-name').textContent = state.name;
  document.querySelector('.avatar').textContent = state.name.replace(/^The /i, '').charAt(0).toUpperCase();
  document.querySelector('#location-label').textContent = currentLocation().name;
  // Scope to the actual navigation links — body also carries data-view for styling.
  document.querySelectorAll('.primary-nav [data-view]').forEach(link => {
    if (link.dataset.view === state.view || (state.view.startsWith('planet/') && link.dataset.view === 'planetarium')) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    // Compact tablet navigation hides the link text, so keep an accessible name.
    if (link.dataset.view === 'journal') link.removeAttribute('aria-label'); // the sr-only twin supplies the exact name
    else link.setAttribute('aria-label', viewNames[link.dataset.view]);
    link.setAttribute('title', viewNames[link.dataset.view]);
  });
  document.title = `${viewNames[state.view]} · Æther Observatory`;
  window.AetherExperiences?.mount(state.view);
  window.AetherPlanets?.mount(state.view);
  window.AetherVoyage?.mount(state.view);
  window.AetherCollection?.mount(state.view);
}

function navigate(view) {
  closeModal();
  closeMenu();
  if (location.hash === `#${view}`) {
    state.view = view;
    render();
  } else location.hash = view;
}

let routeBooted = false;
function handleRoute() {
  const route = location.hash.slice(1);
  const previousView = state.view;
  const initial = !routeBooted;
  routeBooted = true;
  stopPlayback();
  closeMenu();
  if (modal.open) closeModal();
  if (route === 'main') {
    if (!main.hasChildNodes()) { state.view = 'overview'; render(); }
    return;
  }
  const fallback = new URLSearchParams(location.search).has('standalone') ? 'voyage' : 'overview';
  if (route && !Object.hasOwn(renderers, route)) history.replaceState(null, '', `#${fallback}`);
  state.view = Object.hasOwn(renderers, route) ? route : fallback;
  if (!initial && previousView !== state.view) window.AetherMotion?.travel(state.view);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  // User-initiated route changes move focus into the new view so keyboard users
  // aren't stranded; the initial load leaves the skip link as the first tab stop.
  if (!initial) main.focus({ preventScroll: true });
}

function describeTrigger(el) {
  if (!el?.matches) return null;
  if (el.id) return `#${el.id}`;
  if (el.dataset.planet) return `[data-planet="${el.dataset.planet}"]`;
  if (el.dataset.constellation) return `[data-constellation="${el.dataset.constellation}"]`;
  if (el.dataset.event) return `[data-event="${el.dataset.event}"]`;
  if (el.dataset.action) return `[data-action="${el.dataset.action}"]${el.dataset.id ? `[data-id="${CSS.escape(el.dataset.id)}"]` : ''}`;
  if (el.classList.contains('profile')) return '.profile';
  if (el.classList.contains('location-button')) return '.location-button';
  return null;
}

function showModal(content, focusSelector) {
  window.AetherExperiences?.pause();
  window.AetherVoyage?.pause?.();
  if (!modal.open) {
    modalTrigger = document.activeElement;
    modalTriggerSelector = describeTrigger(document.activeElement);
  }
  modalContent.innerHTML = `<div class="modal-content">${content}</div>`;
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
  if (focusSelector) modalContent.querySelector(focusSelector)?.focus();
}

function closeModal() {
  if (modal.open) modal.close();
}

function saveButton(id) {
  const saved = state.saved.includes(id);
  return `<button class="button ${saved ? '' : 'button-primary'}" data-action="toggle-saved" data-id="${id}" aria-pressed="${saved}">${icon(saved ? 'check' : 'bookmark')}${saved ? 'In your collection' : 'Save to collection'}</button>`;
}

function openPlanet(id) {
  const planet = planets.find(item => item.id === id);
  if (!planet) return;
  navigate(`planet/${id}`);
}

function openConstellation(id) {
  const constellation = constellations.find(item => item.id === id);
  if (!constellation) return;
  showModal(`<p class="eyebrow">THE NORTHERN CELESTIAL ATLAS</p><h2 id="modal-title">${constellation.name}</h2><p class="modal-description" style="font-family:var(--serif);font-style:italic;font-size:22px">${constellation.title}</p><div class="modal-planet-visual">${collectionVisual({ ...constellation, kind: 'constellation' })}</div><p class="modal-description">${constellation.description}</p><dl class="planet-facts"><div><dt>Best evenings</dt><dd>${constellation.season}</dd></div><div><dt>Brightest star</dt><dd>${constellation.brightest}</dd></div></dl><p class="notice">${constellation.note}<small>A LITTLE HELP FINDING YOUR WAY</small></p><div class="modal-actions">${saveButton(id)}<button class="button" data-action="new-entry" data-subject="${constellation.name}">${icon('edit')}Make a note</button></div>`);
}

function openEvent(id) {
  const event = events.find(item => item.id === id);
  if (!event) return;
  showModal(`<div class="event-modal-icon">${icon(event.icon)}</div><p class="eyebrow">${formatDate(parseDate(event.date)).toUpperCase()} · ${event.type.toUpperCase()}</p><h2 id="modal-title">${event.name}</h2><p class="modal-description" style="font-family:var(--serif);font-size:22px;font-style:italic">${event.detail}</p><p class="modal-description">${event.description}</p><dl class="planet-facts"><div><dt>Make time for</dt><dd>${event.best}</dd></div><div><dt>Where to look</dt><dd>${event.direction}</dd></div></dl><div class="modal-actions"><button class="button button-primary" data-action="download-event" data-id="${event.id}">${icon('calendar')}Add to calendar</button>${saveButton(id)}</div><p class="form-hint">From the curated 2026 almanac. Directions favour the northern hemisphere; visibility depends on your location, weather, and moonlight.</p>`);
}

function openItem(id) {
  const item = findItem(id);
  if (item?.kind === 'planet') openPlanet(id);
  else if (item?.kind === 'constellation') openConstellation(id);
  else if (item?.kind === 'event') openEvent(id);
}

function toggleSaved(id, removeOnly = false) {
  if (!validItemIds.has(id)) return;
  const wasSaved = state.saved.includes(id);
  state.saved = wasSaved ? state.saved.filter(value => value !== id) : [...state.saved, id];
  const saved = persist();
  if (state.view === `planet/${id}` && !removeOnly) {
    const button = main.querySelector(`[data-action="toggle-saved"][data-id="${id}"]`);
    if (button) { button.outerHTML = saveButton(id); main.querySelector(`[data-action="toggle-saved"][data-id="${id}"]`)?.focus({ preventScroll: true }); }
    if (saved) toast(wasSaved ? 'Removed from your collection.' : 'Added to your collection.');
    return;
  }
  render();
  if (!removeOnly) {
    openItem(id);
    const toggle = modalContent.querySelector('[data-action="toggle-saved"]');
    if (toggle && !wasSaved) toggle.classList.add('saved-pop');
    toggle?.focus({ preventScroll: true });
  } else {
    main.querySelector('.collection-actions .icon-button, .collection-actions .button, .view-header .button')?.focus({ preventScroll: true });
  }
  if (saved) toast(wasSaved ? 'Removed from your collection.' : 'Added to your collection.');
}

function openJournalForm(id, subject = '') {
  const entry = state.journal.find(item => item.id === id);
  showModal(`<p class="eyebrow">YOUR FIELD JOURNAL</p><h2 id="modal-title">${entry ? 'Revisit an observation.' : 'What caught your eye?'}</h2><form id="journal-form" data-id="${entry ? escapeHTML(entry.id) : ''}"><div class="form-field"><label for="entry-title">A name for this moment</label><input id="entry-title" name="title" placeholder="An evening worth remembering" value="${escapeHTML(entry?.title || '')}" maxlength="100" required autocomplete="off"/></div><div class="form-row"><div class="form-field"><label for="entry-date">Date of observation</label><input type="date" id="entry-date" name="date" value="${entry?.date || dateKey(state.selectedDate)}" required min="1900-01-01" max="2199-12-31"/></div><div class="form-field"><label for="entry-subject">In your sights</label><input id="entry-subject" name="subject" placeholder="A planet, a star, a thought…" value="${escapeHTML(entry?.subject || subject)}" maxlength="60"/></div></div><div class="form-field"><label for="entry-body">Your observation</label><textarea id="entry-body" name="body" placeholder="The sky was quiet, and then…" required maxlength="15000">${escapeHTML(entry?.body || '')}</textarea></div><p class="form-hint">A private page. Your observations stay in this browser.</p><div class="modal-actions"><button type="button" class="button" data-action="close-modal">Set down the pen</button><button type="submit" class="button button-primary">${icon('check')}${entry ? 'Save changes' : 'Keep this moment'}</button></div></form>`, '#entry-title');
}

function readEntry(id) {
  const entry = state.journal.find(item => item.id === id);
  if (!entry) return;
  showModal(`<p class="eyebrow">${formatDate(parseDate(entry.date)).toUpperCase()} · ${escapeHTML(entry.subject).toUpperCase()}</p><h2 id="modal-title">${escapeHTML(entry.title)}</h2><p class="journal-full-body">${escapeHTML(entry.body)}</p><div class="modal-actions"><button class="button" data-action="edit-entry" data-id="${escapeHTML(entry.id)}">${icon('edit')}Edit observation</button><button class="button" data-action="close-modal">Back to the stars ${icon('arrow-right')}</button></div><button class="delete-entry" data-action="delete-entry" data-id="${escapeHTML(entry.id)}">${icon('trash')}Discard this page</button>`);
}

function deleteEntry(id) {
  const entry = state.journal.find(item => item.id === id);
  if (!entry) return;
  state.journal = state.journal.filter(item => item.id !== id);
  const saved = persist();
  closeModal();
  render();
  // The trigger's card is gone; hand focus to the nearest surviving control.
  (main.querySelector('.journal-card [data-action="read-entry"]') || main.querySelector('[data-action="new-entry"]'))?.focus({ preventScroll: true });
  if (saved) toast('Observation removed from your journal.');
}

function openLocation() {
  showModal(`<p class="eyebrow">A DIFFERENT POINT OF VIEW</p><h2 id="modal-title">Your place in the world.</h2><p class="modal-description">Choose a home for your observatory. Your location is noted alongside your lunar calendar; the illustrated star atlas is a northern-sky study.</p><div class="location-options">${locations.map(location => `<button class="location-option" data-action="set-location" data-id="${location.id}" aria-pressed="${state.location === location.id}">${icon('pin')}<span><strong>${location.name}</strong><small>${location.coordinates}</small></span>${state.location === location.id ? icon('check', 'location-check') : ''}</button>`).join('')}</div>`);
}

function openProfile() {
  showModal(`<p class="eyebrow">THE KEEPER OF THIS OBSERVATORY</p><h2 id="modal-title">Make yourself at home.</h2><p class="modal-description">Every observatory needs an observer. What shall we call you?</p><form id="profile-form"><div class="form-field"><label for="observer-name">Your name</label><input id="observer-name" name="name" value="${escapeHTML(state.name)}" maxlength="40" required autocomplete="name"/></div><div class="form-field"><label for="observer-location">Your observatory</label><select id="observer-location" name="location">${locations.map(location => `<option value="${location.id}" ${location.id === state.location ? 'selected' : ''}>${location.name}</option>`).join('')}</select></div><div class="modal-actions"><button class="button button-primary" type="submit">${icon('check')}Save your preferences</button></div><p class="form-hint">Saved on this device, just like your journal and collection.</p></form>`, '#observer-name');
}

function openDatePicker() {
  showModal(`<p class="eyebrow">TURN THE PAGES OF THE ALMANAC</p><h2 id="modal-title">Choose an evening.</h2><p class="modal-description">Follow the Moon through its phases and see what’s coming next in the 2026 almanac.</p><form id="date-form"><div class="form-field date-input-modal"><label for="observatory-date">Observatory date</label><input type="date" id="observatory-date" name="date" value="${dateKey(state.selectedDate)}" required min="1900-01-01" max="2199-12-31"/></div><div class="modal-actions"><button class="button button-primary" type="submit">Visit this evening ${icon('arrow-right')}</button></div></form>`, '#observatory-date');
}

function openMoon() {
  const moon = lunarPhase(state.selectedDate);
  showModal(`<p class="eyebrow">${formatDate(state.selectedDate).toUpperCase()} · OUR NEAREST NEIGHBOUR</p><h2 id="modal-title">${moon.name}.</h2><div class="modal-planet-visual"><span class="planet-sphere" style="--planet-color:#b6b59b;box-shadow:inset ${Math.round((100 - moon.illumination) * .7)}px 0 6px #161e16,inset -8px -8px 25px #172016"></span></div><p class="modal-description">About ${moon.illumination}% of the Moon’s visible face is illuminated. Our companion takes approximately 29.53 days to travel from one new Moon to the next, a rhythm that has shaped calendars and imaginations for millennia.</p><p class="notice">Follow the terminator — the boundary between lunar day and night. Long shadows there bring the mountains and craters into beautiful relief.<small>FROM THE OBSERVER’S HANDBOOK</small></p><div class="modal-actions"><button class="button button-primary" data-action="new-entry" data-subject="The Moon">${icon('edit')}Make a lunar observation</button></div><p class="form-hint">Phase and illumination are approximate, calculated from the average synodic month.</p>`);
}

function openNotifications() {
  showModal(`<p class="eyebrow">LETTERS FROM THE NIGHT SKY</p><h2 id="modal-title">A few things to look up for.</h2><p class="modal-description">The next appointments in your celestial almanac.</p><div class="notifications-list">${upcomingEvents(3).map(eventRow).join('') || '<p class="modal-description">You’ve reached the end of this year’s almanac. There are still eight extraordinary worlds waiting in the planetarium.</p>'}</div><div class="modal-actions"><button class="button" data-action="go-calendar">Open the celestial calendar ${icon('arrow-right')}</button></div>`);
}

function openAbout() {
  showModal(`<div class="about-mark">æther</div><p class="eyebrow">THE PLANETARY ATLAS & OBSERVATORY</p><h2 id="modal-title">A field guide to eight worlds.</h2><p class="modal-description">The planetary atlas pairs illustrated field notes with forty hand-crafted puzzle boards — one game per planet, five levels each. Elsewhere: a canvas arcade, telescope photographs, and a darkroom.</p><p class="modal-description">Astronomical figures are rounded reference values; each field guide links to NASA’s planet pages. The orbital chart is illustrative, and the almanac covers 2026. Artwork combines custom SVG/Canvas with public-domain Wellcome Collection engravings. Type: IM Fell English, Cormorant Garamond, and DM Sans, under the SIL Open Font License.</p><div class="about-footnote">Puzzle progress, notes and creations live in this browser. No account or tracking.</div>`);
}

const searchItems = [
  ...Object.entries(viewNames).map(([id, name]) => ({ id, name, kind: 'page', subtitle: 'Observatory', icon: id === 'calendar' ? 'calendar' : id === 'journal' ? 'journal' : 'sparkles' })),
  ...planets.map(planet => ({ id: planet.id, name: planet.name, kind: 'planet', subtitle: `${planet.title} · puzzle room`, icon: 'orbit' })),
  ...constellations.map(constellation => ({ id: constellation.id, name: constellation.name, kind: 'constellation', subtitle: 'Constellation', icon: 'sparkles' })),
  ...events.map(event => ({ id: event.id, name: event.name, kind: 'event', subtitle: '2026 almanac', icon: event.icon })),
  { id: 'pluto', name: 'Pluto', kind: 'easter-egg', subtitle: 'Not in the atlas', icon: 'sparkles' },
];

function searchResults(query = '') {
  const term = query.trim().toLowerCase();
  const results = term ? searchItems.filter(item => `${item.name} ${item.subtitle}`.toLowerCase().includes(term)).slice(0, 10) : ['saturn', 'orion', 'orionids', 'calendar', 'journal'].map(id => searchItems.find(item => item.id === id));
  return results.length ? results.map(item => `<button class="search-result" data-action="search-result" data-kind="${item.kind}" data-id="${item.id}">${icon(item.icon)}<strong>${item.name}</strong><small>${item.subtitle}</small></button>`).join('') : '<p class="search-empty">No stars by that name. Try a planet, a constellation, or “journal”.</p>';
}

function openSearch() {
  showModal(`<p class="eyebrow">SEARCH</p><h2 id="modal-title">What are you looking for?</h2><div class="search-field">${icon('search')}<input id="observatory-search" type="search" placeholder="Planets, puzzles, events, journal…" aria-label="Search the observatory" autocomplete="off"/></div><div id="search-results" aria-live="polite">${searchResults()}</div><p class="search-help"><kbd>Esc</kbd> to return to the stars <span style="float:right"><kbd>↵</kbd> to open the first result</span></p>`, '#observatory-search');
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function downloadEvent(id) {
  const event = events.find(item => item.id === id);
  if (!event) return;
  const end = parseDate(event.date);
  end.setDate(end.getDate() + 1);
  const escapeICS = value => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aether Observatory//Celestial Almanac//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${event.id}-2026@aether.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`, `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${dateKey(end).replace(/-/g, '')}`, `SUMMARY:${escapeICS(event.name)}`, `DESCRIPTION:${escapeICS(event.description + '\nBest viewing: ' + event.best + '.\nFrom the Æther 2026 almanac.')}`, 'END:VEVENT', 'END:VCALENDAR'];
  // RFC 5545 folds long content lines at 75 octets, without splitting UTF-8 characters.
  const encoder = new TextEncoder();
  const folded = lines.map(line => {
    let result = '';
    let width = 0;
    for (const character of line) {
      const length = encoder.encode(character).length;
      if (width + length > 75) { result += '\r\n '; width = 1; }
      result += character;
      width += length;
    }
    return result;
  }).join('\r\n') + '\r\n';
  downloadFile(`aether-${event.id}.ics`, folded, 'text/calendar;charset=utf-8');
  toast('Your invitation to the sky is ready. Open the .ics file in your calendar.');
}

function exportJournal() {
  const text = `ÆTHER · FIELD JOURNAL\nObserver: ${state.name}\nObservatory: ${currentLocation().name}\n\n${[...state.journal].sort((a, b) => b.date.localeCompare(a.date)).map(entry => `${entry.title}\n${formatDate(parseDate(entry.date))} · ${entry.subject}\n${'─'.repeat(45)}\n\n${entry.body}\n`).join('\n\n')}\nPer aspera ad astra.\n`;
  downloadFile('aether-field-journal.txt', text, 'text/plain;charset=utf-8');
  toast('Your observations, ready to take with you.');
}

function refreshChart() {
  const chart = main.querySelector('.chart-panel');
  if (chart) chart.outerHTML = renderChart(state.view === 'planetarium');
}

function updatePlanetPositions() {
  planets.forEach(planet => {
    const node = main.querySelector(`.planet-node[data-planet="${planet.id}"]`);
    const position = planetPosition(planet);
    node?.setAttribute('transform', `translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`);
  });
  const slider = main.querySelector('#orbital-time');
  const output = main.querySelector('#orbital-output');
  if (slider) slider.value = String(Math.floor(state.orbitalDay));
  if (output) output.textContent = `+ ${Math.floor(state.orbitalDay)} days`;
}

function stopPlayback() {
  state.playing = false;
  cancelAnimationFrame(playbackFrame);
  lastFrame = undefined;
}

function togglePlayback() {
  if (state.playing) {
    stopPlayback();
    refreshChart();
    return;
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.orbitalDay = (state.orbitalDay + 30) % 730;
    updatePlanetPositions();
    toast('Reduced motion is honoured. Time advances in 30-day steps.');
    return;
  }
  state.playing = true;
  refreshChart();
  // The output updates every frame while playing; keep it quiet for screen readers.
  main.querySelector('#orbital-output')?.setAttribute('aria-hidden', 'true');
  function tick(timestamp) {
    if (!state.playing) return;
    if (lastFrame !== undefined) state.orbitalDay = (state.orbitalDay + Math.min(timestamp - lastFrame, 100) * .025) % 730;
    lastFrame = timestamp;
    updatePlanetPositions();
    playbackFrame = requestAnimationFrame(tick);
  }
  playbackFrame = requestAnimationFrame(tick);
}

// The game ducks the Observatory's hum while a run plays, and hands it back.
window.AetherAmbience = {
  duck(on) {
    if (audioGain && audioContext) audioGain.gain.setTargetAtTime(on ? .05 : state.ambience ? .2 : 0, audioContext.currentTime, .4);
  },
};

async function toggleAmbience() {
  const button = document.querySelector('.ambience-toggle');
  try {
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('Audio unavailable');
      audioContext = new Context();
      audioGain = audioContext.createGain();
      audioGain.gain.value = 0;
      audioGain.connect(audioContext.destination);
      [130.81, 196, 261.63, 329.63].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const voiceGain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.detune.value = index % 2 ? 3 : -3;
        voiceGain.gain.value = .17 / (index + 1);
        oscillator.connect(voiceGain).connect(audioGain);
        oscillator.start();
      });
    }
    state.ambience = !state.ambience;
    if (state.ambience) await audioContext.resume();
    audioGain.gain.cancelScheduledValues(audioContext.currentTime);
    audioGain.gain.setTargetAtTime(state.ambience ? .2 : 0, audioContext.currentTime, .5);
    if (!state.ambience) setTimeout(() => { if (!state.ambience && audioContext?.state === 'running') audioContext.suspend(); }, 1400);
    button.setAttribute('aria-pressed', String(state.ambience));
    button.querySelector('span').textContent = state.ambience ? 'The sound of stillness' : 'Observatory ambience';
    toast(state.ambience ? 'A little atmosphere. Ambient tones are on.' : 'Back to the quiet. Ambient tones are off.');
  } catch {
    toast('Ambient sound isn’t available in this browser. The stars are still here.');
  }
}

function setMenuButton(open) {
  const button = document.querySelector('.mobile-menu');
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  button.querySelector('use').setAttribute('href', `assets/victorian-icons.svg#${open ? 'close' : 'menu'}`);
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  setMenuButton(false);
  document.querySelector('.sidebar').inert = window.innerWidth <= 720;
  document.querySelector('.workspace').inert = false;
}

document.addEventListener('click', event => {
  const routeLink = event.target.closest('a[href^="#"]');
  if (routeLink && Object.hasOwn(renderers, routeLink.getAttribute('href').slice(1))) {
    event.preventDefault();
    navigate(routeLink.getAttribute('href').slice(1));
    return;
  }
  const target = event.target.closest('[data-action], [data-planet], [data-constellation], [data-event]');
  if (!target) return;
  if (target.dataset.planet) return openPlanet(target.dataset.planet);
  if (target.dataset.constellation) return openConstellation(target.dataset.constellation);
  if (target.dataset.event) return openEvent(target.dataset.event);
  const { action, id } = target.dataset;
  switch (action) {
    case 'close-modal': closeModal(); break;
    case 'menu': {
      const expanded = document.body.classList.toggle('menu-open');
      setMenuButton(expanded);
      document.querySelector('.sidebar').inert = !expanded;
      document.querySelector('.workspace').inert = expanded;
      if (expanded) document.querySelector('.primary-nav a').focus();
      break;
    }
    case 'close-menu':
      closeMenu();
      document.querySelector('.mobile-menu').focus({ preventScroll: true });
      break;
    case 'ambience': toggleAmbience(); break;
    case 'profile': openProfile(); break;
    case 'location': openLocation(); break;
    case 'set-location':
      if (locations.some(location => location.id === id)) {
        state.location = id;
        const saved = persist();
        closeModal();
        render();
        if (saved) toast(`Your observatory now overlooks ${currentLocation().name}.`);
      }
      break;
    case 'search': openSearch(); break;
    case 'search-result':
      if (target.dataset.kind === 'easter-egg') {
        closeModal();
        toast('Pluto was reclassified in 2006. Here, it is forever a planet of the heart.');
      }
      else if (target.dataset.kind === 'page') navigate(id);
      else openItem(id);
      break;
    case 'notifications': openNotifications(); break;
    case 'about': openAbout(); break;
    case 'date': openDatePicker(); break;
    case 'moon': openMoon(); break;
    case 'new-entry': openJournalForm(null, target.dataset.subject || ''); break;
    case 'read-entry': readEntry(id); break;
    case 'edit-entry': openJournalForm(id); break;
    case 'delete-entry':
      if (target.dataset.armed) deleteEntry(id);
      else {
        target.dataset.armed = 'true';
        target.innerHTML = `${icon('trash')}Click again to discard`;
        toast('This can’t be undone. Click once more to discard the page.');
      }
      break;
    case 'export-journal': exportJournal(); break;
    case 'go-calendar': navigate('calendar'); break;
    case 'download-event': downloadEvent(id); break;
    case 'toggle-saved': toggleSaved(id); break;
    case 'remove-saved': toggleSaved(id, true); break;
    case 'open-item': openItem(id); break;
    case 'map-mode':
      stopPlayback();
      state.mapMode = target.dataset.mode;
      refreshChart();
      main.querySelector(`[data-mode="${state.mapMode}"]`)?.focus({ preventScroll: true });
      break;
    case 'playback': togglePlayback(); break;
    case 'reset-orbits':
      stopPlayback();
      state.orbitalDay = 0;
      refreshChart();
      break;
    case 'select-day':
      state.selectedDate = parseDate(target.dataset.date);
      state.suppressEnter = true;
      render();
      state.suppressEnter = false;
      main.querySelector(`[data-date="${dateKey(state.selectedDate)}"]`)?.focus({ preventScroll: true });
      break;
    case 'month-prev':
    case 'month-next':
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + (action === 'month-next' ? 1 : -1), 1, 12);
      state.suppressEnter = true;
      state.calendarDir = action === 'month-next' ? 'leaf-next' : 'leaf-prev';
      render();
      state.suppressEnter = false;
      state.calendarDir = null;
      main.querySelector(`[data-action="${action}"]`)?.focus({ preventScroll: true });
      break;
    case 'calendar-today':
      state.selectedDate = new Date();
      state.selectedDate.setHours(12, 0, 0, 0);
      state.calendarMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1, 12);
      state.suppressEnter = true;
      render();
      state.suppressEnter = false;
      break;
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'observatory-search') document.querySelector('#search-results').innerHTML = searchResults(event.target.value);
  if (event.target.id === 'orbital-time') {
    const wasPlaying = state.playing;
    stopPlayback();
    state.orbitalDay = Number(event.target.value);
    if (wasPlaying) {
      const playButton = main.querySelector('[data-action="playback"]');
      playButton.innerHTML = icon('play');
      playButton.setAttribute('aria-label', 'Animate planetary motion');
      playButton.setAttribute('aria-pressed', 'false');
      main.querySelector('#orbital-output')?.removeAttribute('aria-hidden');
    }
    updatePlanetPositions();
  }
});

document.addEventListener('submit', event => {
  if (!['journal-form', 'profile-form', 'date-form'].includes(event.target.id)) return;
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.id === 'journal-form') {
    const title = data.get('title').trim();
    const body = data.get('body').trim();
    if (!title || !body) return toast('Give this moment a title and a few words before keeping it.');
    const existing = state.journal.find(entry => entry.id === form.dataset.id);
    const entry = { id: existing?.id || crypto.randomUUID(), title, body, subject: data.get('subject').trim() || 'The night sky', date: data.get('date') };
    if (existing) state.journal = state.journal.map(item => item.id === entry.id ? entry : item);
    else state.journal.unshift(entry);
    const saved = persist();
    closeModal();
    render();
    main.querySelector(`.journal-card:has([data-id="${CSS.escape(entry.id)}"])`)?.classList.add('card-arrive');
    if (saved) toast(existing ? 'Your observation has been updated.' : 'A moment, kept. Your observation is saved.');
  } else if (form.id === 'profile-form') {
    const name = data.get('name').trim();
    if (!name) return toast('Every observer needs a name.');
    state.name = name;
    state.location = data.get('location');
    const saved = persist();
    closeModal();
    render();
    if (saved) toast(`Welcome home, ${state.name}.`);
  } else {
    const date = parseDate(data.get('date'));
    if (Number.isNaN(date.getTime())) return toast('Choose a date between 1900 and 2199.');
    state.selectedDate = date;
    state.calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    closeModal();
    render();
    toast(`The observatory is set to ${formatDate(date)}.`);
  }
});

document.addEventListener('keydown', event => {
  const editing = event.target.closest('input, textarea, select, [contenteditable]');
  // A single Escape always honours the search hint, even with text in the
  // field — Chromium would otherwise spend the first press clearing it.
  if (event.key === 'Escape' && event.target.id === 'observatory-search') {
    event.preventDefault();
    closeModal();
    return;
  }
  // Both search shortcuts honour the same guards: never while editing or with a modal open.
  if ((((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') || event.key === '/') && !editing && !modal.open) {
    event.preventDefault();
    openSearch();
  }
  if (event.key === 'Escape') {
    if (document.body.classList.contains('menu-open')) {
      closeMenu();
      document.querySelector('.mobile-menu').focus();
    }
  }
  if (event.target.id === 'observatory-search' && event.key === 'Enter') {
    event.preventDefault();
    modal.querySelector('.search-result')?.click();
  }
  if (event.target.id === 'observatory-search' && event.key === 'ArrowDown') {
    event.preventDefault();
    modal.querySelector('.search-result')?.focus();
  }
  if (event.target.matches('.search-result') && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const sibling = event.key === 'ArrowDown' ? event.target.nextElementSibling : event.target.previousElementSibling;
    (sibling || modal.querySelector('#observatory-search'))?.focus();
  }
  if (event.target.matches('.planet-node, .constellation-node') && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
  if (event.key === 'Tab' && document.body.classList.contains('menu-open') && !modal.open) {
    const focusable = [...document.querySelectorAll('.sidebar a, .sidebar button')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

modal.addEventListener('click', event => {
  if (event.target !== modal) return;
  const bounds = modal.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeModal();
});

modal.addEventListener('close', () => {
  window.AetherVoyage?.resume?.();
  const fallback = modalTriggerSelector ? document.querySelector(modalTriggerSelector) : null;
  const target = modalTrigger?.isConnected ? modalTrigger : fallback;
  target?.focus({ preventScroll: true });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state.playing) { stopPlayback(); refreshChart(); }
    if (audioContext?.state === 'running') audioContext.suspend();
  } else if (state.ambience && audioContext?.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
});

window.addEventListener('hashchange', handleRoute);
window.addEventListener('resize', () => {
  if (window.innerWidth > 720 || !document.body.classList.contains('menu-open')) closeMenu();
});

document.addEventListener('DOMContentLoaded', handleRoute, { once: true });
