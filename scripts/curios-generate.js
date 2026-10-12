/**
 * Axecleft's Curios — random magic items by the SRD tables.
 *
 * Potions, scrolls and wands are rolled on the SRD tables (spell, then caster level) and made on demand;
 * scrolls hold 1d3 (minor), 1d4 (medium) or 1d6 (major) spells as in the SRD, and a scroll with more than
 * one spell becomes a master scroll. Rings, rods, staffs and wondrous items are rolled on the SRD tables and
 * taken from the item compendiums by name, with their prices checked.
 *
 * Psionics (house rule, while the world's Psionics switch is on): a share of potion, scroll and wand rolls
 * become psionic tattoos, power stones and dorjes, with a power of the level the SRD table would give a spell;
 * the same share of staff rolls become SRD psicrowns (medium and major), and of wondrous item rolls cognizance
 * crystals (3 in 10, SRD crystal table) or psionic universal items.
 */
import * as D from "./curios-d35e.js";
import { makeMaster } from "./curios-links.js";
import { maybeLight } from "./curios-light.js";
import { crownFacts, crownRow, setupCrown, rollCrystal, rollCrown } from "./curios-psionic.js";

/** Generation settings ("Other permanent magic items", SRD under 1%): maybe make a ring, rod, staff or wondrous item intelligent. */
async function maybeIntelligent(api, data, force = null) {
  if (force === false || !api.intelligence || data?.system?.intelligent?.enabled) return null;
  if (force !== true && !globalThis.AxecleftTreasure?.genChance?.("intelligence", "other")) return null;
  try {
    const intel = await api.intelligence.roll({ abilities: [], bonus: 0, effective: 0 });
    api.intelligence.applyToData(data, intel);
    return intel;
  } catch (err) { console.warn("axeclefts-curios | intelligence failed", err); return null; }
}
export { maybeIntelligent };

const T = () => globalThis.AxecleftTreasure;
const { MOD, KINDS, normName } = D;
const d100 = () => 1 + Math.floor(Math.random() * 100);
const die = (n) => 1 + Math.floor(Math.random() * n);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const inGrade = (rows, grade, r) => rows.find((x) => x[grade] && r >= x[grade][0] && r <= x[grade][1]);
const inD = (rows, r) => rows.find((x) => x.d && r >= x.d[0] && r <= x.d[1]);
const { gp, t, ord } = D;
/*t*/"minor"; /*t*/"medium"; /*t*/"major"; /*t*/"arcane"; /*t*/"divine"; // grade and scroll words
/** "minor potion" for a placeholder. */
const ph = (grade, what) => t("{grade} {item}", { grade: t(grade), item: t(what).toLowerCase() });
const LIT = () => `; ${t("sheds light")}`;
const rollDice = (f) => T()?.rollDice?.(f) ?? 1;

export const CATS = { "magic:potion": "potions", "magic:scroll": "scrolls", "magic:wand": "wands", "magic:ring": "rings", "magic:rod": "rods", "magic:staff": "staffs", "magic:wondrous": "wondrous" };
const SPELL_KIND = { "magic:potion": "potion", "magic:scroll": "scroll", "magic:wand": "wand" };

const EPIC_TABLES = { "magic:ring": "epicRings", "magic:rod": "epicRods", "magic:staff": "epicStaffs", "magic:wondrous": "epicWondrous" };

export class CuriosGenerator {
  constructor(api) { this.api = api; this.names = null; }
  get t() { return this.api.data.tables; }
  get spells() { return this.api.spells; }

  /* ---------- fixed items: find them in the item compendiums ---------- */

