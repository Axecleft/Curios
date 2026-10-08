/**
 * Axecleft's Curios — reading an SRD magic item's construction line from its description.
 *
 * D35E keeps the SRD statblock as text at the end of each item, in two styles:
 *   "Moderate transmutation; CL 10th; Craft Wondrous Item, bull's strength; Price 16,000 gp (+4), 36,000 gp (+6)"
 *   "Caster Level: 20th; Prerequisites: Forge Ring, Forge Epic Ring, iron body; Market Price: 400,000 gp; Cost to Create: … gp + … XP"
 * Some list one caster level per version: "CL 11th ( I ), 14th ( II ), 17th ( III ), 20th ( IV )".
 * parsePrereqs() turns that into { cl, feats, spells: [[a, b]...], align, skills, minLevel, race, factor, other, cost }.
 * Spell lists follow the SRD's own "or": "flame blade, flame strike, or fireball" is flame blade plus one of the other two.
 */
const normName = (s) => String(s ?? "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']+/g, " ").trim();

/** The item creation feats (D35E's Feats compendium names) and their SRD minimum caster levels. */
export const CREATION_FEATS = {
  "scribe scroll": 1, "brew potion": 3, "craft wondrous item": 3, "craft magic arms and armor": 5, "craft wand": 5,
  "craft rod": 9, "forge ring": 12, "craft staff": 12,
  "imprint stone": 1, "scribe tattoo": 3, "craft universal item": 3, "craft cognizance crystal": 3, "craft psionic arms and armor": 5,
  "craft dorje": 5, "craft psicrown": 12, "craft construct": 5, "craft psionic construct": 5,
  "craft epic wondrous item": 0, "forge epic ring": 0, "craft epic rod": 0, "craft epic staff": 0, "craft epic magic arms and armor": 0, "scribe epic scroll": 0, "craft epic universal item": 0,
};
/** Typos and plurals in D35E's texts. */
const FEAT_ALIAS = { "create wondrous item": "Craft Wondrous Item", "craft wondrous items": "Craft Wondrous Item" };
const WORDNUM = { two: 2, twice: 2, three: 3, thrice: 3, four: 4 };
const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i;

/** Plain text of an item description: links ("@UUID[...]{Fireball}") become their labels. */
export function plainText(html) {
  return String(html ?? "")
    .replace(/@UUID\[[^\]]*\]\{([^}]*)\}/g, "$1").replace(/@Compendium\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ").trim();
}
/** D35E items whose text lives on another item: "@LinkedDescription[Compendium.D35E.magicitems.Item.xxx]". */
export const linkedDescription = (html) => String(html ?? "").match(/@LinkedDescription\[([^\]]+)\]/)?.[1] ?? null;

/** Pick the caster level for this version of the item ("Ring of Wizardry III" → the "( III )" entry). */
function pickCl(options, itemName) {
  if (options.length <= 1 || !itemName) return options[0]?.cl ?? null;
  // Score each version's label against the item's name: every number or roman numeral must match; other words add to the score
  const words = new Set(normName(itemName).split(" "));
  let best = null, bestScore = -1;
  for (const o of options) {
    const toks = normName(o.label).split(/\s+/).filter((x) => x && x !== "or");
    if (!toks.length) continue;
    if (toks.some((x) => (/\d/.test(x) || ROMAN.test(x)) && !words.has(x))) continue;
    const score = toks.filter((x) => words.has(x)).length;
    if (score > bestScore) { best = o; bestScore = score; }
  }
  return (best ?? options[0]).cl;
}

/**
 * Parse the construction line. spell(name) returns the spell's (or power's) canonical name or null; isFeat(name) says
 * whether a name is a feat. Returns null when the description has no caster level line.
 */
