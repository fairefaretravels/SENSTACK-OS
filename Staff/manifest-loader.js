/**
 * SENSTACK OS — Manifest Loader
 * ------------------------------------------------------------
 * Drop-in replacement for the hardcoded `const DEPARTMENTS = [...]`
 * block in the HQ prototype. Fetches senstack-agents.manifest.json,
 * reshapes it to the exact shape the existing renderer expects,
 * and falls back to a tiny built-in roster if the fetch fails —
 * so the page never renders empty.
 *
 * Usage: replace `const DEPARTMENTS = [ ... ]` in the HTML with:
 *
 *   let DEPARTMENTS = [];
 *   loadManifest().then(depts => { DEPARTMENTS = depts; renderRoster(); });
 *
 * ...and wrap the existing "DEPARTMENTS.forEach(...)" render block
 * (the part that builds #roster) in a `function renderRoster(){ ... }`.
 */

const MANIFEST_URL = "senstack-agents.manifest.json";

// Holds the last successfully fetched raw manifest (not reshaped), so the
// dispatch console can build role context / call runDispatchFromManifest
// without fetching a second time. Null until loadManifest() resolves.
let LAST_MANIFEST = null;

async function loadManifest() {
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
    const manifest = await res.json();
    LAST_MANIFEST = manifest;
    return manifestToDepartments(manifest);
  } catch (err) {
    console.warn("Manifest load failed, using fallback roster:", err);
    LAST_MANIFEST = null;
    return FALLBACK_DEPARTMENTS;
  }
}

/**
 * Reshapes a manifest.json into the DEPARTMENTS[] shape the existing
 * card renderer already knows how to draw. Keeps the renderer untouched —
 * all the adaptation happens here.
 */
function manifestToDepartments(manifest) {
  const founder = manifest.founder;

  return manifest.departments.map((dept, i) => {
    const agents = dept.agents.map(a => ({
      emoji: a.emoji || "🤖",
      name: a.name,
      title: a.title,
      human: !!a.human,
      status: a.status,
      statusLabel: a.status_label,
      task: a.current_task || undefined,
      blurb: a.blurb,
      specs: a.specs || [],
      photo: a.avatar && a.avatar.type === "photo" ? a.avatar.photo : undefined,
      prompt: a.instructions
    }));

    // Executive floor also renders the human founder card first, if present.
    if (i === 0 && founder) {
      agents.unshift({
        emoji: "🟣",
        name: founder.name,
        title: founder.title,
        human: true,
        status: "waiting",
        statusLabel: "In the building",
        blurb: founder.blurb,
        specs: founder.specs || []
      });
    }

    return {
      id: dept.id,
      floor: dept.floor,
      name: dept.name,
      note: dept.note,
      roles: agents
    };
  });
}

/**
 * Minimal safety net — only used if senstack-agents.manifest.json
 * can't be fetched (offline preview, bad path, CORS, etc).
 */
const FALLBACK_DEPARTMENTS = [
  {
    id: "dept-exec",
    floor: "FL 01",
    name: "Executive Leadership",
    note: "Sets the mission and keeps every other floor pointed at it.",
    roles: [
      { emoji: "🟣", name: "Founder", title: "Chief Executive", human: true, status: "waiting", statusLabel: "In the building", blurb: "Vision, partnerships, final approval.", specs: ["Vision"] }
    ]
  }
];

/**
 * ------------------------------------------------------------
 * Chief of Staff dispatcher, upgraded to read the manifest.
 * Replaces the ROLE_LIST constant + runDispatch()'s hardcoded
 * fallback in the original prototype: the dispatcher now knows
 * about every agent's `tasks` field, not just its name+emoji, so
 * a live Claude call can match a goal to the right agent using
 * real capability descriptions instead of a bare role list.
 * ------------------------------------------------------------
 */
function buildRoleContext(manifest) {
  return manifest.departments
    .flatMap(d => d.agents)
    .map(a => `${a.emoji} ${a.name} (${a.title}) — handles: ${(a.tasks || []).join("; ")}`)
    .join("\n");
}

async function runDispatchFromManifest(goal, manifest) {
  const roleContext = buildRoleContext(manifest);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are the Chief of Staff AI dispatching a goal to departments. Available department AIs and what each actually handles:\n${roleContext}\n\nGoal: "${goal}". Respond ONLY with a raw JSON array (no markdown fences, no prose) of 4 to 6 objects, each shaped like {"emoji": "📦", "role": "Product Manager", "task": "one short imperative task tied to the goal"}. Match agents to the goal using their real capabilities above, not just their titles.`
      }]
    })
  });
  const data = await response.json();
  const text = data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
