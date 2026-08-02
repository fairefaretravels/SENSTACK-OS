# SENSTACK OS — Agent Manifest

A single source of truth for every AI (and human) employee in the building. Today your HTML page hardcodes a `DEPARTMENTS` array with the UI fields (emoji, status, blurb, prompt). This manifest keeps those fields but adds the fields that turn a "Copy prompt" card into an actual dispatchable, callable AI employee.

## Files

| File | Purpose |
|---|---|
| `agent-manifest.schema.json` | The format itself — a JSON Schema. Validate any manifest against this. |
| `senstack-agents.manifest.json` | Your current 20 agents across 7 departments + founder, fully populated from the prototype. |
| `manifest-loader.js` | Drop-in adapter: fetches the manifest, reshapes it into the exact shape your existing card renderer already expects, and upgrades the Chief of Staff dispatcher to route by real capability instead of a bare name list. |

## Why this shape

Your HTML card only ever needed: `emoji, name, title, status, task, blurb, specs, prompt`. That's a **UI record**. It's not enough to actually *run* an agent. The manifest keeps every UI field and adds the **operating fields**:

- **`role` / `mission`** — what this seat is actually for, in a sentence. Lets a future "hire a new agent" flow generate a sane default instead of a blank card.
- **`instructions`** — same content as your current `prompt` field, renamed to match how you'll actually use it: as the `system` prompt in a real API call, not just clipboard text.
- **`knowledge_base`** — what this agent should be grounded in (SENSTACK modules, brand docs, other agents' outputs). Right now nothing constrains what an agent "knows" — this is the hook for that later.
- **`tasks`** — a list of concrete task types. This is what makes the Chief of Staff dispatcher real: instead of guessing from a role name, it can match "draft the signup page" to the Copywriter because `tasks` says so.
- **`example_outputs`** — a couple of trigger→output pairs per agent, useful both as documentation and as few-shot examples if you ever want tighter output formatting from the API.
- **`model` / `tools`** — per-agent overrides, so a simple role (Social Media Manager) can run cheap and a strategic role (Marketing Director) can run on a stronger model, or get `web_search` when a role like Business Analyst actually needs current data.

Nothing about your card UI has to change. `manifest-loader.js` reshapes the manifest into your existing `DEPARTMENTS`/`roles` structure, so `index.html`'s render loop, modal, and dispatch console all keep working unmodified.

## Adopting it (3 steps)

1. Drop `senstack-agents.manifest.json` next to your HTML file (same folder, or update `MANIFEST_URL` in the loader).
2. In the HTML, delete the hardcoded `const DEPARTMENTS = [ ... ]` block. Wrap the section that builds `#roster` (the `DEPARTMENTS.forEach(dept => {...})` loop) in a function, e.g. `function renderRoster(){ ... }`.
3. Add `manifest-loader.js` as a `<script>` and call:
   ```html
   <script src="manifest-loader.js"></script>
   <script>
     let DEPARTMENTS = [];
     loadManifest().then(depts => { DEPARTMENTS = depts; renderRoster(); });
   </script>
   ```

The dispatch console's `ROLE_LIST` constant can be replaced with `buildRoleContext(manifest)` from the loader once you're passing the manifest through — the Chief of Staff will then route based on each agent's real `tasks`, not just its title.

## Growing the roster

To hire a new agent: add one object to the right department's `agents` array (or a new department) matching the schema. No HTML changes needed — the loader and renderer already handle any number of agents/departments. Set `status: "recruiting"` and omit `current_task` for a seat that's defined but not live yet, exactly like your current "Seat open" cards.

To retire an agent: don't delete their `id` and reuse it for someone else — remove the object but keep the id reserved, in case task history elsewhere ever references it.
