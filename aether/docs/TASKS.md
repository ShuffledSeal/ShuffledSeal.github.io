# Æther Task Ledger

This ledger records actual checkout evidence. The master plan remains the product specification.

| ID | Status | Evidence | Next action |
| --- | --- | --- |
| AG-001 | verified | `docs/BASELINE_AUDIT.md` | Keep inventory current when contracts change. |
| AG-002 | partial | `tests/browser-smoke.mjs`, `tests/verify-trial-registry.mjs` | Cover arcade, wonder rooms, pause/restart, and root-to-cartridge journeys. |
| AG-003 | partial | Browser smoke proves valid legacy-save loading, corrupt-save recovery, and Tour reload persistence. | Add versioned migrations if a schema changes. |
| AG-004 | partial | Browser smoke proves scaled Skirmish flight and scaled Comet Surf pointer cancellation. | Test zoom, DPR, and other pointer-driven games. |
| AG-006 | partial | Arcade, telescope, world painting, and darkroom cancellation paths clear input. | Audit remaining room input release paths. |
| AG-010 | partial | Route teardown invalidates in-flight music export; cartridge and trial teardown covered indirectly. | Exercise repeated mount/unmount and audio cleanup across all hosts. |
| AG-201 | partial | Grand Tour has a seeded map and visible nodes. | Validate reward/branch rationale with focused gameplay coverage. |
| AG-204 | partial | Skirmish direct cartridge has endless escalation. | Verify enemy-family/miniboss counterplay and balance through play. |
| AG-206 | partial | Bastion has upgrades, endless siege, range previews, and telegraphed incoming lanes. | Add authored terrain choices. |
| AG-208 | partial | Labyrinth has visible cones, veil, and looping circuits. | Validate multi-route depth and touch controls. |

## Next Unblocked Slice

**AG-003: save fixtures and safe-load coverage.** It protects every existing player before adding content, is measurable in the present static architecture, and unblocks honest progression work.