  /** Name index of the item sources: Map(normName -> [{ pack, id, name, price }]), modules first when preferred. */
  async itemNames() {
    if (this.names) return this.names;
    const hub = T();
    let packs = [...new Set([...(hub?.itemSources?.().packs ?? []), "D35E.magicitems"])];
    if (this.api.setting("preferModules")) packs = packs.sort((a, b) => Number(a.startsWith("D35E.")) - Number(b.startsWith("D35E.")));
    const map = new Map();
    for (const id of packs) {
      const pack = game.packs.get(id);
      if (!pack || pack.documentName !== "Item") continue;
      let index;
      try { index = await D.enIndex(pack, { fields: ["system.price", "type"] }); } catch (e) { continue; }
      for (const e of index) {
        if (e.type === "Folder") continue;
        // By English name (Babele worlds) and by the shown name (an item typed in French on the Curios tab)
        const hit = { pack: id, id: e._id, name: e.name, display: e.display ?? e.name, price: Number(e.system?.price) || 0, type: e.type };
        for (const k of new Set([normName(e.name), normName(hit.display)])) (map.get(k) ?? map.set(k, []).get(k)).push(hit);
      }
    }
    this.names = map;
    return map;
  }
  clear() { this.names = null; }

  /** Item data for a table row (or a hand-picked name). Returns { data, name, price, note } or null. */
  async fixedItem(row, { unidentified = false, raw = false } = {}) {
    const names = await this.itemNames();
    const hit = names.get(normName(row.item ?? row.name))?.[0] ?? names.get(normName(row.name))?.[0] ?? null;
    let data, note = "";
    if (hit) {
      const doc = await game.packs.get(hit.pack)?.getDocument(hit.id);
      data = doc?.toObject();
    }
    if (!data) {
      // Not in any compendium (D35E lacks a few SRD rings): a plain item with the SRD name and price, for the GM to finish
      data = D.masterBase({ name: row.item ?? row.name, img: "icons/svg/item-bag.svg", price: row.price,
        description: `<p><em>${D.t("Axecleft's Curios: {name} is not in your item compendiums. Made with its SRD name and price only; add its description and effects.", { name: row.item ?? row.name })}</em></p>` });
      if (/^ring\b/i.test(data.name)) data.system.slot = "ring";
      note = t("not in your compendiums: name and price only");
    }
    delete data._id; delete data.folder; delete data.sort;
    T()?.applyPriceCorrection?.(hit?.pack ?? "", data);
    // A table row for one version of a general item (an Ioun stone, a figurine…): its own name and price
    // Its English identity, for Babele worlds (Axecleft's Tools 8)
    if (hit && !foundry.utils.getProperty(data, "flags.babele.originalName")) foundry.utils.setProperty(data, "flags.world.axecleftEn", hit.name);
    if (row.variant) {
      foundry.utils.setProperty(data, "flags.world.axecleftEn", D.titleCase(row.name));
      // Variant names come from the SRD tables (English); in a translated world keep the compendium's name with the variant's SRD name after it
      data.name = data.name !== hit?.name && hit ? `${data.name} (${D.titleCase(row.name)})` : D.titleCase(row.name);
      data.system.identifiedName = data.name;
      data.system.price = row.price;
      if (normName(hit?.name) !== normName(data.name)) note = note || t("{item} as {name}", { item: hit?.display ?? hit?.name ?? t("item"), name: data.name });
    }
    if (!(Number(data.system?.price) > 0) && row.price) { data.system.price = row.price; note = note || t("SRD price (none in the compendium)"); }
    if (row.amount) data.system.quantity = row.amount;
    // A psicrown (D35E's "Dominator", "Evader"…): its points and powers (curios-psionic.js); raw: the caller sets it up
    const crown = raw ? null : crownFacts(this.api, data);
    if (crown) { await setupCrown(this.api, data, crown); if (unidentified) D.setUnidentified(data, "Headband"); }
    else if (unidentified) D.setUnidentified(data, this.unidName(data));
    return { data, name: data.name, price: Number(data.system?.price) || 0, note, from: hit?.pack ?? null };
  }

  unidName(data) {
    const n = data.name ?? "";
    if (/^ring\b/i.test(n) || data.system?.slot === "ring") return "Ring";
    if (/^rod\b/i.test(n)) return "Rod";
    if (/^staff\b/i.test(n)) return "Staff";
    return data.system?.unidentified?.name || n.split(/\s+of\s+|,/i)[0];
  }

  /* ---------- rolling ---------- */

