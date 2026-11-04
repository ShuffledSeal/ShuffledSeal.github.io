# OpenCode — Æther Grand Tour setup

`AGENTS.md` is automatically read from the repository root by OpenCode; the game-specific primary agent is in `.opencode/agents/aether-director.md`. That agent requests **GPT-6.1 Sol** using the OpenCode Models identifier `opencode/gpt-6.1-sol` (change the frontmatter if your provider uses a different model ID).

## Start

```bash
cd /path/to/aether-grand-tour
opencode models     # verify that opencode/gpt-6.1-sol is available
opencode
```

Select the **aether-director** primary agent in OpenCode (cycle agents with Tab); do **not** run `/init`, which may rewrite the curated `AGENTS.md`.

## First prompt to give the agent

> Continue developing Æther Grand Tour using AGENTS.md and ROADMAP.md. Start with the highest-impact unfinished P0 issue. Inspect only relevant code, define concrete acceptance criteria, implement a complete playable fix, verify syntax plus real browser interactions, critique the result and refine once if needed. Preserve all existing cartridges, saves and the dependency-free GitHub Pages build. Then move to one P1 gameplay-depth slice if P0 is stable. Make actual code changes, not just a plan. Do not deploy or claim £90 readiness without evidence.

## Useful follow-up prompts

- `Deepen Starship Hunts with one genuinely new weapon family, telegraphed enemy counterplay, a meaningful upgrade choice and a browser-verified 10-minute mastery loop.`
- `Make Aether Bastion replayable: add one handcrafted mission, an economy tradeoff and two viable tower build paths, then test win/loss and restart.`
- `Audit all trials for mount/destroy leaks, double onEnd callbacks, cursor mapping, focus loss, save integrity and performance; fix and verify the highest-impact defects.`
- `Improve Glass Labyrinth's stealth readability and level design while preserving mouse/keyboard controls. Test that rendered vision cones match actual detection.`

## Quality limits

The game runs as static files; Node's `--check` and the Python HTTP server need no npm setup. Browser E2E automation is not bundled; an agent must create/check in any tests it claims are repeatable. Local previews are not deployment. The current build is a substantial prototype, not a validated £90 commercial title.
