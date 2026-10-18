/**
 * Axecleft's Curios — D35E adapter.
 *
 * Everything Curios reads from or writes to D35E data goes through this file, so the legacy port
 * (Foundry 11.315 / D35E 2.4.3) only has to change one place.
 */

export const MOD = "axeclefts-curios";

/** Text in the world's language (Axecleft's Tools 8.2 language files: lang/<code>.json), else the English. {placeholders} are filled from data. */
export const t = (s, d) => globalThis.AxecleftTools?.t?.(s, d) ?? (d ? String(s).replace(/\{(\w+)\}/g, (m, k) => d[k] ?? m) : String(s));
/** A number in the world's language format. */
export const num = (n) => { const l = globalThis.AxecleftTools?.i18n?.lang; return Number(n).toLocaleString(l && l !== "en" ? l : "en-US"); };
/** "3rd" in the world's language. */
/** A name or phrase from a pattern, in the world's language (Axecleft's Tools 8.3 grammar); { lang: "en" } for the English one. */
/** A word for N(): its English, with the text to show when the word file has none (Axecleft's Tools 8.4 word files: gender, forms). */
export const W = (en, text = null) => globalThis.AxecleftTools?.word?.(en, { text }) ?? (text ?? en);
export const N = (p, s = {}, o = {}) => globalThis.AxecleftTools?.compose?.(p, s, o) ?? String(p).replace(/\[([^\]]*)\]/g, (m, g) => (/\{(\w+)[^}]*\}/.test(g) && [...g.matchAll(/\{(\w+)[^}]*\}/g)].every(([, k]) => s[k] !== undefined && s[k] !== "" && !(Array.isArray(s[k]) && !s[k].length)) ? g : "")).replace(/\{(\w+)[^}]*\}/g, (m, k) => [s[k] ?? ""].flat().map((x) => x?.text ?? x).join(" ")).replace(/\s{2,}/g, " ").trim();
/** English ordinal (1st, 2nd…), for English names. */
export const ordEn = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
export const ord = (n) => t(n === 1 ? "{n}st" : n === 2 ? "{n}nd" : n === 3 ? "{n}rd" : "{n}th", { n });
/** "1,234 gp" in the world's language. */
export const gp = (n) => t("{n} gp", { n: num(Math.round((Number(n) || 0) * 100) / 100) });

export const ARCANE = ["Wizard", "Sorcerer", "Bard", "Assassin"];
export const DIVINE = ["Cleric", "Druid", "Paladin", "Ranger", "Blackguard"];
export const PSIONIC = ["Psion", "Wilder", "Psychic Warrior"];
export const FULL = ["Wizard", "Sorcerer", "Cleric", "Druid"];

/** D35E consumable types and how Curios names them. */
export const KINDS = {
  potion: { label: /*t*/"Potion", unid: "Potion", mult: 50, maxLevel: 3, psionic: false, pair: "tattoo" },
  scroll: { label: /*t*/"Scroll", unid: "Scroll", mult: 25, maxLevel: 9, psionic: false, pair: "powerstone" },
  wand: { label: /*t*/"Wand", unid: "Wand", mult: 750, maxLevel: 4, psionic: false, pair: "dorje", charges: 50 },
  tattoo: { label: /*t*/"Psionic tattoo", unid: "Tattoo", mult: 50, maxLevel: 3, psionic: true, pair: "potion" },
  powerstone: { label: /*t*/"Power stone", unid: "Crystal", mult: 25, maxLevel: 9, psionic: true, pair: "scroll" },
  dorje: { label: /*t*/"Dorje", unid: "Crystal wand", mult: 750, maxLevel: 4, psionic: true, pair: "wand", charges: 50 },
};