  /** Staffs and wondrous items (1.14.8): psicrowns for staffs; cognizance crystals and universal items for wondrous items. */
  psionicPermanent(category, tags = []) {
    const rules = T()?.rules?.() ?? { psionics: true };
    if (!rules.psionics || !["magic:staff", "magic:wondrous"].includes(category)) return false;
    if (tags.includes("psionic")) return true;
    return Math.random() * 100 < (Number(this.api.setting("psionicShare")) || 0);
  }

  psionicRoll(category, tags = []) {
    const rules = T()?.rules?.() ?? { psionics: true };
    if (!rules.psionics || !SPELL_KIND[category]) return false;
    if (tags.includes("psionic")) return true;
    return Math.random() * 100 < (Number(this.api.setting("psionicShare")) || 0);
  }

  /** One random item for a Treasure Generator category. Returns [{ name, data, summary }]. */
  async generate(category, { grade = "minor", tags = [], unidentified = true, epic = false, light = null, intel = null, exclude = null } = {}) {
    // grade "epic" (Treasure Generator 9.9): the SRD epic tables; only while Epic items is on, and only for rings, rods, staffs and wondrous items
    if (grade === "epic") {
      if (T()?.rules?.()?.epic !== true) return [];
      if (category === "magic:scroll") return [await this.rollEpicScroll({ unidentified })];
      return EPIC_TABLES[category] ? [await this.rollEpic(category, { unidentified, light, intel, exclude })] : [];
    }
    if (SPELL_KIND[category]) {
      if (this.psionicRoll(category, tags)) return [await this.rollPsionic(KINDS[SPELL_KIND[category]].pair, grade, { unidentified })];
      if (category === "magic:scroll") return [await this.rollScroll(grade, { unidentified })];
      return [await this.rollSpellItem(SPELL_KIND[category], grade, { unidentified })];
    }
    if (this.psionicPermanent(category, tags)) {
      // SRD psicrowns are medium and major items (no minor ones, as for staffs)
      if (category === "magic:staff") return grade === "minor" ? [] : [await rollCrown(this.api, grade, { unidentified, exclude })];
      if (category === "magic:wondrous" && Math.random() < 0.3) return [await rollCrystal(this.api, grade, { unidentified })];
      return [await this.rollMarked("psionic", category, grade, { unidentified, light, intel })];
    }
    if (tags.includes("psionic")) return [await this.rollMarked("psionic", category, grade, { unidentified, light, intel })];
    return [await this.rollFixed(category, grade, { unidentified, light, intel })];
  }

  /** Potion or wand by the SRD table. */
  async rollSpellItem(kind, grade, { unidentified }) {
    const rows = this.t[kind === "potion" ? "potions" : "wands"];
    for (let guard = 0; guard < 12; guard++) {
      const row = inGrade(rows, grade, d100());
      if (!row) continue;
      const sub = row.sub ? inD(row.sub, d100()) ?? row.sub[0] : null;
      const spell = sub?.spell ?? row.spell;
      if (!spell) continue;
      try {
        const m = await this.spells.make({ name: spell, kind, cl: row.cl || null, unidentified, force: true });
        // Keep what the table adds to the spell's name: "+2" (barkskin), "fire 10" (resist energy)
        const extra = sub ? sub.label : row.name.replace(/^(potion|oil|wand) of\s*/i, "").slice(spell.length).trim();
        if (extra && normName(extra) !== normName(spell) && !/^[a-z]+ of$/i.test(extra)) {
          const tag = /^[+]/.test(extra) ? ` ${extra}` : ` (${extra})`;
          m.data.name = m.data.name.replace(/( \((?:CL|ML) \d+\))?$/, `${tag}$1`);
          if (m.data.system?.identified === false) m.data.system.identifiedName = m.data.name;
          m.name = m.data.name;
        }
        return { name: m.name, data: m.data, summary: `${t(KINDS[kind].label)}, ${D.minCasterLevel(m.level) === m.cl ? "" : `${t("CL {n}", { n: m.cl })}, `}${gp(m.price)} ${t("(SRD {grade} table)", { grade: t(grade) })}` };
      } catch (err) { console.warn(`${MOD} | ${kind} of ${spell}: ${err.message}`); }
    }
    return { name: ph(grade, KINDS[kind].label), placeholder: true, summary: t("no spell from the table was found in your Spell sources") };
  }

