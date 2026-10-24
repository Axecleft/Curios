/**
 * Axecleft's Curios — crafting kinds for the shared Crafting window (axecleft-crafting.js).
 *
 * Scrolls, potions and wands (Scribe Scroll, Brew Potion, Craft Wand) and, while Psionics is on, power stones,
 * psionic tattoos and dorjes (Imprint Stone, Scribe Tattoo, Craft Dorje), by the SRD:
 *  - base price = item multiplier × spell level (0-level ½) × caster level; supplies ½ of it in gp, XP 1/25 of it;
 *  - a costly material component is paid in gp, an XP component in XP (once for scrolls and potions, ×50 for wands);
 *  - the crafter must provide each spell (prepared or known, or a helping caster, a scroll or a wand);
 *  - caster level is the crafter's choice, from the spell's minimum up to the crafter's own;
 *  - potions: 3rd level or lower, a spell that targets a creature, not personal; wands: 4th level or lower.
 *    The GM's higher limits (Curios tab) apply only when the GM crafts; players always get the SRD limits.
 * Several spells on one scroll (or powers on one stone) make a master scroll, as in random treasure.
 *
 * Rings, rods, staffs and wondrous items (Forge Ring, Craft Rod, Craft Staff, Craft Wondrous Item; psionic universal
 * items with Craft Universal Item; epic versions while Epic items is on) are made from the items in your compendiums:
 * the base price is the market price, and the prerequisites are read from the item's SRD construction line.
 *
 * Cognizance crystals (Craft Cognizance Crystal, manifester level = capacity) and psicrowns (Craft Psicrown: an SRD psicrown
 * at its price, or a custom one, priced by the SRD staff formula as a house rule), 1.14.8, while Psionics is on.
 */
import * as D from "./curios-d35e.js";
import { makeMaster } from "./curios-links.js";
import { METAMAGIC } from "./curios-consumables.js";
import { SpellPicker, parseSpellBox } from "./curios-picker.js";
import * as LOCAL from "./curios-prereqs.js";
import { applyLight, rollLight } from "./curios-light.js";
import { makeCrystal, makeCrown, customCrown, crownRow, CRYSTAL_SIZES, crystalPrice } from "./curios-psionic.js";
// The shared Crafting engine (1.2+) carries the construction-line reader; this module's copy is the fallback
const PR = () => (globalThis.AxecleftCrafting?.parsePrereqs ? globalThis.AxecleftCrafting : LOCAL);
const parsePrereqs = (...a) => PR().parsePrereqs(...a), plainText = (...a) => PR().plainText(...a), linkedDescription = (...a) => PR().linkedDescription(...a);
const CREATION_FEATS = LOCAL.CREATION_FEATS;