export function parsePrereqs(html, { spell = () => null, isFeat = () => false, itemName = "" } = {}) {
  const t = plainText(html);
  let m = t.match(/(?:\bCL\b|\bML\b|Caster Level:?|Manifester Level:?)\s*((?:\d+(?:st|nd|rd|th)?\s*(?:\([^)]*\))?\s*,?\s*(?:or\s+)?)+);\s*(?:Prerequisites?:\s*)?([^;]*?)\s*(?:;|$)/i);
  // Some epic items give only "Prerequisites: …" with no caster level
  if (!m) { const p = t.match(/Prerequisites?:\s*([^;]*?)\s*(?:;|$)/i); if (p) m = [p[0], "", p[1]]; }
  if (!m) return null;
  const options = [...m[1].matchAll(/(\d+)(?:st|nd|rd|th)?\s*(?:\(\s*([^)]*?)\s*\))?/g)].map((x) => ({ cl: Number(x[1]), label: x[2] ?? "" }));
  const out = { cl: pickCl(options, itemName) ?? null, feats: [], spells: [], align: [], skills: [], minLevel: null, minCl: null, race: null, factor: null, other: [], text: m[2].trim(), cost: null };
  const cost = t.match(/\bCost(?:\s+to\s+Create)?:?\s+([\d,]+(?:\.\d+)?)\s*gp\s*\+\s*([\d,]+)\s*XP/i);
  if (cost) out.cost = { gp: Number(cost[1].replace(/,/g, "")), xp: Number(cost[2].replace(/,/g, "")) };
  // Split on commas outside parentheses
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of m[2]) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
  }
  parts.push(cur);
  let lastSpellGroup = null;
  for (let raw of parts) {
    raw = raw.trim().replace(/\.$/, "");
    if (!raw || /^(weight|price|market price|in effect)\b/i.test(raw)) continue;
    const or = /^or\s+/i.test(raw);
    const p = raw.replace(/^(or|and)\s+/i, "").trim();
    // Feats first (a feat is never a spell name)
    const featName = FEAT_ALIAS[normName(p)] ?? p.replace(/\s+feat$/i, "");
    if (CREATION_FEATS[normName(featName)] !== undefined || isFeat(featName)) { out.feats.push(featName); continue; }
    // Spells: "x", "x or y", "heightened x" (the spell x)
    const alts = p.split(/\s+or\s+/i).map((s) => s.trim()).filter(Boolean);
    const found = alts.map((a) => spell(a) ?? spell(a.replace(/^(heightened|improved heightened|maximized|empowered|extended|quickened)\s+/i, "")));
    if (found.length && found.every(Boolean)) {
      if (or && lastSpellGroup) lastSpellGroup.push(...found);
      else { lastSpellGroup = [...found]; out.spells.push(lastSpellGroup); }
      continue;
    }
    lastSpellGroup = null;
    let x;
    if ((x = p.match(/^(?:creator|caster|crafter)\s+must\s+be\s+(lawful|chaotic|good|evil)(?:\s+and\s+(lawful|chaotic|good|evil))?$/i))) { out.align.push(x[1].toLowerCase()); if (x[2]) out.align.push(x[2].toLowerCase()); continue; }
    if (/^(good|evil|lawful|chaotic)$/i.test(p)) { out.align.push(p.toLowerCase()); continue; }
    if ((x = p.match(/must have (\d+) ranks in (?:the )?(.+?)(?: skill)?$/i))) { out.skills.push({ ranks: Number(x[1]), skill: x[2].trim() }); continue; }
    if ((x = p.match(/must be (?:at least )?(\d+)(?:st|nd|rd|th) level$/i))) { out.minLevel = Number(x[1]); continue; }
    if ((x = p.match(/must be caster level (\d+)/i))) { out.minCl = Number(x[1]); continue; }
    if ((x = p.match(/^creator must be an? (elf|dwarf|gnome|halfling|half-elf|half-orc|human|triton)\b/i))) { out.race = x[1]; out.other.push(p); continue; }
    if ((x = p.match(/\b(?:(two|three|four) times|(twice|thrice))\b/i)) && /bonus/i.test(p)) { out.factor = WORDNUM[(x[1] ?? x[2]).toLowerCase()]; continue; }
    out.other.push(p);
  }
  return out;
}