  /** A scroll: arcane or divine, 1d3/1d4/1d6 spells by grade, each with its own level roll. */
  async rollScroll(grade, { unidentified }) {
    const S = this.t.scrolls;
    const type = inD(S.type, d100())?.type ?? "arcane";
    const n = Math.max(1, Math.round(rollDice(S.count[grade] ?? "1d3")));
    const made = [], missing = [];
    for (let i = 0; i < n; i++) {
      for (let guard = 0; guard < 10; guard++) {
        const lv = inGrade(S.levels, grade, d100());
        if (!lv) continue;
        const list = S.spells[type]?.[lv.level];
        const row = list ? inD(list, d100()) : null;
        const name = row ? (row.spell ?? pick(row.choices ?? [])) : null;
        if (!name) continue;
        try { made.push(await this.spells.make({ name, kind: "scroll", list: type, force: true })); break; }
        catch (err) { missing.push(name); }
      }
    }
    if (!made.length) return { name: ph(grade, "Scroll"), placeholder: true, summary: `${t("no spell from the table was found in your Spell sources")}${missing.length ? ` (${missing.slice(0, 3).join(", ")})` : ""}` };
    if (made.length === 1) {
      const m = made[0];
      if (unidentified) D.setUnidentified(m.data, "Scroll");
      return { name: m.name, data: m.data, summary: `${t("{type} scroll", { type: t(type) })}, ${gp(m.price)}` };
    }
    const data = makeMaster("scroll", made, { unidentified, label: type === "divine" ? "Divine Scroll" : "Arcane Scroll" });
    data.system.identifiedName = data.name;
    return { name: data.name, data, summary: `${t("{type} scroll with {n} spells", { type: t(type), n: made.length })}, ${gp(data.system.price)}` };
  }

  /**
   * SRD epic scroll: 1d8 spells of effective level 10th–19th at caster level 21–30. The SRD's level and metamagic tables aren't
   * available, so Axecleft's weighting is used: lower epic levels more often; a 5th–9th-level spell is raised with metamagic
   * (Heighten to 9th first when it needs more than the others can give), caster level 11 + level or a d10 roll of 21–30, whichever is higher.
   */
  async rollEpicScroll({ unidentified }) {
    const type = d100() <= 70 ? "arcane" : "divine";
    const n = Math.floor(Math.random() * 8) + 1;
    const weights = [[10, 20], [11, 16], [12, 13], [13, 11], [14, 10], [15, 8], [16, 7], [17, 6], [18, 5], [19, 4]];
    const pickLevel = () => { let r = Math.random() * 100; for (const [l, w] of weights) { if ((r -= w) < 0) return l; } return 10; };
    const PLAIN = [["quicken", 4], ["maximize", 3], ["empower", 2], ["extend", 1], ["still", 1], ["silent", 1]];
    const made = [];
    for (let i = 0; i < n; i++) {
      for (let guard = 0; guard < 12; guard++) {
        const L = pickLevel();
        const base = 5 + Math.floor(Math.random() * 5); // a 5th- to 9th-level spell
        const spells = await this.spells.ofLevel(base, type);
        if (!spells.length) continue;
        const hit = pick(spells);
        let from = base;
        const mm = [];
        if (L - from > 12) { mm.push({ key: "heighten", to: 9 }); from = 9; }
        // Plain metamagic adding up to exactly what's needed (each feat once)
        let need = L - from;
        const opts = PLAIN.filter(() => true).sort(() => Math.random() - 0.5);
        const chosen = [];
        const fit = (k, left) => { if (left === 0) return true; if (k >= opts.length) return false; const [key, a] = opts[k]; if (a <= left && fit(k + 1, left - a)) { chosen.push(key); return true; } return fit(k + 1, left); };
        if (!fit(0, need)) { if (from < 9) { mm.push({ key: "heighten", to: Math.min(9, from + need) }); need = L - Math.min(9, from + need); if (need > 0 && !fit(0, need)) continue; } else continue; }
        mm.push(...chosen.map((key) => ({ key })));
        const cl = Math.max(11 + L, 21 + Math.floor(Math.random() * 10));
        try { made.push(await this.spells.make({ hit, kind: "scroll", list: type, cl, metamagic: mm, force: true })); break; }
        catch (err) { /* try another */ }
      }
    }
    if (!made.length) return { name: t("epic scroll"), placeholder: true, summary: t("no spells of 5th–9th level in your Spell sources") };
    if (made.length === 1) {
      const m = made[0];
      if (unidentified) D.setUnidentified(m.data, "Scroll");
      return { name: m.name, data: m.data, summary: `${t("Epic {type} scroll", { type: t(type) })}, ${gp(m.price)} (${t("{level} level, CL {cl}", { level: ord(m.effLevel), cl: m.cl })})` };
    }
    const data = makeMaster("scroll", made, { unidentified });
    data.name = `Epic ${type[0].toUpperCase()}${type.slice(1)} Scroll`;
    data.system.identifiedName = data.name;
    foundry.utils.setProperty(data, "system.epic", true);
    return { name: data.name, data, summary: `${t("Epic {type} scroll with {n} spells", { type: t(type), n: made.length })} (${made.map((m) => ord(m.effLevel)).join(", ")}), ${gp(data.system.price)}` };
  }