const { MOD, KINDS, normName, t, gp, num, ord } = D;
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const H = (s, d) => esc(t(s, d));
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel ?? "") ? " selected" : ""}>${esc(label)}</option>`;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const T = () => globalThis.AxecleftTreasure;

/** A name from this module's English data as shown in the world's language: the word file's entry, else the name given
 *  (Babele's), else the English; first letter capitalised for lists. */
const dn = (en, shown) => {
  const s = String(globalThis.AxecleftTools?.word?.(en, { text: shown ?? null })?.text || shown || en || "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** What each item needs (SRD feats and their minimum caster level). */
export const CRAFT = {
  scroll: { feat: "Scribe Scroll", minCl: 1, label: /*t*/"Scroll", many: true },
  potion: { feat: "Brew Potion", minCl: 3, label: /*t*/"Potion or oil", qty: true },
  wand: { feat: "Craft Wand", minCl: 5, label: /*t*/"Wand" },
  powerstone: { feat: "Imprint Stone", minCl: 1, label: /*t*/"Power stone", many: true, psionic: true },
  tattoo: { feat: "Scribe Tattoo", minCl: 3, label: /*t*/"Psionic tattoo", qty: true, psionic: true },
  dorje: { feat: "Craft Dorje", minCl: 5, label: /*t*/"Dorje", psionic: true },
};

/** The spell box's placeholder for an item kind. */
const spellHint = (k) => {
  const c = CRAFT[k] ?? {};
  if (c.many) return t(k === "powerstone" ? "One per line; several make one power stone. Add @ and a manifester level: Energy Ray @5" : "One per line; several make one master scroll. Add @ and a caster level: Fly @7");
  return t(c.psionic ? "One power. Add @ and a manifester level: Energy Ray @5" : "One spell. Add @ and a caster level: Fireball @7");
};
const MM_WORDS = ["empower", "enlarge", "extend", "heighten 7", "maximize", "quicken", "silent", "still", "widen"];

export class CuriosCraft {
  constructor(api) { this.api = api; this.picker = new SpellPicker(api); }

  async prepare() { await this.api.loaded; await this.api.spells.index(); }

  /** Is the crafter's copy of a spell arcane or divine (by the class of the spellbook it is in)? */
  listFor(actor, name) {
    const books = actor?.system?.attributes?.spells?.spellbooks ?? {};
    const it = (actor?.items ?? []).find((i) => i.type === "spell" && (normName(i.name) === normName(name) || normName(D.enName(i)) === normName(name)));
    if (!it) return null;
    const b = books[it.system?.spellbook] ?? {};
    const cls = `${D.classEn(b.class ?? "")} ${b.name ?? ""}`.toLowerCase();
    if (D.ARCANE.some((c) => cls.includes(c.toLowerCase()))) return "arcane";
    if (D.DIVINE.some((c) => cls.includes(c.toLowerCase()))) return "divine";
    return null;
  }

  content({ values: v }) {
    const psi = T()?.rules?.()?.psionics !== false;
    const kinds = Object.entries(CRAFT).filter(([, c]) => psi || !c.psionic);
    const item = v.item ?? "scroll";
    const mm = `${MM_WORDS.slice(0, -1).map((w) => `<code>+${w}</code>`).join(", ")}${esc(t(" or "))}<code>+${MM_WORDS.at(-1)}</code>`;
    return `<p class="hint">${H(psi ? "Scrolls, potions and wands, and power stones, psionic tattoos and dorjes, by the SRD: supplies cost ½ of the base price and the XP 1/25 of it. You must provide each spell: prepared or known, or from a helping caster, a scroll or a wand (one per day of work)." : "Scrolls, potions and wands, by the SRD: supplies cost ½ of the base price and the XP 1/25 of it. You must provide each spell: prepared or known, or from a helping caster, a scroll or a wand (one per day of work).")}</p>
      <div class="form-group"><label>${H("Item")}</label><select name="craft.item">${kinds.map(([k, c]) => opt(k, `${t(c.label)} (${c.feat})`, item)).join("")}</select></div>
      <div class="form-group"><label data-cc="what">${H(CRAFT[item]?.psionic ? "Powers" : "Spells")}</label><textarea name="craft.spells" rows="3" placeholder="${esc(spellHint(item))}">${esc(v.spells ?? "")}</textarea></div>
      ${this.picker.html()}
      <p class="hint" data-cc="mm">${H("Metamagic (spells): add {list} after the spell. Each raises its effective level (price and minimum caster level); you need the feat.", { list: "{list}" }).replace("{list}", mm)} ${H(T()?.rules?.()?.epic ? "Past 9th level or caster level 20 the item is epic: scrolls up to 19th level, caster level up to 30 (Scribe Epic Scroll); potions and wands keep their level limit but can go past caster level 20." : "Potions stay at 3rd level, wands at 4th and scrolls at 9th, counting the metamagic.")}</p>
      <div class="form-group" data-cc="list"><label>${H("Scroll type")}</label><select name="craft.list">${opt("", t("As the crafter casts it"), v.list)}${opt("arcane", t("Arcane"), v.list)}${opt("divine", t("Divine"), v.list)}</select></div>
      <div class="form-group"><label>${H("Caster level")}</label><input type="number" name="craft.cl" min="1" max="40" value="${esc(v.cl ?? "")}" placeholder="${H("minimum")}"><span class="hint" style="flex:1">${H("blank: the lowest that can cast it; no higher than your own")}</span></div>
      <div class="form-group" data-cc="qty"><label>${H("How many")}</label><input type="number" name="craft.qty" min="1" max="50" value="${esc(v.qty ?? 1)}"><span class="hint" style="flex:1">${H("each one costs and takes the same (SRD: no savings for brewing several)")}</span></div>`;
  }

  wire(section) {
    const show = () => {
      const k = section.querySelector('[name="craft.item"]')?.value ?? "scroll";
      const c = CRAFT[k] ?? {};
      section.querySelectorAll("[data-cc]").forEach((x) => {
        const w = x.dataset.cc;
        if (w === "what") { x.textContent = t(c.psionic ? "Powers" : "Spells"); return; }
        x.style.display = (w === "list" && k === "scroll") || (w === "qty" && c.qty) || (w === "mm" && !c.psionic) ? "" : "none";
      });
      const ta = section.querySelector('[name="craft.spells"]');
      if (ta) ta.placeholder = spellHint(k);
    };
    section.querySelector('[name="craft.item"]')?.addEventListener("change", show);
    show();
    // The spell picker (1.14.9.18): lists of spells by level, caster level and metamagic, added to the Spells box
    const q = (n) => section.querySelector(`[name="craft.${n}"]`);
    this.picker.wire(section, {
      box: q("spells"),
      state: () => { const k = q("item")?.value ?? "scroll"; return { kind: k, list: k === "scroll" ? q("list")?.value || null : null, many: !!CRAFT[k]?.many, cl: true, gm: !!game.user?.isGM, force: false }; },
    }).catch((e) => console.error("Curios | spell picker", e));
  }

  async evaluate({ actor, values: v }) {
    await this.prepare();
    const kind = v.item && CRAFT[v.item] ? v.item : "scroll";
    const c = CRAFT[kind];
    if (c.psionic && T()?.rules?.()?.psionics === false) throw new Error(t("Psionics is off in this world."));
    // "Fireball @25 +maximize +quicken +heighten 9": caster level after @, metamagic after + (heighten takes the level)
    const lines = parseSpellBox(v.spells);
    const bad = lines.find((l) => l.error);
    if (bad) throw new Error(bad.error);
    if (!lines.length) throw new Error(t(c.psionic ? "Type the power to put in the {item}." : "Type the spell to put in the {item}.", { item: t(c.label).toLowerCase() }));
    if (!c.many && lines.length > 1) throw new Error(t(c.psionic ? "A {item} holds one power." : "A {item} holds one spell.", { item: t(c.label).toLowerCase() }));
    const gm = !!game.user?.isGM; // the GM's higher potion and wand limits apply only to the GM's own crafting
    const qty = c.qty ? Math.max(1, Math.min(50, Number(v.qty) || 1)) : 1;
    const made = [];
    for (const l of lines) {
      const list = kind === "scroll" ? (v.list || this.listFor(actor, l.name) || null) : null;
      made.push(await this.api.spells.make({ name: l.name, kind, cl: l.cl ?? (Number(v.cl) || null), list, gm, unidentified: false, metamagic: l.metamagic }));
    }
    const base = round2(made.reduce((s, m) => s + m.base, 0) * qty);
    const compGp = round2(made.reduce((s, m) => s + m.comp.gp, 0) * qty);
    const compXp = made.reduce((s, m) => s + m.comp.xp, 0) * qty;
    const market = round2(base + compGp + compXp * 5);
    let data;
    if (made.length > 1) data = makeMaster(kind === "powerstone" ? "powerstone" : "scroll", made);
    else { data = foundry.utils.deepClone(made[0].data); data.system.quantity = qty; }
    data.system.identified = true;
    const cl = Math.max(c.minCl, ...made.map((m) => m.cl));
    const sn = (n) => this.api.spells.shownName?.(n) ?? n;
    const plan = {
      magic: true, feat: c.feat, name: made.length > 1 ? data.name : made[0].name, img: data.img, data, quantity: qty, market, base,
      componentGp: compGp, xpExtra: compXp, casterLevel: cl,
      casterNote: `${made.map((m) => `${sn(m.hit.name)} ${t(c.psionic ? "ML" : "CL")} ${m.cl}${m.cl === m.minCl ? t(" (minimum)") : ""}`).join("; ")}${cl > Math.max(...made.map((m) => m.cl)) ? `; ${t("{feat} needs {n}", { feat: c.feat, n: c.minCl })}` : ""}`,
      spells: made.map((m) => ({ any: [m.hit.name], for: t(c.label) })),
      summary: `${made.map((m) => `${sn(m.hit.name)} (${m.level === 0 ? t("0-level") : t("level {n}", { n: m.level })}${m.effLevel !== m.level ? t(", as {n} with metamagic", { n: ord(m.effLevel) }) : ""}${m.list && kind === "scroll" ? `, ${t(m.list === "divine" ? "divine" : "arcane")}` : ""})`).join(", ")}${qty > 1 ? ` × ${qty}` : ""}`,
      requirements: [], checks: [], notes: [],
      // Epic (effective level above 9th or caster level above 20th): the engine (1.6) applies the epic XP and feats
      epic: made.some((m) => m.epic), scroll: kind === "scroll",
    };
    // Metamagic: the crafter needs each feat used (SRD)
    const mmFeats = [...new Set(made.flatMap((m) => (m.metamagic ?? []).map((x) => METAMAGIC[x.key].feat)))];
    const have = globalThis.AxecleftCrafting?.actor?.feats?.(actor) ?? new Set();
    for (const f of mmFeats) plan.requirements.push({ key: `mm.${f}`, label: f, ok: have.has(normName(f)), detail: have.has(normName(f)) ? t("has the feat") : t("doesn't have the feat (metamagic on the item)"), waivable: false });
    if (plan.epic && kind !== "scroll") plan.notes.push(t("Epic potions and wands (caster level above 20th) follow the SRD epic item rules, as scrolls do (Axecleft house rule; the SRD has no epic potion or wand tables)."));
    if (compGp) plan.notes.push(t(kind === "wand" || kind === "dorje" ? "Costly components: {gp} (included in the cost; 50 times the component, one for each charge)." : "Costly components: {gp} (included in the cost).", { gp: gp(compGp) }));
    if (compXp) plan.notes.push(t(kind === "wand" || kind === "dorje" ? "XP components: {xp} XP (included in the XP; 50 times the component)." : "XP components: {xp} XP (included in the XP).", { xp: num(compXp) }));
    if (kind === "potion" || kind === "tattoo") plan.notes.push(t(qty > 1 ? "SRD: brewing takes 1 day for each, whatever the price." : "SRD: brewing takes 1 day, whatever the price."));
    if (made.length > 1) plan.notes.push(t(kind === "powerstone" ? "One power stone with {n} powers: each is a separate item in the inventory until used." : "One scroll with {n} spells: each is a separate item in the inventory until used.", { n: made.length }));
    return plan;
  }
}

/* ------------------------------------------ */
/*  Rings, rods, staffs and wondrous items     */
/* ------------------------------------------ */

// [key, group label, creation feat, one item's label]
const GROUPS = [["ring", /*t*/"Rings", "Forge Ring", /*t*/"Ring"], ["rod", /*t*/"Rods", "Craft Rod", /*t*/"Rod"], ["staff", /*t*/"Staffs", "Craft Staff", /*t*/"Staff"], ["wondrous", /*t*/"Wondrous items", "Craft Wondrous Item", /*t*/"Wondrous item"], ["psionic", /*t*/"Psionic universal items", "Craft Universal Item", /*t*/"Psionic universal item"]];
const groupOf = (api, name, slot) => {
  if (api.isPsionic(name) && !/^(ring|rod|staff)\b/i.test(name)) return "psionic";
  if (slot === "ring" || /^ring\b/i.test(name)) return "ring";
  if (/^rod\b|\brod of\b/i.test(name)) return "rod";
  if (/^staff\b|\bstaff of\b/i.test(name)) return "staff";
  return "wondrous";
};

export class CuriosItemCraft {
  constructor(api) { this.api = api; this.list = null; }

  /** Every permanent magic item the crafter could make, by group (from the item sources, plus the SRD table versions). */
  async prepare() {
    await this.api.loaded;
    await this.api.spells.index();
    const names = await this.api.generator.itemNames();
    const r = T()?.rules?.() ?? { psionics: true, epic: false };
    const out = new Map();
    const add = (name, group) => { if (!out.has(normName(name))) out.set(normName(name), { name, group }); };
    for (const [, hits] of names) {
      const h = hits[0];
      const label = game.packs.get(h.pack)?.metadata?.originalLabel ?? game.packs.get(h.pack)?.metadata?.label ?? h.pack; // English label (Babele)
      if (!/magic|wondrous|enchant|curio|universal|psionic/i.test(label) && h.pack !== "D35E.magicitems") continue;
      if (!r.epic && this.api.isEpic(h.name)) continue;
      if (!r.psionics && this.api.isPsionic(h.name)) continue;
      if (h.type && h.type !== "equipment") continue; // arms and armor are the Armory's
      if (crownRow(this.api, h.name)) continue; // psicrowns have their own tab (Crystals, psicrowns)
      add(h.display ?? h.name, groupOf(this.api, h.name, null)); // shown as named in this world, sorted by its English name
    }
    // Table versions of general items (Ioun stones, figurines, carpets…) and SRD items D35E lacks
    for (const k of ["rings", "rods", "staffs", "wondrous"]) for (const row of this.api.data.tables[k]) {
      if (!row.variant && !row.notInD35E) continue;
      add(D.titleCase(row.name), k === "rings" ? "ring" : k === "rods" ? "rod" : k === "staffs" ? "staff" : "wondrous");
    }
    this.list = [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  content({ values: v }) {
    const psi = T()?.rules?.()?.psionics !== false;
    const groups = GROUPS.filter(([k]) => psi || k !== "psionic");
    const g = v.group ?? "wondrous";
    return `<p class="hint">${H(psi ? "Rings, rods, staffs and wondrous items (and psionic universal items) from your item compendiums, by the SRD: the base price is the market price; supplies cost half of it and the XP is 1/25. The prerequisites come from the item's own construction line." : "Rings, rods, staffs and wondrous items from your item compendiums, by the SRD: the base price is the market price; supplies cost half of it and the XP is 1/25. The prerequisites come from the item's own construction line.")}${T()?.rules?.()?.epic ? ` ${H("Epic items are listed while Epic items is on.")}` : ""}</p>
      <div class="form-group"><label>${H("Kind")}</label><select name="craft.group">${groups.map(([k, l, f]) => opt(k, `${t(l)} (${f})`, g)).join("")}</select></div>
      <div class="form-group"><label>${H("Item")}</label><input type="text" name="craft.name" list="cc-items" value="${esc(v.name ?? "")}" placeholder="${H("Type to search")}"><datalist id="cc-items"></datalist></div>
      ${this.api.intelligence ? `<div class="form-group"><label>${H("Intelligent")}</label><label class="acr-cb" style="flex:1"><input type="checkbox" name="craft.intel" ${v.intel ? "checked" : ""}> ${H("Make it intelligent (SRD: caster level 15; it takes your alignment; its mind and powers are rolled when the GM approves, and their price is added)")}</label></div>` : ""}
      <div class="form-group"><label>${H("Sheds light")}</label><select name="craft.light">${opt("none", t("No"), v.light)}${opt("on", t("Yes"), v.light)}</select><span class="hint" style="flex:1">${H("the creator decides now (as the SRD says for arms and armor); its look follows the item's school of magic")}</span></div>
      ${globalThis.AxecleftCrafting?.prereqHelp?.("items") ?? ""}`;
  }

  wire(section) {
    const fill = () => {
      const g = section.querySelector('[name="craft.group"]')?.value ?? "wondrous";
      const dl = section.querySelector("#cc-items");
      if (dl) dl.innerHTML = (this.list ?? []).filter((x) => x.group === g).map((x) => `<option value="${esc(x.name)}">`).join("");
    };
    section.querySelector('[name="craft.group"]')?.addEventListener("change", () => { const n = section.querySelector('[name="craft.name"]'); if (n) n.value = ""; fill(); });
    fill();
  }

  /** D35E's English construction line for an item (data/prereqs.json), or null. */
  async englishLine(name) {
    this.lines ??= foundry.utils.fetchJsonWithTimeout(`modules/${MOD}/data/prereqs.json`).then((d) => {
      const m = new Map(); for (const [k, v] of Object.entries(d.lines ?? {})) m.set(normName(k), v); return m;
    }).catch(() => new Map());
    return (await this.lines).get(normName(name)) ?? null;
  }

  /** Feat names in D35E's Feats compendium and any compendium called "feats" (to tell "Empower Spell" from a spell). */
  async featNames() {
    if (this.feats) return this.feats;
    const out = new Set();
    for (const pack of game.packs ?? []) {
      if (pack.documentName !== "Item" || !(pack.collection === "D35E.feats" || /\bfeats?\b/i.test(pack.metadata?.originalLabel ?? pack.metadata?.label ?? ""))) continue;
      try { for (const e of await D.enIndex(pack)) { out.add(normName(e.name)); if (e.display) out.add(normName(e.display)); } } catch (e) { /* unreadable */ }
    }
    this.feats = out;
    return out;
  }

  /** The skill a construction line names ("Jump", "Knowledge (architecture and engineering)"): ranks on the actor, or null. */
  skillRanks(actor, name) {
    const want = normName(name);
    const labels = CONFIG?.D35E?.skills ?? {};
    for (const [key, label] of Object.entries(labels)) {
      const l = normName(game.i18n?.localize?.(label) ?? label);
      if (l === want || l.startsWith(want) || want.startsWith(l)) return Number(actor?.system?.skills?.[key]?.rank ?? 0) || 0;
    }
    return null;
  }

  async evaluate({ actor, values: v }) {
    await this.prepare();
    const name = String(v.name ?? "").trim();
    if (!name) throw new Error(t("Choose an item to make."));
    const r = T()?.rules?.() ?? { psionics: true, epic: false };
    if (this.api.isEpic(name) && !r.epic) throw new Error(t("{name} is an epic item; the GM can turn on Epic items in the Treasure Generator's Generation settings.", { name }));
    if (this.api.isPsionic(name) && !r.psionics) throw new Error(t("Psionics is off in this world."));
    const row = this.api.findRow(name) ?? { name, item: name };
    const got = await this.api.generator.fixedItem(row, { unidentified: false });
    if (!got?.data) throw new Error(t("{name} is not in your item compendiums.", { name }));
    if (/not in your compendiums/.test(got.note ?? "")) throw new Error(t("{name} is not in your item compendiums, so its construction line can't be read.", { name }));
    const data = got.data;
    data.system.identified = true;
    const lit = v.light === "on" && applyLight(data, rollLight(data, { force: true }));
    // Intelligence (SRD): rolled by the GM's client at approval (beforeApprove), then its price joins the base price
    let intel = null, intelData = null;
    if (v.intel && this.api.intelligence) {
      if (v.intelData) intel = JSON.parse(v.intelData);
      else if (v.intelRoll) {
        const al = globalThis.AxecleftCrafting?.actor?.alignment(actor) ?? { lc: "n", ge: "n" };
        intel = await this.api.intelligence.roll({ alignment: `${al.lc}${al.ge}`, abilities: [], bonus: 0, effective: 0 });
        intelData = JSON.stringify(intel);
      }
      if (intel) this.api.intelligence.applyToData(data, intel);
    }
    const base = Number(data.system?.price) || 0;
    if (!(base > 0)) throw new Error(t("{name} has no price (artifacts can't be made). The GM can add one on the Price Corrections page of the Treasure Lists journal.", { name: data.name }));
    // The construction line, from this item or the item it links its text to
    let html = data.system?.description?.value ?? "";
    const link = linkedDescription(html);
    if (link) { try { html = (await fromUuid(link.startsWith("Compendium.") ? link : `Compendium.${link}`))?.system?.description?.value ?? html; } catch (e) { /* keep */ } }
    // A translated description (Babele) can't be read: D35E's English line for the item, by its English name (data/prereqs.json, 1.14.9)
    const enItem = D.enName(data);
    const english = await this.englishLine(enItem);
    if (english && (!/^en\b/i.test(game.i18n?.lang ?? "en") || !parsePrereqs(html, { itemName: enItem }))) html = english;
    const C = globalThis.AxecleftCrafting;
    const feats = C?.actor?.feats(actor) ?? new Set();
    const known = await this.featNames();
    const pre = parsePrereqs(html, { spell: (x) => this.api.spells.resolveName(x), isFeat: (x) => feats.has(normName(x)) || known.has(normName(x)), itemName: enItem });
    const group = groupOf(this.api, enItem, data.system?.slot);
    const defFeat = GROUPS.find(([k]) => k === group)?.[2] ?? "Craft Wondrous Item";
    const plan = { magic: true, name: data.name, img: data.img, data, quantity: Number(data.system?.quantity) || 1, market: base, base, requirements: [], checks: [], notes: [], spells: [] };
    if (lit) plan.notes.push(t("Sheds light (decided at creation)."));
    if (v.intel) {
      if (intel) plan.notes.push(t("Intelligent: {lines}; adds {gp} to the base price.", { lines: intel.lines.join(" · "), gp: gp(intel.price) }));
      else plan.notes.push(t("Intelligent: it takes the crafter's alignment; its mind, powers and any special purpose are rolled when the GM approves, and their price (from +1,000 gp) is added to the base price, so the gp, XP and time rise."));
      if (intelData) plan.intelData = intelData;
    }
    const intelCl = v.intel ? 15 : 0;
    if (/minor artifact|major artifact|cannot be created/i.test(plainText(html))) throw new Error(t("{name} is an artifact; it can't be made.", { name: data.name }));
    if (this.api.isEpic(enItem)) plan.epic = true;
    if (!pre) {
      plan.feat = defFeat;
      plan.casterLevel = Math.max(CREATION_FEATS[normName(defFeat)] || 1, intelCl);
      plan.casterNote = `${defFeat} ${plan.casterLevel}`;
      plan.requirements.push({ key: "line", label: t("Prerequisites"), ok: "warn", detail: t("the item's description has no construction line; the GM decides what it needs"), waivable: true });
      return plan;
    }
    const creation = pre.feats.filter((f) => CREATION_FEATS[normName(f)] !== undefined);
    plan.feat = creation.find((f) => !/epic/i.test(f)) ?? creation[0] ?? defFeat;
    if (this.api.isEpic(enItem) || pre.feats.some((f) => /epic/i.test(f))) plan.epic = true; // the engine (1.6) applies the SRD epic rules
    // Caster level: the creation feats' minimums, "caster level 11th", "three times the bonus"
    const bonus = Number(enItem.match(/\+(\d+)/)?.[1] ?? data.name.match(/\+(\d+)/)?.[1]) || 0;
    const why = [];
    let cl = 1;
    for (const f of creation) { const m = CREATION_FEATS[normName(f)]; if (m > cl) { cl = m; why.push(`${f} ${m}`); } }
    if (pre.minCl && pre.minCl > cl) { cl = pre.minCl; why.push(t("the item needs {n}", { n: pre.minCl })); }
    if (pre.factor && bonus && pre.factor * bonus > cl) { cl = pre.factor * bonus; why.push(`${pre.factor} × +${bonus}`); }
    // SRD: never lower than the minimum caster level that can cast the required spells (gate: 17)
    const sp = await this.api.spells.minClOfGroups?.(pre.spells).catch(() => null);
    if (sp && sp.cl > cl) { cl = sp.cl; why.push(t("{spell} needs caster level {n}", { spell: this.api.spells.shownName?.(sp.spell) ?? sp.spell, n: sp.cl })); }
    if (intelCl > cl) { cl = intelCl; why.push(t("an intelligent item (caster level {n})", { n: intelCl })); }
    plan.casterLevel = cl;
    plan.casterNote = `${why.join("; ") || t("the feat's minimum")}${pre.cl ? t("; the item works at caster level {n}", { n: pre.cl }) : ""}`;
    for (const f of pre.feats) if (normName(f) !== normName(plan.feat)) {
      const has = feats.has(normName(f));
      plan.requirements.push({ key: `feat.${f}`, label: f, ok: has, detail: has ? t("has the feat") : t("doesn't have the feat"), waivable: CREATION_FEATS[normName(f)] === undefined }); // other feats (Empower Spell) can be waived under the Spellcraft house rule
    }
    plan.spells = pre.spells.map((g) => ({ any: g, for: data.name }));
    if (pre.align.length) plan.align = [...new Set(pre.align)];
    if (pre.minLevel) plan.minLevel = pre.minLevel;
    for (const s of pre.skills) {
      const ranks = this.skillRanks(actor, s.skill);
      plan.requirements.push({ key: `skill.${s.skill}`, label: t("{n} ranks in {skill}", { n: s.ranks, skill: s.skill }), ok: ranks === null ? "warn" : ranks >= s.ranks, detail: ranks === null ? t("skill not found; the GM checks") : t("has {n}", { n: ranks }), waivable: true });
    }
    if (pre.race) {
      const has = (actor?.items ?? []).some((i) => i.type === "race" && normName(i.name).includes(normName(pre.race)));
      const i = pre.other.findIndex((o) => o.toLowerCase().includes(pre.race.toLowerCase()));
      plan.requirements.push({ key: "race", label: pre.other[i] ?? t("Creator must be a {race}", { race: pre.race }), ok: has, detail: has ? t("yes") : t("no"), waivable: true });
      if (i >= 0) pre.other.splice(i, 1);
    }
    for (const o of pre.other) plan.requirements.push({ key: `other.${o}`, label: o[0].toUpperCase() + o.slice(1), ok: "warn", detail: t("the GM checks this"), waivable: true });
    // SRD "Cost" given in the statblock (items with costly components): pay that instead of half the price
    // The statblock's own "Cost" (items with costly or XP components, such as manuals and tomes) is what the crafter pays
    if (pre.cost && (pre.cost.gp !== (base - (intel?.price ?? 0)) / 2 || pre.cost.xp !== Math.ceil((base - (intel?.price ?? 0)) / 25))) {
      plan.base = pre.cost.gp * 2 + (intel?.price ?? 0);
      plan.xpExtra = Math.max(0, pre.cost.xp + (intel?.price ?? 0) / 25 - plan.base / 25);
      plan.notes.push(t("SRD cost to create: {gp} and {xp} XP (the item's costly or XP components are part of its {price} price).", { gp: gp(pre.cost.gp), xp: num(pre.cost.xp), price: gp(base) }));
    }
    if (got.note) plan.notes.push(t("Price: {note}.", { note: got.note }));
    plan.summary = `${t(GROUPS.find(([k]) => k === group)?.[3] ?? "Item")}${pre.cl ? t("; caster level {n}", { n: pre.cl }) : ""}${pre.text ? t("; prerequisites: {text}", { text: pre.text }) : ""}`;
    return plan;
  }
}

/* ------------------------------------------ */
/*  Alchemical items (Craft (alchemy))        */
/* ------------------------------------------ */

/** SRD alchemical items: price (gp) and Craft (alchemy) DC. Holy water is made with bless water, not Craft. */
export const ALCHEMY = [
  { name: "Acid", price: 10, dc: 15 },
  { name: "Alchemist's fire", price: 20, dc: 20 },
  { name: "Smokestick", price: 20, dc: 20 },
  { name: "Tindertwig", price: 1, dc: 20 },
  { name: "Antitoxin", price: 50, dc: 25 },
  { name: "Sunrod", price: 2, dc: 25 },
  { name: "Tanglefoot bag", price: 50, dc: 25 },
  { name: "Thunderstone", price: 30, dc: 25 },
];
const GENERIC_DC = [[5, /*t*/"Very simple item (5)"], [10, /*t*/"Typical item (10)"], [15, /*t*/"High-quality item (15)"], [20, /*t*/"Complex or superior item (20)"], [25, /*t*/"Very complex (25)"]];
const ALCH_RE = /\b(acid|alchemist.?s fire|antitoxin|smokestick|sunrod|tanglefoot|thunderstone|tindertwig|alchemical)\b/i;

export class CuriosAlchemy {
  constructor(api) { this.api = api; this.list = null; }

  /** The SRD list plus any other alchemical item in the item sources (D35E's Items, your own compendiums). */
  async prepare() {
    if (this.list) return;
    const out = new Map(ALCHEMY.map((a) => [normName(a.name), { ...a, srd: true }]));
    const packs = [...new Set(["D35E.items", ...(T()?.itemSources?.().packs ?? [])])];
    for (const id of packs) {
      const pack = game.packs.get(id);
      if (!pack || pack.documentName !== "Item") continue;
      let index;
      try { index = await D.enIndex(pack, { fields: ["system.price", "type", "system.tags"] }); } catch (e) { continue; }
      for (const e of index) {
        if (e.type === "Folder") continue;
        const k = normName(e.name);
        const tagged = T()?.readShopTags?.(e.system?.tags)?.cats?.includes("mundane:alchemical");
        if (out.has(k)) { const a = out.get(k); a.pack ??= id; a.id ??= e._id; a.display ??= e.display; continue; }
        if (!(ALCH_RE.test(e.name) || tagged) || /\blab\b|holy water|unholy water|everburning/i.test(e.name)) continue;
        out.set(k, { name: e.display ?? e.name, price: Number(e.system?.price) || 0, dc: null, pack: id, id: e._id });
      }
    }
    this.list = [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  content({ values: v }) {
    const list = this.list ?? ALCHEMY;
    const sel = v.alch ?? list[0]?.name;
    return `<p class="hint">${H("Craft (alchemy), by the SRD: raw materials cost ⅓ of the price; one check against the item's DC. Failing by 4 or less makes no progress; by 5 or more ruins half the raw materials. Only a spellcaster can use Craft (alchemy); an alchemist's lab gives +2.")}</p>
      <div class="form-group"><label>${H("Item")}</label><select name="craft.alch">${list.map((a) => opt(a.name, `${a.display ?? a.name}${a.price ? ` (${gp(a.price)}${a.dc ? `, ${t("DC {n}", { n: a.dc })}` : ""})` : ""}`, sel)).join("")}</select></div>
      <div class="form-group" data-ca="dc"><label>${H("Craft DC")}</label><select name="craft.alchDc">${GENERIC_DC.map(([d, l]) => opt(d, t(l), v.alchDc ?? 20)).join("")}</select><span class="hint" style="flex:1">${H("not an SRD item: choose its DC (SRD Craft table)")}</span></div>
      <div class="form-group"><label>${H("How many")}</label><input type="number" name="craft.qty" min="1" max="100" value="${esc(v.qty ?? 1)}"><span class="hint" style="flex:1">${H("made together: one check, the price of them all for the time")}</span></div>`;
  }

  wire(section) {
    const show = () => {
      const n = section.querySelector('[name="craft.alch"]')?.value;
      const a = (this.list ?? ALCHEMY).find((x) => x.name === n);
      section.querySelectorAll('[data-ca="dc"]').forEach((x) => { x.style.display = a?.dc ? "none" : ""; });
    };
    section.querySelector('[name="craft.alch"]')?.addEventListener("change", show);
    show();
  }

  async evaluate({ actor, values: v }) {
    await this.prepare();
    const a = this.list.find((x) => x.name === v.alch) ?? this.list[0];
    if (!a) throw new Error(t("Choose an item to make."));
    const qty = Math.max(1, Math.min(100, Number(v.qty) || 1));
    let data = null;
    if (a.pack && a.id) { try { data = (await game.packs.get(a.pack)?.getDocument(a.id))?.toObject() ?? null; } catch (e) { /* none */ } }
    if (!data) data = { name: a.display ?? a.name, type: "loot", img: "icons/consumables/potions/bottle-round-corked-orante-red.webp", system: { subType: "gear", quantity: 1, price: a.price, description: { value: "" } } };
    delete data._id; delete data.folder; delete data.sort;
    // D35E's own prices are missing for some (thunderstone 0 gp): the SRD price wins when the compendium has none
    const price = Number(data.system?.price) > 0 ? Number(data.system.price) : a.price;
    if (!(price > 0)) throw new Error(t("{name} has no price; set one in its compendium or on the Price Corrections page.", { name: a.display ?? a.name }));
    data.system.price = price;
    data.system.quantity = qty;
    data.system.identified = true;
    const dc = a.dc ?? (Number(v.alchDc) || 20);
    const total = Math.round(price * qty * 100) / 100;
    const notes = [];
    if (!a.srd) notes.push(t("Not an SRD alchemical item: Craft DC {dc} chosen from the SRD Craft table.", { dc }));
    if ((actor?.items ?? []).some((i) => /alchemist.?s lab/i.test(i.name))) notes.push(t("Has an alchemist's lab: +2 circumstance bonus on the check (add it when rolling)."));
    else notes.push(t("No alchemist's lab in the inventory (it would give +2)."));
    if ((actor?.items ?? []).some((i) => i.type === "race" && /gnome/i.test(i.name))) notes.push(t("Gnomes get +2 on Craft (alchemy) (usually already in the skill)."));
    return {
      magic: false, alchemy: true, name: `${data.name}${qty > 1 ? ` (${qty})` : ""}`, img: data.img, data, quantity: qty, market: total,
      raw: Math.round((total / 3) * 100) / 100,
      checks: [{ key: "alchemy", label: data.name, craft: "alchemy", dc, price: total, raw: Math.round((total / 3) * 100) / 100 }],
      summary: t("{qty} × {name}, {price} each; Craft (alchemy) DC {dc}", { qty, name: data.name, price: gp(price), dc }), requirements: [], notes,
    };
  }
}


/* ------------------------------------------ */
/*  Cognizance crystals and psicrowns         */
/* ------------------------------------------ */

export class CuriosPsiCraft {
  constructor(api) { this.api = api; }

  async prepare() { await this.api.loaded; await this.api.spells.index(); }

  content({ values: v }) {
    const psi = T()?.rules?.()?.psionics !== false;
    if (!psi) return `<p class="hint">${H("Psionics is off in this world (Treasure Generator → Generation settings).")}</p>`;
    const what = v.what ?? "crystal";
    const crowns = (this.api.data?.tables?.psicrowns ?? []).filter((r) => !r.artifact);
    return `<p class="hint">${H("By the SRD: supplies cost ½ of the price and the XP 1/25 of it. A cognizance crystal's manifester level is its capacity (Craft Cognizance Crystal). A psicrown holds 50 power points per manifester level (Craft Psicrown, manifester level 12; the crown's own level at least 8th); you must know each of its powers.")}</p>
      <div class="form-group"><label>${H("Item")}</label><select name="craft.what">${opt("crystal", t("Cognizance crystal (Craft Cognizance Crystal)"), what)}${opt("psicrown", t("Psicrown (Craft Psicrown)"), what)}</select></div>
      <div class="form-group" data-cp="crystal"><label>${H("Capacity")}</label><select name="craft.pp">${CRYSTAL_SIZES.map((n) => opt(n, t(n === 1 ? "{n} power point ({price})" : "{n} power points ({price})", { n, price: gp(crystalPrice(n)) }), v.pp ?? 1)).join("")}</select></div>
      <div class="form-group" data-cp="crown"><label>${H("Psicrown")}</label><select name="craft.crown">${crowns.map((r) => opt(r.name, `${dn(r.name)}: ${t("{pp} PP, ML {ml}, {price}", { pp: r.pp, ml: r.ml, price: gp(r.price) })}`, v.crown ?? "Dominator")).join("")}${opt("custom", t("Custom: the powers I list"), v.crown)}</select></div>
      <div class="form-group" data-cp="custom"><label>${H("Powers")}</label><textarea name="craft.powers" rows="3" placeholder="${H("One power per line")}">${esc(v.powers ?? "")}</textarea></div>
      <div class="form-group" data-cp="custom"><label>${H("Manifester level")}</label><input type="number" name="craft.ml" min="8" max="30" value="${esc(v.ml ?? "")}" placeholder="${H("lowest")}"><span class="hint" style="flex:1">${H("at least 8th and the highest power's minimum, at most 5 above it; points 50 × level. Price: the SRD staff formula (Axecleft house rule).")}</span></div>`;
  }

  wire(section) {
    const show = () => {
      const w = section.querySelector('[name="craft.what"]')?.value ?? "crystal";
      const c = section.querySelector('[name="craft.crown"]')?.value;
      section.querySelectorAll("[data-cp]").forEach((x) => {
        const k = x.dataset.cp;
        x.style.display = (k === "crystal" && w === "crystal") || (k === "crown" && w === "psicrown") || (k === "custom" && w === "psicrown" && c === "custom") ? "" : "none";
      });
    };
    section.querySelector('[name="craft.what"]')?.addEventListener("change", show);
    section.querySelector('[name="craft.crown"]')?.addEventListener("change", show);
    show();
  }

  async evaluate({ actor, values: v }) {
    await this.prepare();
    if (T()?.rules?.()?.psionics === false) throw new Error(t("Psionics is off in this world."));
    if ((v.what ?? "crystal") === "crystal") {
      const pp = CRYSTAL_SIZES.includes(Number(v.pp)) ? Number(v.pp) : 1;
      const data = makeCrystal(pp, { charged: false });
      const price = crystalPrice(pp);
      return {
        magic: true, feat: "Craft Cognizance Crystal", name: data.name, img: data.img, data, quantity: 1, market: price, base: price,
        casterLevel: Math.max(3, pp), casterNote: `${t("manifester level = capacity ({n})", { n: pp })}${pp < 3 ? t("; Craft Cognizance Crystal needs 3") : ""}`,
        spells: [], requirements: [], checks: [], notes: [t("The crystal is made empty: charge it with your own power points (use it).")],
        summary: t(pp === 1 ? "Cognizance crystal, {n} power point" : "Cognizance crystal, {n} power points", { n: pp }),
      };
    }
    let got, label;
    if (v.crown === "custom") {
      const powers = String(v.powers ?? "").split(/\n|;/).map((s) => s.trim()).filter(Boolean);
      got = await customCrown(this.api, { powers, ml: Number(v.ml) || null });
      label = t("Custom psicrown, ML {ml}", { ml: got.ml });
    } else {
      const row = crownRow(this.api, v.crown ?? "Dominator");
      if (!row || row.artifact) throw new Error(t("Choose a psicrown."));
      got = await makeCrown(this.api, row, { unidentified: false });
      got.ml = row.ml; got.powers = row.powers;
      label = t("{name}, ML {ml}", { name: row.name, ml: row.ml });
    }
    const data = got.data;
    data.system.identified = true;
    const contents = data.flags[MOD].contents ?? [];
    const notes = [t("{n} power points (50 × manifester level); no recharge.", { n: num(data.system.uses?.max ?? 0) })];
    const missing = (got.powers ?? []).length - contents.length;
    if (missing > 0) notes.push(t("{n} of its powers aren't in your Power sources, so they won't be on the crown.", { n: missing }));
    if (v.crown === "custom") notes.push(t("Price by the SRD staff formula: highest power level × manifester level × 375 gp, the next × ¾, the rest × ½ (Axecleft house rule; the SRD gives no psicrown formula)."));
    return {
      magic: true, feat: "Craft Psicrown", name: data.name, img: data.img, data, quantity: 1, market: got.price, base: got.price,
      casterLevel: 12, casterNote: t("Craft Psicrown 12; the crown works at manifester level {ml}", { ml: got.ml }),
      spells: contents.map((c) => ({ any: [c.name], for: data.name })), requirements: [], checks: [], notes,
      summary: `${label}: ${contents.map((c) => c.name).join(", ")}`,
    };
  }
}

/** Register Curios' kinds with the shared Crafting engine. */
export function registerCuriosCrafting(api) {
  const C = globalThis.AxecleftCrafting;
  if (!C?.registerKind) return null;
  const craft = new CuriosCraft(api);
  api.craft = craft;
  C.registerKind({
    module: MOD, key: "spell-items", label: /*t*/"Scrolls, potions, wands", icon: "fas fa-scroll", order: 30, magic: true,
    prepare: () => craft.prepare(), content: (ctx) => craft.content(ctx), wire: (s) => craft.wire(s), evaluate: (ctx) => craft.evaluate(ctx),
  });
  const items = new CuriosItemCraft(api);
  api.itemCraft = items;
  C.registerKind({
    module: MOD, key: "magic-items", label: /*t*/"Rings, rods, staffs, wondrous", icon: "fas fa-ring", order: 31, magic: true,
    prepare: () => items.prepare(), content: (ctx) => items.content(ctx), wire: (s) => items.wire(s), evaluate: (ctx) => items.evaluate(ctx),
    // At approval the GM's client rolls an intelligent item's mind and powers (SRD: "Determine other features randomly")
    beforeApprove: async ({ actor, values }) => {
      if (!values?.intel || values.intelData) return null;
      const p = await items.evaluate({ actor, values: { ...values, intelRoll: true } });
      return p.intelData ? { ...values, intelData: p.intelData } : null;
    },
  });
  const psiCraft = new CuriosPsiCraft(api);
  api.psiCraft = psiCraft;
  C.registerKind({
    module: MOD, key: "psi-items", label: /*t*/"Crystals, psicrowns", icon: "fas fa-gem", order: 33, magic: true,
    prepare: () => psiCraft.prepare(), content: (ctx) => psiCraft.content(ctx), wire: (s) => psiCraft.wire(s), evaluate: (ctx) => psiCraft.evaluate(ctx),
  });
  const alchemy = new CuriosAlchemy(api);
  api.alchemy = alchemy;
  C.registerKind({
    module: MOD, key: "alchemy", label: /*t*/"Alchemical items", icon: "fas fa-flask", order: 32, magic: false,
    prepare: () => alchemy.prepare(), content: (ctx) => alchemy.content(ctx), wire: (s) => alchemy.wire(s), evaluate: (ctx) => alchemy.evaluate(ctx),
  });
  return craft;
}
