# Æther Task Ledger

This ledger records actual checkout evidence. The master plan remains the product specification.

| ID | Status | Evidence | Next action |
| --- | --- | --- | --- |
| AG-001 | verified | `docs/BASELINE_AUDIT.md` | Keep inventory current when contracts change. |
| AG-002 | partial | `tests/browser-smoke.mjs`, `tests/verify-trial-registry.mjs` | Cover win/loss end paths and retry flows; pause now covered for all trials + hunts. |
| AG-003 | verified | Checked-in legacy and malformed-shape fixtures prove versioned Tour migration, bounded recovery, unrelated-key preservation, and reload persistence. | Extend fixtures whenever a storage schema changes. |
| AG-004 | partial | Browser smoke proves scaled Skirmish flight, scaled Comet Surf cancellation, keyboard fire, modal/blur pause, and persisted-map reloads. | Test zoom, DPR, and other pointer-driven games. |
| AG-006 | partial | Arcade, telescope, world painting, and darkroom cancellation paths clear input. | Audit remaining room input release paths. |
| AG-010 | verified | Starforge end-timer cancelled on destroy/reset with checked-in regression; all 16 trials pause/resume/destroy without callbacks after destroy; voyage unmount tears down both handles. | Exercise repeated mount/unmount and audio cleanup across all hosts. |
| AG-201 | verified | Grand Tour has a seeded map with visible nodes; the dealt map is persisted in the save and asserted identical across reloads. | Validate reward/branch rationale with focused gameplay coverage. |
| AG-204 | partial | Skirmish direct cartridge has endless escalation; keyboard fire, blur pause, and modal pause are now covered. | Verify enemy-family/miniboss counterplay and balance through play. |
| AG-206 | partial | Bastion has upgrades, endless siege, range previews, telegraphed lanes, and engine pause; Prism's beam damage is now regression-tested. Daily Vigil adds same-seed attempts. | Add authored terrain choices and more than one viable opening strategy. |
| AG-208 | partial | Labyrinth cones match detection; Prism Decoy and optional recharge fragments add counterplay; daily patrol formations and later endless circuits remix guard starts. Keyboard and touch activation smoke-tested. | Validate alternate-route depth and balance through external play. |

## Next Unblocked Slice

**AG-004: browser zoom and DPR input coverage.** Scaled-canvas regressions are covered; zoom and device-pixel-ratio cases are the next measurable input risk.