  /** Psionic tattoo, power stone or dorje (house rule: a power of the level the SRD table would give). */
  async rollPsionic(kind, grade, { unidentified }) {
    const levels = {
      tattoo: { minor: [[1, 60, 1], [61, 100, 2]], medium: [[1, 40, 1], [41, 80, 2], [81, 100, 3]], major: [[1, 30, 2], [31, 100, 3]] },
      dorje: { minor: [[1, 40, 1], [41, 90, 2], [91, 100, 3]], medium: [[1, 30, 2], [31, 80, 3], [81, 100, 4]], major: [[1, 40, 3], [41, 100, 4]] },
    };
    const count = kind === "powerstone" ? Math.max(1, Math.round(rollDice(this.t.scrolls.count[grade] ?? "1d3"))) : 1;
    const made = [];
    for (let i = 0; i < count; i++) {
      for (let guard = 0; guard < 10; guard++) {
        let level;
        if (kind === "powerstone") level = Math.max(1, inGrade(this.t.scrolls.levels, grade, d100())?.level ?? 1);
        else { const r = d100(); level = levels[kind][grade].find((x) => r >= x[0] && r <= x[1])?.[2] ?? 1; }
        level = Math.min(level, kind === "tattoo" ? this.spells.potionCap({ gm: false }) : KINDS[kind].maxLevel);
        const pool = (await this.spells.ofLevel(level, "psionic")).filter((h) => kind !== "tattoo" || !h.facts.personal);
        if (!pool.length) continue;
        try { made.push(await this.spells.make({ hit: pick(pool), kind, force: true })); break; } catch (err) { /* try another */ }
      }
    }
    if (!made.length) return { name: ph(grade, KINDS[kind].label), placeholder: true, summary: t("no power of that level in your Power sources") };
    if (made.length === 1) {
      const m = made[0];
      if (unidentified) D.setUnidentified(m.data, KINDS[kind].unid);
      return { name: m.name, data: m.data, summary: `${t(KINDS[kind].label)}, ${gp(m.price)} ${t("(psionic, house rule)")}` };
    }
    const data = makeMaster("powerstone", made, { unidentified });
    return { name: data.name, data, summary: `${t("power stone with {n} powers", { n: made.length })}, ${gp(data.system.price)} ${t("(psionic, house rule)")}` };
  }