/** "figurine of wondrous power, onyx dog" -> "Figurine of Wondrous Power, Onyx Dog". */
export const titleCase = (s) => String(s ?? "").replace(/\b([a-zA-Z])([a-zA-Z'’]*)/g, (w, a, b, i) => (i > 0 && /^(of|and|the|from|to|in|into|with|a|an|or|vs)$/.test(w) ? w : a.toUpperCase() + b));
// Letters in any language are kept ("Épée bâtarde"), so names typed in French, Spanish or Portuguese match too (1.14.9)
const normName = (s) => String(s ?? "").toLowerCase().normalize("NFC").replace(/[’']/g, "'").replace(/[^\p{L}\p{N}']+/gu, " ").trim();
/** An item's English name (Axecleft's Tools 8: Babele's original name, an English name the user gave it), else its name. */
export const enName = (x, opts = {}) => globalThis.AxecleftTools?.enName?.(x, opts) ?? x?.name ?? "";
/** A class name in English ("Magicien" -> "Wizard"), from Babele's class translations. */
export const classEn = (name) => globalThis.AxecleftTools?.classEn?.(name) ?? name;
/** A compendium index with English names (display: the shown name). */
export const enIndex = async (pack, opts = {}) => (globalThis.AxecleftTools?.enIndex ? globalThis.AxecleftTools.enIndex(pack, opts) : [...await pack.getIndex(opts)]);
export { normName };

/* ---------- spells and powers ---------- */

/** The classes a spell or power is on: [[class, level], ...] (D35E joins some as "Sorcerer/Wizard"). */
export function learnedAt(sys) {
  const out = [];
  // Class names may be translated (Babele): "Magicien" counts as Wizard
  for (const [cls, lvl] of sys?.learnedAt?.class ?? []) for (const c of String(cls).split("/")) out.push([classEn(c.trim()), Number(lvl)]);
  return out;
}

/** Facts Curios needs about a spell or power item (index entry or full data). */
export function spellFacts(e) {
  const s = e.system ?? {};
  const classes = learnedAt(s);
  const lowest = (list) => {
    const lv = classes.filter(([c]) => list.some((x) => x.toLowerCase() === c.toLowerCase())).map(([, l]) => l);
    return lv.length ? Math.min(...lv) : null;
  };
  const isPower = s.isPower === true;
  const anyLowest = () => { const lv = classes.map(([, l]) => l).filter(Number.isFinite); return lv.length ? Math.min(...lv) : null; };
  const generic = Number.isFinite(Number(s.level)) ? Number(s.level) : null;
  return {
    name: e.name, isPower,
    // The level items use: a full caster's (wizard, sorcerer, cleric, druid) when it has one, as the SRD's prices do
    // (1.14.9.19: a spell only on other classes' lists, from a supplement, uses the lowest level it has on any list)
    level: isPower ? (lowest(PSIONIC) ?? generic) : (lowest(FULL) ?? lowest(ARCANE) ?? lowest(DIVINE) ?? generic ?? anyLowest()),
    // Scroll lists: a full caster's level first (a bard's or ranger's only when no full caster has the spell)
    arcane: lowest(["Wizard", "Sorcerer"]) ?? lowest(ARCANE), divine: lowest(["Cleric", "Druid"]) ?? lowest(DIVINE), psionic: isPower ? (lowest(PSIONIC) ?? generic) : null,
    personal: String(s.range?.units ?? "").toLowerCase() === "personal",
    target: String(s.target?.value ?? (typeof s.target === "string" ? s.target : "")).trim(),
    classes,
  };
}

/** The minimum caster (or manifester) level for a spell level: SRD wizard/cleric/psion progression. */
export const minCasterLevel = (level) => (level <= 1 ? 1 : 2 * level - 1);

/**
 * The lowest caster (or manifester) level at which any class can cast a spell or manifest a power (SRD class tables):
 * wizard, cleric, druid, psion 2 × level − 1; sorcerer and wilder 2 × level; bard and psychic warrior 1, 2/1, 4, 7, 10, 13, 16;
 * paladin and ranger cast at half their class level (2, 4, 5, 7). Other classes fall back to 2 × level − 1.
 */
const FIRST_CL = {
  wizard: (l) => minCasterLevel(l), cleric: (l) => minCasterLevel(l), druid: (l) => minCasterLevel(l), psion: (l) => minCasterLevel(l),
  sorcerer: (l) => (l <= 1 ? 1 : 2 * l), wilder: (l) => (l <= 1 ? 1 : 2 * l),
  bard: (l) => [1, 2, 4, 7, 10, 13, 16][l] ?? null, "psychic warrior": (l) => [1, 1, 4, 7, 10, 13, 16][l] ?? null,
  paladin: (l) => [null, 2, 4, 5, 7][l] ?? null, ranger: (l) => [null, 2, 4, 5, 7][l] ?? null,
};
export function spellMinCl(facts) {
  const cls = (facts?.classes ?? []).map(([c, l]) => FIRST_CL[String(c).toLowerCase()]?.(Number(l))).filter((x) => Number.isFinite(x));
  if (cls.length) return Math.min(...cls);
  return Number.isFinite(facts?.level) ? minCasterLevel(facts.level) : null;
}

/**
 * Costly material components and XP costs, from D35E's text: { gp, xp }.
 * "diamond dust worth 250 gp", "XP Cost: 500 XP".
 */
export function componentCosts(data) {
  const s = data.system ?? {};
  const mat = String(s.materials?.value ?? "");
  const desc = String(s.description?.value ?? s.shortDescription ?? "").replace(/<[^>]+>/g, " ");
  let gp = 0, xp = 0;
  // English "worth 250 gp"; French "d'une valeur de 250 po"; Spanish "por valor de 250 po"; Portuguese "no valor de 250 PO"
  const num = (v) => Number(String(v).replace(/[\s,.](?=\d{3}\b)/g, "").replace(",", ".")) || 0;
  const m = mat.match(/(?:worth|costing|value of|valeur(?: d'au moins| de)?|valor(?: de)?|vale)\s+(?:a total of\s+|au moins\s+|al menos\s+|pelo menos\s+)?(?:at least\s+)?([\d][\d .,]*)\s*(?:gp|po|pz)\b/i) ?? mat.match(/([\d][\d .,]*)\s*(?:gp|po)\b/i);
  if (m) gp = num(m[1]);
  // "XP Cost: 500 XP"; "Coût en PX : 500 PX"; "Coste en PX: 500 PX"; "Custo em XP: 500 XP"
  const x = desc.match(/(?:XP\s*Cost|Co[uû]t en PX|Coste en PX|Custo em XP)\s*:?\s*([\d][\d .,]*)\s*(?:XP|PX)/i);
  if (x) xp = num(x[1]);
  return { gp, xp };
}

/* ---------- making consumables ---------- */

let converter = undefined;
/** D35E's own spell-to-consumable converter (the one its sheets use), or null if it can't be loaded. */
async function d35eConverter() {
  if (converter !== undefined) return converter;
  try {
    const path = (foundry.utils.getRoute ?? globalThis.getRoute)?.("systems/D35E/module/item/converters/consumable.js") ?? "/systems/D35E/module/item/converters/consumable.js";
    converter = (await import(path)).ItemConsumableConverter ?? null;
  } catch (err) {
    console.warn(`${MOD} | D35E's consumable converter could not be loaded; using Curios' own`, err);
    converter = null;
  }
  return converter;
}

/** A bare D35E consumable (fallback when the converter can't be loaded). */
function plainConsumable(spell, kind, cl, level) {
  const k = KINDS[kind];
  return {
    name: `${k.label} of ${spell.name}`, type: "consumable", img: spell.img,
    system: {
      consumableType: kind, quantity: 1, identified: true, baseCl: String(cl),
      uses: k.charges ? { value: k.charges, max: k.charges, maxFormula: String(k.charges), per: "charges" } : { value: 0, max: 0, maxFormula: "", per: "single" },
      activation: { type: "standard", cost: 1 }, actionType: spell.system?.actionType ?? "",
      save: { ...(spell.system?.save ?? {}), dc: 10 + level + Math.floor(level / 2) },
      damage: foundry.utils.deepClone(spell.system?.damage ?? { parts: [] }),
      description: { value: spell.system?.description?.value ?? "" }, isFromSpell: true,
      price: 0, hardness: kind === "wand" || kind === "dorje" ? 5 : 0, hp: { value: kind === "wand" || kind === "dorje" ? 5 : 1, max: kind === "wand" || kind === "dorje" ? 5 : 1 },
    },
  };
}

/**
 * Turn spell (or power) item data into a D35E consumable.
 * kind: potion | scroll | wand | tattoo | powerstone | dorje; level: the spell level the item uses; cl: caster level.
 */
export async function toConsumable(spellData, kind, { cl, level, scrollType = "" } = {}) {
  const conv = await d35eConverter();
  let data;
  if (conv) {
    // The converter reads the spell level from learnedAt; give it the level we chose (arcane vs divine can differ)
    const src = foundry.utils.deepClone(spellData?.toObject?.() ?? spellData);
    foundry.utils.setProperty(src, "system.learnedAt.class", [[scrollType === "divine" ? "Cleric" : kind === "powerstone" || kind === "tattoo" || kind === "dorje" ? "Psion" : "Wizard", level]]);
    // D35E 2.4.3 (Foundry v11) still reads two values by their old pre-v10 path (data.damage.parts, data.measureTemplate)
    // (always set: a document's deprecated .data getter would otherwise hide it), and expects attackCountFormula to be text
    src.data = { damage: { parts: foundry.utils.deepClone(src.system?.damage?.parts ?? []) }, measureTemplate: foundry.utils.deepClone(src.system?.measureTemplate ?? {}) };
    src.system.attackCountFormula ??= "";
    data = await conv.toConsumable(src, kind, cl, scrollType || undefined);
  } else data = plainConsumable(spellData, kind, cl, level);
  data.system ??= {};
  data.system.quantity = 1;
  data.system.baseCl = String(cl);
  if (scrollType) data.system.scrollType = scrollType;
  return data;
}

/** Put generated item data in its unidentified state (treasure), with a plain name and no price shown. */
export function setUnidentified(data, unidName) {
  foundry.utils.setProperty(data, "system.identified", false);
  foundry.utils.setProperty(data, "system.identifiedName", data.name);
  foundry.utils.setProperty(data, "system.unidentified.name", unidName);
  return data;
}

/* ---------- master items (multi-spell scrolls, power stones, spellbooks) ---------- */

/** The base for a master item: the same item type as the user's hand-made spellbook (slotless wondrous equipment). */
export function masterBase({ name, img, price, weight = 0, description = "" }) {
  return {
    name, type: "equipment", img,
    system: {
      equipmentType: "misc", equipmentSubtype: "wondrous", slot: "slotless", equipped: false, carried: true,
      quantity: 1, weight, price, identified: true, identifiedName: name,
      description: { value: description, chat: "", unidentified: "" },
      linkedItems: [], linkId: "", hp: { max: 1, value: 1 }, hardness: 0,
    },
  };
}

/** Is this item one of the actor's spellbooks' classes? D35E spellbooks: system.attributes.spells.spellbooks.{key}.class. */
export function spellbooksOf(actor) {
  const books = actor?.system?.attributes?.spells?.spellbooks ?? {};
  return Object.entries(books).map(([key, b]) => ({ key, name: b?.name ?? key, cls: String(b?.class ?? ""), usePowerPoints: !!b?.usePowerPoints, spontaneous: !!b?.spontaneous }));
}

/** The actor's spellbook key for a class name ("Wizard"), or null. */
export function spellbookFor(actor, cls) {
  const want = normName(classEn(cls));
  if (!want) return null;
  const hit = spellbooksOf(actor).find((b) => { const c = normName(classEn(b.cls)); return c === want || c.includes(want) || normName(b.name).includes(want) || normName(b.name).includes(normName(cls)); });
  return hit?.key ?? null;
}

/** Spell preparation (D35E: system.preparation.preparedAmount on spell items). */
export const preparedAmount = (sys) => Number(sys?.preparation?.preparedAmount) || 0;

/** Remaining uses of a single-use consumable (D35E counts these by quantity) or a charged one. */
export function usesLeft(item) {
  const s = item.system ?? {};
  return s.uses?.per === "single" ? Number(s.quantity) || 0 : Number(s.uses?.value) || 0;
}
