/**
 * Axecleft's Curios — D35E adapter.
 *
 * Everything Curios reads from or writes to D35E data goes through this file, so the legacy port
 * (Foundry 11.315 / D35E 2.4.3) only has to change one place.
 */

export const MOD = "axeclefts-curios";

export const ARCANE = ["Wizard", "Sorcerer", "Bard", "Assassin"];
export const DIVINE = ["Cleric", "Druid", "Paladin", "Ranger", "Blackguard"];
export const PSIONIC = ["Psion", "Wilder", "Psychic Warrior"];
export const FULL = ["Wizard", "Sorcerer", "Cleric", "Druid"];

/** D35E consumable types and how Curios names them. */
export const KINDS = {
  potion: { label: "Potion", unid: "Potion", mult: 50, maxLevel: 3, psionic: false, pair: "tattoo" },
  scroll: { label: "Scroll", unid: "Scroll", mult: 25, maxLevel: 9, psionic: false, pair: "powerstone" },
  wand: { label: "Wand", unid: "Wand", mult: 750, maxLevel: 4, psionic: false, pair: "dorje", charges: 50 },
  tattoo: { label: "Psionic tattoo", unid: "Tattoo", mult: 50, maxLevel: 3, psionic: true, pair: "potion" },
  powerstone: { label: "Power stone", unid: "Crystal", mult: 25, maxLevel: 9, psionic: true, pair: "scroll" },
  dorje: { label: "Dorje", unid: "Crystal wand", mult: 750, maxLevel: 4, psionic: true, pair: "wand", charges: 50 },
};

/** "figurine of wondrous power, onyx dog" -> "Figurine of Wondrous Power, Onyx Dog". */
export const titleCase = (s) => String(s ?? "").replace(/\b([a-z])([a-z']*)/g, (w, a, b, i) => (i > 0 && /^(of|and|the|from|to|in|into|with|a|an|or|vs)$/.test(w) ? w : a.toUpperCase() + b));
const normName = (s) => String(s ?? "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']+/g, " ").trim();
export { normName };

/* ---------- spells and powers ---------- */

/** The classes a spell or power is on: [[class, level], ...] (D35E joins some as "Sorcerer/Wizard"). */
export function learnedAt(sys) {
  const out = [];
  for (const [cls, lvl] of sys?.learnedAt?.class ?? []) for (const c of String(cls).split("/")) out.push([c.trim(), Number(lvl)]);
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
  const generic = Number.isFinite(Number(s.level)) ? Number(s.level) : null;
  return {
    name: e.name, isPower,
    // The level items use: a full caster's (wizard, sorcerer, cleric, druid) when it has one, as the SRD's prices do
    level: isPower ? (lowest(PSIONIC) ?? generic) : (lowest(FULL) ?? lowest(ARCANE) ?? lowest(DIVINE) ?? generic),
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
 * Costly material components and XP costs, from D35E's text: { gp, xp }.
 * "diamond dust worth 250 gp", "XP Cost: 500 XP".
 */
export function componentCosts(data) {
  const s = data.system ?? {};
  const mat = String(s.materials?.value ?? "");
  const desc = String(s.description?.value ?? "").replace(/<[^>]+>/g, " ");
  let gp = 0, xp = 0;
  const m = mat.match(/(?:worth|costing|value of)\s+(?:a total of\s+)?(?:at least\s+)?([\d,]+)\s*gp/i) ?? mat.match(/([\d,]+)\s*gp/i);
  if (m) gp = Number(m[1].replace(/,/g, "")) || 0;
  const x = desc.match(/XP\s*Cost\s*:?\s*([\d,]+)\s*XP/i);
  if (x) xp = Number(x[1].replace(/,/g, "")) || 0;
  return { gp, xp };
}

/* ---------- making consumables ---------- */

let converter = undefined;
/** D35E's own spell-to-consumable converter (the one its sheets use), or null if it can't be loaded. */
async function d35eConverter() {
  if (converter !== undefined) return converter;
  try {
    const path = foundry.utils.getRoute?.("systems/D35E/module/item/converters/consumable.js") ?? "/systems/D35E/module/item/converters/consumable.js";
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
    const src = foundry.utils.deepClone(spellData);
    foundry.utils.setProperty(src, "system.learnedAt.class", [[scrollType === "divine" ? "Cleric" : kind === "powerstone" || kind === "tattoo" || kind === "dorje" ? "Psion" : "Wizard", level]]);
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
  const want = normName(cls);
  if (!want) return null;
  const hit = spellbooksOf(actor).find((b) => normName(b.cls) === want || normName(b.cls).includes(want) || normName(b.name).includes(want));
  return hit?.key ?? null;
}

/** Spell preparation (D35E: system.preparation.preparedAmount on spell items). */
export const preparedAmount = (sys) => Number(sys?.preparation?.preparedAmount) || 0;

/** Remaining uses of a single-use consumable (D35E counts these by quantity) or a charged one. */
export function usesLeft(item) {
  const s = item.system ?? {};
  return s.uses?.per === "single" ? Number(s.quantity) || 0 : Number(s.uses?.value) || 0;
}
