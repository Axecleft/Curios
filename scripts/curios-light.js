/**
 * Axecleft's Curios — light on permanent magic items (rings, rods, staffs, wondrous and universal items).
 *
 * Follows the Treasure Generator's Generation settings, row "Other permanent magic items" (house rule: 1% of
 * random items, 5 ft. bright / 10 ft. dim by default). With "Light color and animation follow the item's
 * abilities" ticked, the light takes its look from the item's school of magic (read from its aura line,
 * "Moderate evocation"); with "Stronger items glow brighter", faint to overwhelming auras glow brighter.
 * Never on potions, scrolls, wands or other consumables (SRD: not permanent).
 */
const T = () => globalThis.AxecleftTreasure;

/** Looks by school of magic (and a few words in the name that win over the school). */
export const THEMES = {
  abjuration: { color: "#9fd8ff", type: "dome", speed: 2, intensity: 3 },
  conjuration: { color: "#c6f08a", type: "pulse", speed: 3, intensity: 4 },
  divination: { color: "#e8f4ff", type: "sunburst", speed: 2, intensity: 3 },
  enchantment: { color: "#ff9ad5", type: "chroma", speed: 3, intensity: 4 },
  evocation: { color: "#ff8a3d", type: "torch", speed: 5, intensity: 5 },
  illusion: { color: "#c49bff", type: "wave", speed: 3, intensity: 4 },
  necromancy: { color: "#8fbf7a", type: "ghost", speed: 2, intensity: 3 },
  transmutation: { color: "#ffd966", type: "pulse", speed: 2, intensity: 3 },
  universal: { color: "#ffffff", type: "", speed: 3, intensity: 3 },
  // Psionic items (disciplines): a cool crystalline glow
  psionic: { color: "#a8f0ff", type: "energy", speed: 3, intensity: 4 },
};
const WORDS = [
  [/\b(fire|flame|flaming|ember|burning|fireball|blaze)\b/i, { color: "#ff6a1a", type: "flame", speed: 5, intensity: 5 }],
  [/\b(frost|ice|cold|winter|icy)\b/i, { color: "#bfe6ff", type: "pulse", speed: 2, intensity: 3 }],
  [/\b(lightning|shock|storm|thunder)\b/i, { color: "#cfe3ff", type: "torch", speed: 8, intensity: 6 }],
  [/\b(holy|radiant|sun|daylight|celestial)\b/i, { color: "#ffd966", type: "sunburst", speed: 2, intensity: 4 }],
  [/\b(unholy|shadow|night|darkness)\b/i, { color: "#8a4dcc", type: "ghost", speed: 2, intensity: 3 }],
];
const NEUTRAL = [{ color: "#ffffff", type: "" }, { color: "#cfe8ff", type: "pulse", speed: 2, intensity: 2 }, { color: "#ffe9b0", type: "" }];
const STRENGTH = { faint: 1, moderate: 2, strong: 3, overwhelming: 4 };

/** "Moderate evocation; CL 10th; …" → { school, strength } from an item's description. */
export function auraOf(html) {
  const t = String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const m = t.match(/\b(faint|moderate|strong|overwhelming)\b[^;]{0,40}?\b(abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation|universal|clairsentience|metacreativity|psychokinesis|psychometabolism|psychoportation|telepathy)\b/i);
  if (!m) return { school: null, strength: 1 };
  const psi = /clairsentience|metacreativity|psychokinesis|psychometabolism|psychoportation|telepathy/i.test(m[2]);
  return { school: psi ? "psionic" : m[2].toLowerCase(), strength: STRENGTH[m[1].toLowerCase()] ?? 1 };
}

/** The light for an item (or null). force: true = always (crafting, the Curios tab), false = never, null = Generation settings. */
export function rollLight(data, { force = null } = {}) {
  const hub = T();
  if (force === false) return null;
  if (force !== true && !hub?.genChance?.("light", "other")) return null;
  const g = hub?.generation?.()?.light ?? { themes: true, powerBrightness: true, other: { bright: 5, dim: 10 } };
  const aura = auraOf(data?.system?.description?.value);
  let th = null;
  if (g.themes !== false) th = WORDS.find(([re]) => re.test(data?.name ?? ""))?.[1] ?? (aura.school ? THEMES[aura.school] : null);
  th ??= NEUTRAL[Math.floor(Math.random() * NEUTRAL.length)];
  const power = g.powerBrightness !== false ? aura.strength : 1;
  return {
    color: th.color, type: th.type ?? "", speed: th.speed ?? 3,
    intensity: Math.min(10, (th.intensity ?? 3) + (power - 1)),
    alpha: Math.round(Math.min(0.9, 0.35 + 0.1 * power) * 100) / 100,
    bright: Number(g.other?.bright ?? 5) || 5, dim: Number(g.other?.dim ?? 10) || 10,
  };
}

/** Put the light on D35E item data (system.light) and say so in its description. Leaves items that already shed light alone. */
export function applyLight(data, l) {
  if (!l || data?.system?.light?.emitLight) return false;
  data.system.light = {
    ...(data.system.light ?? {}),
    emitLight: true, color: l.color, radius: l.bright, dimRadius: l.dim, alpha: l.alpha, type: l.type,
    animationSpeed: l.speed, animationIntensity: l.intensity, lightAngle: 360,
  };
  const tr = globalThis.AxecleftTools?.t ?? ((s, d) => (d ? String(s).replace(/\{(\w+)\}/g, (m, k) => d[k] ?? m) : s));
  const note = `<p><em>${tr(/*t*/"It sheds light ({bright} ft. bright, {dim} ft. dim).", { bright: l.bright, dim: l.dim })}</em></p>`;
  data.system.description ??= {};
  data.system.description.value = `${data.system.description.value ?? ""}${note}`;
  if (data.system.description.unidentified !== undefined || data.system.identified === false) {
    data.system.description.unidentified = `${data.system.description.unidentified ?? ""}<p><em>${tr(/*t*/"It sheds light.")}</em></p>`;
  }
  return true;
}

/** Roll and apply in one go; returns true when the item now sheds light. */
export function maybeLight(data, opts) { return applyLight(data, rollLight(data, opts)); }
