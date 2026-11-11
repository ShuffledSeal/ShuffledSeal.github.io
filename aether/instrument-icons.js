'use strict';

// Small engraved instrument illustrations for upgrade and relic choices.
// These are inline SVG, not a glyph font or an external runtime dependency.
window.AetherIcons = (() => {
  const paths = {
    needle: '<circle cx="24" cy="22" r="12"/><circle cx="24" cy="22" r="6" stroke-dasharray="2 3"/><path d="M24 3v9M24 32v13M3 22h9M36 22h9M15 13l18 18M33 13 15 31M24 14l3 8-3 8-3-8ZM12 40h24M17 36h14"/>',
    frostbell: '<path d="M12 34h24l-4-7V17c0-13-16-13-16 0v10Z"/><path d="M9 34h30M13 39h22M20 43h8M24 3v5M20 4h8M24 15v12M18 21h12M19 16l10 10M29 16 19 26M24 12l2 3 3 1-3 2-2 3-2-3-3-1 3-2Z"/>',
    prism: '<path d="m24 3 16 19-16 23L8 22Z"/><path d="m24 3 5 19-5 23-5-23ZM8 22h32M14 22l10-10 10 10M24 22v23M4 10l8 4M36 6l-5 7M42 30l-8-3M7 38l7-7"/><circle cx="24" cy="22" r="3" fill="currentColor" fill-opacity=".2"/>',
    sunmine: '<circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="15" stroke-dasharray="2 3"/><path d="M24 3v7M24 38v7M3 24h7M38 24h7M9 9l5 5M34 34l5 5M39 9l-5 5M14 34l-5 5M17 24h14M24 17v14M18 18l12 12M30 18 18 30"/>',
    attraction: '<circle cx="13" cy="25" r="7"/><circle cx="34" cy="20" r="5"/><path d="M4 14c8-10 26-11 35 1M6 37c12 8 28 6 37-5M39 15l1-7 6 3M6 32l-3 7-3-6M17 20c5-4 10-4 14-1" stroke-dasharray="2 2"/>',
    energy: '<path d="m24 3 18 10v22L24 45 6 35V13Z"/><path d="m27 8-12 17h9l-3 15 12-19h-9Z" fill="currentColor" fill-opacity=".18"/><circle cx="24" cy="24" r="20" stroke-dasharray="1 4"/>',
    aegis: '<path d="M24 3 40 9v12c0 12-8 20-16 25C16 41 8 33 8 21V9Z"/><path d="M24 8v32M13 12c7 2 15 2 22 0M24 13l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="currentColor" fill-opacity=".14"/>',
    compass: '<circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="14" stroke-dasharray="1 3"/><path d="m30 12-4 14-14 4 4-14ZM24 1v5M24 42v5M1 24h5M42 24h5M24 20v8"/><circle cx="24" cy="24" r="2" fill="currentColor"/>',
    reach: '<path d="M7 36C12 12 29 5 43 18M5 28c15-13 28-13 38-1M7 36l-3 7 8-1M43 18l1-8 5 6M16 34c8-10 14-14 22-13" stroke-dasharray="3 2"/><circle cx="11" cy="34" r="4"/><circle cx="35" cy="18" r="3"/>',
    flight: '<path d="M22 21C13 6 3 8 4 17c7 0 10 5 8 12 6 0 10-3 14-6M26 21c9-15 19-13 18-4-7 0-10 5-8 12-6 0-10-3-14-6M24 13v28M19 28h10l-2 11h-6ZM24 13l-5-6M24 13l5-6M10 17l10 6M38 17l-10 6"/>',
    echo: '<circle cx="19" cy="24" r="12"/><circle cx="29" cy="24" r="12" stroke-dasharray="2 3"/><path d="M8 12c9-7 23-7 32 0M8 36c9 7 23 7 32 0M19 18v12M13 24h12M29 20v8M25 24h8"/>',
    time: '<path d="M11 4h26M11 44h26M15 4c0 14 4 15 9 20-5 5-9 6-9 20h18c0-14-4-15-9-20 5-5 9-6 9-20ZM15 8h18M15 40h18M19 30h10l-5-6Z" fill="currentColor" fill-opacity=".14"/><path d="M8 4h4M36 4h4M8 44h4M36 44h4"/>',
    comet: '<path d="M5 8c13 0 22 5 28 14M3 15c11 0 19 4 25 12M6 22c8 0 14 3 19 8M9 3c13 1 22 6 28 14"/><circle cx="29" cy="32" r="10"/><path d="m25 30 14-14M30 32l10-10M34 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/>',
    lens: '<circle cx="21" cy="21" r="13"/><circle cx="21" cy="21" r="9" stroke-dasharray="1 2"/><path d="m29 29 14 14M34 34l4-4M21 12v18M12 21h18M21 16l2 4 4 1-4 2-2 4-2-4-4-2 4-1ZM38 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/>',
    gambit: '<circle cx="15" cy="17" r="9"/><circle cx="15" cy="17" r="4"/><path d="m21 23 19 19M29 29l5-5M34 34l5-5M38 38l4-4M25 27l4-4M9 4l6 2 6-2"/>',
    bloom: '<path d="m24 3 4 13 13 4-13 4-4 13-4-13-13-4 13-4ZM39 6l1.5 5.5L46 13l-5.5 1.5L39 20l-1.5-5.5L32 13l5.5-1.5ZM9 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/><circle cx="24" cy="20" r="5" fill="currentColor" fill-opacity=".16"/>',
    ribbon: '<path d="M6 14c8 18 20 22 34 12M10 32c8-12 17-14 28-4" stroke-dasharray="3 2"/><circle cx="7" cy="14" r="4"/><circle cx="14" cy="29" r="4"/><circle cx="27" cy="32" r="4"/><circle cx="40" cy="26" r="4"/>',
    halo: '<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="5"/><circle cx="24" cy="9" r="4"/><circle cx="37" cy="32" r="4"/><circle cx="11" cy="32" r="4"/><path d="M24 14v5M33 28l-5 4M15 28l5 4"/>',
    spear: '<path d="m24 5 16 34H8ZM24 15v24M16 29l8 5 8-5"/><circle cx="24" cy="5" r="3"/><circle cx="16" cy="29" r="3"/><circle cx="32" cy="29" r="3"/><circle cx="24" cy="39" r="3"/>',
  };
  const aliases = {
    guard: 'aegis', power: 'energy', pursuit: 'compass', shelter: 'aegis', surge: 'energy', mend: 'bloom',
    fork: 'ribbon', pierce: 'needle', magnet: 'attraction', ward: 'aegis', haste: 'flight', frost: 'frostbell', nova: 'sunmine',
    veil: 'flight', chime: 'echo', runner: 'compass', siphon: 'prism', mercy: 'lens',
    'echo-hourglass': 'time', 'quake-core': 'sunmine', 'binary-heart': 'attraction', 'guiding-thread': 'needle', 'pulse-dynamo': 'energy', 'deep-cradle': 'aegis',
    'ring-compass': 'compass', 'solar-spool': 'energy', 'longwave-tether': 'reach', 'moon-sail': 'flight', 'comet-aegis': 'aegis', 'ring-reactor': 'energy',
    lodestone: 'attraction', 'star-aegis': 'aegis', 'wide-halo': 'reach', afterimage: 'echo', 'ion-cell': 'energy', 'second-hand': 'time',
    'twin-comet': 'comet', shatterglass: 'prism', 'crescent-crown': 'reach', 'dense-core': 'sunmine', 'chrono-coil': 'time', 'return-sigil': 'aegis',
    'echo-plate': 'echo', 'lodestone-coil': 'attraction', 'rime-coating': 'frostbell', 'static-net': 'energy', 'longwake-sail': 'flight', 'parallax-mirror': 'prism', 'starforged-rail': 'needle', 'tempest-fuse': 'energy', 'aurora-siphon': 'bloom',
  };
  function upgrade(id) {
    const key = paths[id] ? id : aliases[id] || 'bloom';
    return `<svg class="upgrade-icon" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${paths[key]}</svg>`;
  }
  return { upgrade };
})();
