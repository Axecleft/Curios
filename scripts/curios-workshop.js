/**
 * Axecleft's Curios — the Workshop: a Treasure Generator tab for making curios by hand.
 *
 * Potions, scrolls and wands from any spell; multi-spell scrolls and spellbooks; psionic tattoos, power stones
 * and dorjes, cognizance crystals and psicrowns (while Psionics is on); a specific ring, rod, staff or wondrous item by name (epic ones while
 * Epic items is on); or a random item by category and grade. The GM's highest potion level lives here.
 */
import * as D from "./curios-d35e.js";
import { makeMaster, makeBook } from "./curios-links.js";
import { CATS, maybeIntelligent } from "./curios-generate.js";
import { maybeLight } from "./curios-light.js";
import { makeCrystal, makeCrown, customCrown, CRYSTAL_SIZES, crystalPrice } from "./curios-psionic.js";
import { SpellPicker, parseSpellBox } from "./curios-picker.js";
import { METAMAGIC } from "./curios-consumables.js";

const T = () => globalThis.AxecleftTreasure;

/** A name from this module's English data as shown in the world's language: the word file's entry, else the name given
 *  (Babele's), else the English; first letter capitalised for lists. */
const dn = (en, shown) => {
  const s = String(globalThis.AxecleftTools?.word?.(en, { text: shown ?? null })?.text || shown || en || "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const { MOD, KINDS, normName } = D;
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel ?? "") ? " selected" : ""}>${esc(label)}</option>`;
const { gp, t } = D;
const H = (s, d) => esc(t(s, d)); // escaped text in the world's language
const STORE = "axeclefts-curios.workshop.";
const remember = (k, v) => { try { localStorage.setItem(STORE + k, v); } catch (e) { /* private mode */ } };
const recall = (k, d) => { try { return localStorage.getItem(STORE + k) ?? d; } catch (e) { return d; } };

const MAKES = [
  ["potion", /*t*/"Potion or oil", false], ["scroll", /*t*/"Scroll (one spell)", false], ["master", /*t*/"Scroll (several spells)", false], ["wand", /*t*/"Wand", false],
  ["book", /*t*/"Spellbook", false],
  ["tattoo", /*t*/"Psionic tattoo", true], ["powerstone", /*t*/"Power stone (one power)", true], ["pmaster", /*t*/"Power stone (several powers)", true], ["dorje", /*t*/"Dorje", true],
  ["crystal", /*t*/"Cognizance crystal", true], ["psicrown", /*t*/"Psicrown", true],
  ["item", /*t*/"Specific ring, rod, staff or wondrous item", false], ["random", /*t*/"Random item (SRD tables)", false],
];

export class CuriosWorkshop {
  constructor(api) { this.api = api; this.itemList = null; this.picker = new SpellPicker(api); }

  async prepare() {
    // Names for the specific-item list, filtered by the campaign switches
    const names = await this.api.generator.itemNames();
    const r = T()?.rules?.() ?? { psionics: true, epic: false };
    const list = [];
    for (const [, hits] of names) {
      const h = hits[0];
      const pack = game.packs.get(h.pack);
      const label = pack?.metadata?.label ?? h.pack;
      if (!/magic|wondrous|enchant|curio/i.test(pack?.metadata?.originalLabel ?? label) && h.pack !== "D35E.magicitems") continue;
      if (!r.epic && this.api.isEpic(h.name)) continue;
      if (!r.psionics && this.api.isPsionic(h.name)) continue;
      list.push(h.display ?? h.name); // as named in this world (Babele); found by either name
    }
    this.itemList = [...new Set(list)].sort((a, b) => a.localeCompare(b));
  }

  content() {
    const r = T()?.rules?.() ?? { psionics: true, epic: false };
    const make = recall("make", "potion");
    const makes = MAKES.filter(([, , psi]) => !psi || r.psionics);
    const cap = this.api.spells.potionCap(), wcap = this.api.spells.wandCap();
    const L = (s) => `<label>${H(s)}</label>`;
    const hint = (s, d) => `<span class="hint" style="flex:1">${H(s, d)}</span>`;
    return `<p class="hint">${H(r.psionics ? "Make potions, scrolls, wands and spellbooks from any spell in your Spell sources, and psionic tattoos, power stones and dorjes from your Power sources. Prices follow the SRD; treasure starts unidentified." : "Make potions, scrolls, wands and spellbooks from any spell in your Spell sources. Prices follow the SRD; treasure starts unidentified.")}</p>
      <div class="form-group">${L("Make")}<select name="cw.make">${makes.map(([k, l]) => opt(k, t(l), make)).join("")}</select></div>
      <div class="form-group" data-cw="spells"><label data-cw-label>${H("Spells")}</label><textarea name="cw.spells" rows="4" placeholder="${H("One per line. Add @ and a caster level to raise it: Fireball @10")}">${esc(recall("spells", ""))}</textarea></div>
      <div data-cw="spells">${this.picker.html()}</div>
      <div class="form-group" data-cw="list">${L("Scroll type")}<select name="cw.list">${opt("", t("Arcane if the spell is arcane, else divine"), recall("list", ""))}${opt("arcane", t("Arcane"), recall("list", ""))}${opt("divine", t("Divine"), recall("list", ""))}</select></div>
      <div class="form-group" data-cw="cl">${L("Caster level")}<input type="number" name="cw.cl" min="1" max="40" value="${esc(recall("cl", ""))}" placeholder="${H("minimum")}">${hint("blank: the lowest that can cast it")}</div>
      <div class="form-group" data-cw="book">${L("Spells")}<select name="cw.bookMode">${opt("listed", t("The spells I list"), recall("bookMode", "listed"))}${opt("random", t("Random spells"), recall("bookMode", "listed"))}</select></div>
      <div class="form-group" data-cw="bookRandom">${L("Highest spell level")}<select name="cw.bookMax">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => opt(n, n === 0 ? t("0 (cantrips only)") : String(n), recall("bookMax", "3"))).join("")}</select></div>
      <div class="form-group" data-cw="bookRandom">${L("Number of spells")}<input type="number" name="cw.bookCount" min="1" max="100" value="${esc(recall("bookCount", "10"))}">${hint("random levels from 0 to the highest, no duplicates; stops early if the book is full (100 pages)")}</div>
      <div class="form-group" data-cw="book">${L("Spellbook class")}<input type="text" name="cw.cls" value="${esc(recall("cls", "Wizard"))}">${hint("its spells go in the owner's spellbook for this class")}</div>
      <div class="form-group" data-cw="item">${L("Item")}<input type="text" name="cw.item" list="cw-items" value="${esc(recall("item", ""))}" placeholder="${H("Type to search your item sources")}"><datalist id="cw-items">${(this.itemList ?? []).map((n) => `<option value="${esc(n)}">`).join("")}</datalist></div>
      <div class="form-group" data-cw="crystal">${L("Capacity")}<select name="cw.pp">${CRYSTAL_SIZES.map((n) => opt(n, `${t(n === 1 ? "{n} power point" : "{n} power points", { n })} (${gp(crystalPrice(n))})`, recall("pp", "1"))).join("")}</select><label class="atg-cb" style="flex:1"><input type="checkbox" name="cw.charged" ${recall("charged", "1") === "1" ? "checked" : ""}> ${H("Charged")}</label></div>
      <div class="form-group" data-cw="crown">${L("Psicrown")}<select name="cw.crown">${(this.api.data?.tables?.psicrowns ?? []).map((r) => opt(r.name, `${dn(r.name)}${r.artifact ? ` ${t("(artifact)")}` : ""}: ${r.pp} PP, ${t("ML {n}", { n: r.ml })}${r.price ? `, ${gp(r.price)}` : ""}`, recall("crown", "Dominator"))).join("")}${opt("custom", t("Custom: the powers I list"), recall("crown", "Dominator"))}</select></div>
      <div class="form-group" data-cw="light">${L("Sheds light")}<select name="cw.light">${opt("settings", t("By Generation settings (random)"), recall("light", "settings"))}${opt("none", t("No"), recall("light", "settings"))}${opt("on", t("Yes"), recall("light", "settings"))}</select>${hint("rings, rods, staffs and wondrous items; look from the item's school of magic")}</div>
      <div class="form-group" data-cw="light">${L("Intelligent")}<select name="cw.intel">${opt("settings", t("By Generation settings (random)"), recall("intel", "settings"))}${opt("none", t("No"), recall("intel", "settings"))}${opt("on", t("Yes (roll its mind and powers)"), recall("intel", "settings"))}</select></div>
      ${T()?.curseField?.("cw.cursed") ?? ""}
      <div class="form-group" data-cw="random">${L("Category")}<select name="cw.cat">${Object.keys(CATS).map((c) => opt(c, t(T()?.CATEGORIES?.[c]?.label ?? c), recall("cat", "magic:wondrous"))).join("")}</select>
        <select name="cw.grade">${["minor", "medium", "major"].map((g) => opt(g, t(g[0].toUpperCase() + g.slice(1)), recall("grade", "medium"))).join("")}</select></div>
      <div class="form-group">${L("How many")}<input type="number" name="cw.count" min="1" max="20" value="${esc(recall("count", "1"))}"><label class="atg-cb" style="flex:1"><input type="checkbox" name="cw.unid" ${recall("unid", "1") === "1" ? "checked" : ""}> ${H("Unidentified")}</label></div>
      <div class="form-group" data-cw="cl">${L("SRD limits")}<label class="atg-cb" style="flex:1"><input type="checkbox" name="cw.force" ${recall("force", "0") === "1" ? "checked" : ""}> ${H("Ignore them (GM): any spell level, area spells in potions, personal spells")}</label></div>
      <p class="hint" data-cw-check></p>
      <fieldset><legend>${H("GM only")}</legend>
        <div class="form-group">${L("Highest potion level")}<input type="number" name="cw.potionLevel" min="3" max="9" value="${cap}">${hint(r.psionics ? "SRD: 3rd. Raise it to let the GM make potions and tattoos of higher-level spells and powers here. Players' crafting always stays at 3rd." : "SRD: 3rd. Raise it to let the GM make potions of higher-level spells here. Players' crafting always stays at 3rd.")}</div>
        <div class="form-group">${L("Highest wand level")}<input type="number" name="cw.wandLevel" min="4" max="9" value="${wcap}">${hint(r.psionics ? "SRD: 4th. Raise it to let the GM make wands and dorjes of higher-level spells and powers here. Players' crafting always stays at 4th." : "SRD: 4th. Raise it to let the GM make wands of higher-level spells here. Players' crafting always stays at 4th.")}</div>
      </fieldset>`;
  }

  wire(section) {
    const el = (n) => section.querySelector(`[name="cw.${n}"]`);
    const show = () => {
      const m = el("make").value;
      const custom = m === "psicrown" && el("crown")?.value === "custom";
      const spelly = ["potion", "scroll", "master", "wand", "book", "tattoo", "powerstone", "pmaster", "dorje"].includes(m) || custom;
      const psi = ["tattoo", "powerstone", "pmaster", "dorje"].includes(m) || custom;
      section.querySelectorAll("[data-cw]").forEach((x) => {
        const k = x.dataset.cw;
        x.style.display = (k === "spells" && spelly) || (k === "list" && (m === "scroll" || m === "master")) || (k === "cl" && spelly && m !== "book") || (k === "crystal" && m === "crystal") || (k === "crown" && m === "psicrown")
          || (k === "light" && (m === "item" || (m === "random" && !["magic:potion", "magic:scroll", "magic:wand"].includes(el("cat")?.value)))) || (k === "book" && m === "book") || (k === "bookRandom" && m === "book" && el("bookMode")?.value === "random") || (k === "item" && m === "item") || (k === "random" && m === "random") ? "" : "none";
      });
      const lab = section.querySelector("[data-cw-label]");
      if (lab) lab.textContent = psi ? t("Powers") : t("Spells");
      section.querySelector("[name='cw.spells']").placeholder = custom ? t("One power per line. The manifester level below (blank: the lowest, at least 8th). Price by the SRD staff formula (house rule).") : m === "book" ? (el("bookMode")?.value === "random" ? t("Optional: spells that must be in the book, one per line; random ones fill the rest") : t("One spell per line")) : psi ? t("One per line. Add @ and a manifester level to raise it: Energy Ray @7") : t("One per line. Add @ and a caster level to raise it, and + for metamagic: Fireball @10 +empower");
      T()?.refreshSize?.();
    };
    section.addEventListener("change", (ev) => {
      const n = ev.target?.name?.slice(3);
      if (!n) return;
      if (n === "potionLevel") { this.api.setSetting("potionLevel", Math.min(9, Math.max(3, Number(ev.target.value) || 3))).then(() => this.check(section)); return; }
      if (n === "wandLevel") { this.api.setSetting("wandLevel", Math.min(9, Math.max(4, Number(ev.target.value) || 4))).then(() => this.check(section)); return; }
      remember(n, ev.target.type === "checkbox" ? (ev.target.checked ? "1" : "0") : ev.target.value);
      show();
      this.check(section);
    });
    section.querySelector("[name='cw.spells']")?.addEventListener("input", (ev) => remember("spells", ev.target.value));
    show();
    this.check(section);
    // The spell picker (1.14.9.18): lists of spells by level, caster level and metamagic, added to the Spells box
    const el2 = (n) => section.querySelector(`[name="cw.${n}"]`);
    this.picker.wire(section, {
      box: el2("spells"),
      state: () => {
        const m = el2("make").value, custom = m === "psicrown" && el2("crown")?.value === "custom";
        const kind = custom ? "powerstone" : m === "book" ? "book" : ({ master: "scroll", pmaster: "powerstone" }[m] ?? m);
        return { kind, list: el2("list")?.value || null, cls: el2("cls")?.value, many: ["master", "pmaster", "book"].includes(m) || custom, cl: !custom && m !== "book", gm: true, force: !!el2("force")?.checked };
      },
      // Filtering a spellbook's spells by a class sets the Spellbook class
      onClass: (c) => { const box = el2("cls"); if (box && box.value !== c) { box.value = c; box.dispatchEvent(new Event("change", { bubbles: true })); } },
    }).catch((e) => console.error("Curios | spell picker", e));
  }

  read(section) {
    const v = (n) => section.querySelector(`[name="cw.${n}"]`)?.value ?? "";
    // "Fireball @10 +empower": caster level after @, metamagic after + (1.14.9.18: metamagic here too, as in crafting)
    const lines = parseSpellBox(v("spells"));
    return { make: v("make"), lines, list: v("list") || null, cl: Number(v("cl")) || null, cls: v("cls").trim() || "Wizard", item: v("item").trim(),
      bookMode: v("bookMode") || "listed", bookMax: Math.max(0, Math.min(9, Number(v("bookMax")) || 0)), bookCount: Math.max(1, Math.min(100, Number(v("bookCount")) || 1)),
      pp: Number(v("pp")) || 1, charged: !!section.querySelector('[name="cw.charged"]')?.checked, crown: v("crown") || "Dominator",
      cat: v("cat"), grade: v("grade") || "medium", force: !!section.querySelector('[name="cw.force"]')?.checked, light: v("light") || "settings", intel: v("intel") || "settings", count: Math.max(1, Math.min(20, Number(v("count")) || 1)), unid: !!section.querySelector('[name="cw.unid"]')?.checked };
  }

  /** Check the spells as they are typed: found, level, rules. */
  async check(section) {
    const out = section.querySelector("[data-cw-check]");
    if (!out) return;
    const f = this.read(section);
    const kind = { master: "scroll", pmaster: "powerstone" }[f.make] ?? f.make;
    if (!KINDS[kind] && f.make !== "book") { out.textContent = ""; return; }
    if (!f.lines.length) { out.textContent = ""; return; }
    const bits = [];
    for (const l of f.lines.slice(0, 12)) {
      const hit = await this.api.spells.find(l.name, { power: f.make !== "book" && KINDS[kind]?.psionic });
      if (l.error) { bits.push(`✘ ${l.text}: ${l.error}`); continue; }
      if (!hit) { bits.push(`✘ ${l.name}: ${t("not found")}`); continue; }
      if (f.make === "book") { const lv = hit.facts.arcane ?? hit.facts.level; { const pg = Math.max(1, Number(lv) || 0); bits.push(`✔ ${hit.name} (${t(pg === 1 ? "level {lv}, {n} page" : "level {lv}, {n} pages", { lv: lv ?? "?", n: pg })})`); }; continue; }
      const level = hit.facts.isPower ? hit.facts.psionic : kind === "scroll" ? ((f.list === "divine" ? hit.facts.divine : f.list === "arcane" ? hit.facts.arcane : hit.facts.arcane ?? hit.facts.divine)) : hit.facts.level;
      // With metamagic: the effective level counts for the item's limits
      const mm = KINDS[kind]?.psionic ? [] : l.metamagic ?? [];
      const eff = (Math.max(level ?? 0, ...mm.filter((x) => x.key === "heighten").map((x) => Number(x.to) || 0))) + mm.reduce((a, x) => a + (METAMAGIC[x.key]?.adj ?? 0), 0);
      const p = f.force ? [] : this.api.spells.problems(hit.facts, kind, eff);
      bits.push(`${p.length ? "✘" : "✔"} ${hit.display ?? hit.name} (${t("level {lv}", { lv: level ?? "?" })}${eff !== level ? `, ${t("as {n} with metamagic", { n: D.ord(eff) })}` : ""})${p.length ? `: ${p.join(" ")}` : ""}`);
    }
    out.textContent = bits.join(" · ");
  }

  /** Make the items (the hub calls this once per target actor). */
  async makeOne(f) {
    if (f.make === "random") {
      const [e] = await this.api.generator.generate(f.cat, { grade: f.grade, unidentified: f.unid, light: f.light === "on" ? true : f.light === "none" ? false : null, intel: f.intel === "on" ? true : f.intel === "none" ? false : null });
      return e;
    }
    if (f.make === "item") {
      if (!f.item) throw new Error(t("Type the name of an item."));
      const row = this.api.findRow(f.item) ?? { name: f.item, item: f.item };
      if (this.api.isEpic(row.item ?? row.name) && !T()?.rules?.()?.epic) throw new Error(t("{item} is an epic item; turn on Epic items (Treasure by Level → Generation settings).", { item: f.item }));
      const got = await this.api.generator.fixedItem(row, { unidentified: f.unid });
      const lit = maybeLight(got.data, { force: f.light === "on" ? true : f.light === "none" ? false : null });
      const smart = await maybeIntelligent(this.api, got.data, f.intel === "on" ? true : f.intel === "none" ? false : null);
      return { name: got.name, data: got.data, summary: `${gp(Number(got.data.system.price) || got.price)}${got.note ? ` (${got.note})` : ""}${lit ? t("; sheds light") : ""}${smart ? `; ${smart.summary}` : ""}` };
    }
    if (f.make === "book") return this.makeBook(f);
    if (f.make === "crystal") {
      const data = makeCrystal(f.pp, { unidentified: f.unid, charged: f.charged });
      return { name: data.name, data, summary: t(f.charged ? "Cognizance crystal, {pp} PP, {price}" : "Cognizance crystal, {pp} PP (empty), {price}", { pp: f.pp, price: gp(data.system.price) }) };
    }
    if (f.make === "psicrown") {
      if (f.crown === "custom") {
        const c = await customCrown(this.api, { powers: f.lines.map((l) => l.name), ml: f.cl });
        if (f.unid) D.setUnidentified(c.data, "Headband");
        return { name: c.name, data: c.data, summary: t("Custom psicrown, ML {ml} ({pp} PP), {n} powers, {price} (SRD staff formula, house rule)", { ml: c.ml, pp: 50 * c.ml, n: c.powers.length, price: gp(c.price) }) };
      }
      const row = (this.api.data.tables.psicrowns ?? []).find((r) => r.name === f.crown);
      if (!row) throw new Error(t("Choose a psicrown."));
      const got = await makeCrown(this.api, row, { unidentified: f.unid });
      const n = got.data.flags[MOD].contents.length;
      return { name: got.name, data: got.data, summary: `${t("Psicrown, {pp} PP, ML {ml}, {n} of {m} powers", { pp: row.pp, ml: row.ml, n, m: row.powers.length })}${got.price ? `, ${gp(got.price)}` : ""}${got.note ? ` (${got.note})` : ""}` };
    }
    if (!f.lines.length) throw new Error(t("Type at least one spell or power."));
    const kind = { master: "scroll", pmaster: "powerstone" }[f.make] ?? f.make;
    const made = [];
    for (const l of (f.make === "master" || f.make === "pmaster") ? f.lines : f.lines.slice(0, 1)) {
      if (l.error) throw new Error(l.error);
      made.push(await this.api.spells.make({ name: l.name, kind, cl: l.cl ?? f.cl, list: f.list, gm: true, force: f.force, metamagic: l.metamagic, unidentified: f.unid && made.length === 0 && f.make !== "master" && f.make !== "pmaster" }));
    }
    if (f.make === "master" || f.make === "pmaster") {
      const data = makeMaster(kind, made, { unidentified: f.unid });
      return { name: data.name, data, summary: t(kind === "powerstone" ? "{n} powers, {price}" : "{n} spells, {price}", { n: made.length, price: gp(data.system.price) }) };
    }
    const m = made[0];
    return { name: m.name, data: m.data, summary: `${t(KINDS[kind].label)}, ${m.cl ? `${t(KINDS[kind].psionic ? "ML" : "CL")} ${m.cl}, ` : ""}${gp(m.price)}` };
  }

  /**
   * A spellbook: the listed spells, or (random) the listed ones plus random spells from the class's list,
   * each of a random level from 0 to the highest, no duplicates, until the number is reached or the book is full.
   */
  async makeBook(f) {
    const CAP = 100;
    const spells = [], seen = new Set();
    let pages = 0;
    const add = async (hit, level) => {
      const doc = await game.packs.get(hit.pack)?.getDocument(hit.id);
      if (!doc) return false;
      spells.push({ data: doc.toObject(), name: hit.name, shown: hit.display ?? hit.name, level });
      seen.add(normName(hit.name));
      pages += Math.max(1, level);
      return true;
    };
    for (const l of f.lines) {
      const hit = await this.api.spells.find(l.name);
      if (!hit) throw new Error(t("Spell \"{name}\" is not in your Spell sources.", { name: l.name }));
      if (seen.has(normName(hit.name))) continue;
      const lv = hit.facts.classes.find(([c]) => normName(c) === normName(f.cls))?.[1] ?? hit.facts.arcane ?? hit.facts.level ?? 0;
      await add(hit, lv);
    }
    let note = "";
    if (f.bookMode === "random") {
      const byLevel = await this.api.spells.forClass(f.cls);
      if (!byLevel.size) throw new Error(t("No spells for the class \"{cls}\" in your Spell sources (D35E's spell lists name Wizard, Sorcerer, Cleric, Druid, Bard, Ranger, Paladin…).", { cls: f.cls }));
      const target = Math.max(f.bookCount, spells.length);
      while (spells.length < target) {
        // Levels that still have an unused spell that fits in the pages left
        const open = [];
        for (let lv = 0; lv <= f.bookMax; lv++) {
          if (pages + Math.max(1, lv) > CAP) continue;
          if ((byLevel.get(lv) ?? []).some((h) => !seen.has(normName(h.name)))) open.push(lv);
        }
        if (!open.length) { note = pages + 1 > CAP ? t("the book is full") : t("no more {cls} spells of level 0–{max} that fit", { cls: f.cls, max: f.bookMax }); break; }
        const lv = open[Math.floor(Math.random() * open.length)];
        const choices = byLevel.get(lv).filter((h) => !seen.has(normName(h.name)));
        await add(choices[Math.floor(Math.random() * choices.length)], lv);
      }
    }
    if (!spells.length) throw new Error(t("Type at least one spell, or choose Random spells."));
    spells.sort((a, b) => a.level - b.level || a.shown.localeCompare(b.shown));
    const data = makeBook(spells, { cls: f.cls, capacity: CAP });
    return { name: data.name, data, summary: `${t("{n} spells (levels {a}–{b}), {pages} pages, {price}", { n: spells.length, a: spells[0].level, b: spells.at(-1).level, pages: data.flags[MOD].book.pages, price: gp(data.system.price) })}${note ? t("; stopped early: {note}", { note }) : ""}` };
  }

  async generate(form, ctx = {}) {
    const section = ctx.section ?? form;
    const f = this.read(section);
    const entries = [];
    for (let i = 0; i < f.count; i++) entries.push(await this.makeOne(f));
    // Treasure Generator 9.96: an SRD curse when the GM asks for one
    const cursed = section.querySelector?.('[name="cw.cursed"]')?.value ?? "none";
    const made = (await T()?.curseEntries?.(entries, cursed)) ?? entries;
    return { entries: made, note: f.count > 1 ? t("{n} items from the Workshop", { n: f.count }) : "" };
  }
}

export function registerWorkshop(api) {
  const hub = T();
  if (!hub?.registerTab) return;
  const ws = new CuriosWorkshop(api);
  api.workshop = ws;
  hub.registerTab({
    module: MOD, name: "workshop", title: /*t*/"Curios", icon: "fas fa-scroll", order: 45,
    prepare: async () => { await api.loaded; await ws.prepare(); },
    content: () => ws.content(),
    wire: (section) => ws.wire(section),
    generate: async (form, ctx) => { await api.loaded; return ws.generate(form, ctx); },
    generateTitle: () => t("Curios"),
  });
}