  /** Ring, rod, staff or wondrous item by the SRD table. */
  async rollFixed(category, grade, { unidentified, light = null, intel = null }) {
    const rows = this.t[CATS[category]];
    const rules = T()?.rules?.() ?? { psionics: true };
    for (let guard = 0; guard < 12; guard++) {
      const row = inGrade(rows, grade, d100());
      if (!row) continue;
      if (!rules.psionics && this.api.isPsionic(row.item ?? row.name)) continue;
      const got = await this.fixedItem(row, { unidentified });
      // Light (Generation settings, "Other permanent magic items"; light: true/false forces it)
      const lit = maybeLight(got.data, { force: light });
      const smart = await maybeIntelligent(this.api, got.data, intel);
      if (smart) got.price = Number(got.data.system.price) || got.price;
      if (!got) continue;
      const label = t({ "magic:ring": /*t*/"Ring", "magic:rod": /*t*/"Rod", "magic:staff": /*t*/"Staff", "magic:wondrous": /*t*/"Wondrous item" }[category]);
      return { name: got.name, data: got.data, summary: `${label}, ${gp(got.price)}${got.from ? `; ${t("from {source}", { source: game.packs.get(got.from)?.metadata?.label ?? got.from })}` : ""}${got.note ? ` (${got.note})` : ""}${lit ? LIT() : ""}${smart ? `; ${smart.summary}` : ""}` };
    }
    return { name: ph(grade, { "magic:ring": "Ring", "magic:rod": "Rod", "magic:staff": "Staff", "magic:wondrous": "Wondrous item" }[category] ?? category), placeholder: true, summary: t("nothing on the SRD table could be made") };
  }

  /** An SRD epic ring, rod, staff or wondrous item (Epic Magic Items tables). exclude: names already in this treasure. */
  async rollEpic(category, { unidentified, light = null, intel = null, exclude = null }) {
    const rows = this.t[EPIC_TABLES[category]] ?? [];
    for (let guard = 0; guard < 12; guard++) {
      const row = inD(rows, d100());
      if (!row) continue;
      if (exclude?.has?.(normName(row.name)) && guard < 10) continue; // already in this treasure: roll again
      const got = await this.fixedItem(row, { unidentified });
      if (!got) continue;
      if (row.derive) {
        // Not in D35E (Ring of Epic Protection): made from its nonepic version with the SRD text
        got.data.system.description.value = `${row.derive}<hr>${got.data.system.description.value ?? ""}`;
        got.note = t("made from {item}", { item: row.item });
      }
      foundry.utils.setProperty(got.data, "system.epic", true);
      const lit = maybeLight(got.data, { force: light });
      const smart = await maybeIntelligent(this.api, got.data, intel);
      const label = t({ "magic:ring": /*t*/"Epic ring", "magic:rod": /*t*/"Epic rod", "magic:staff": /*t*/"Epic staff", "magic:wondrous": /*t*/"Epic wondrous item" }[category]);
      return { name: got.name, data: got.data, summary: `${label}, ${gp(Number(got.data.system.price) || got.price)} ${t("(SRD epic table)")}${got.note ? ` (${got.note})` : ""}${lit ? LIT() : ""}${smart ? `; ${smart.summary}` : ""}` };
    }
    return { name: t({ "magic:ring": "Epic ring", "magic:rod": "Epic rod", "magic:staff": "Epic staff", "magic:wondrous": "Epic wondrous item" }[category] ?? category), placeholder: true, summary: t("nothing on the SRD epic table could be made") };
  }

  /** A psionic shop's permanent items: universal items etc. from the sources, by price grade. */
  async rollMarked(mark, category, grade, { unidentified, light = null, intel = null }) {
    const names = await this.itemNames();
    const max = { minor: 4000, medium: 25000, major: Infinity }[grade], min = { minor: 0, medium: 4000, major: 25000 }[grade];
    const pool = [];
    for (const [, hits] of names) {
      const h = hits[0];
      if (!this.api.isPsionic(h.name) || this.api.isEpic(h.name) || !(h.price > min && h.price <= max)) continue;
      if (crownRow(this.api, h.name)) continue; // psicrowns come from staff rolls (SRD psicrown table)
      pool.push(h);
    }
    if (!pool.length) return { name: ph(grade, "Psionic item"), placeholder: true, summary: t("no psionic items of that grade in your item sources") };
    const h = pick(pool);
    const got = await this.fixedItem({ name: h.name, item: h.name }, { unidentified });
    const lit = maybeLight(got.data, { force: light });
    const smart = await maybeIntelligent(this.api, got.data, intel);
    return { name: got.name, data: got.data, summary: `${t("Psionic item")}, ${gp(Number(got.data.system.price) || got.price)}${lit ? LIT() : ""}${smart ? `; ${smart.summary}` : ""}` };
  }
}
