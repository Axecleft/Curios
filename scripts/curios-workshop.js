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

const T = () => globalThis.AxecleftTreasure;
const { MOD, KINDS, normName } = D;
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel ?? "") ? " selected" : ""}>${esc(label)}</option>`;
const gp = (n) => `${Number(Math.round(n * 100) / 100).toLocaleString("en-US")} gp`;
const STORE = "axeclefts-curios.workshop.";
const remember = (k, v) => { try { localStorage.setItem(STORE + k, v); } catch (e) { /* private mode */ } };
const recall = (k, d) => { try { return localStorage.getItem(STORE + k) ?? d; } catch (e) { return d; } };

const MAKES = [
  ["potion", "Potion or oil", false], ["scroll", "Scroll (one spell)", false], ["master", "Scroll (several spells)", false], ["wand", "Wand", false],
  ["book", "Spellbook", false],
  ["tattoo", "Psionic tattoo", true], ["powerstone", "Power stone (one power)", true], ["pmaster", "Power stone (several powers)", true], ["dorje", "Dorje", true],
  ["crystal", "Cognizance crystal", true], ["psicrown", "Psicrown", true],
  ["item", "Specific ring, rod, staff or wondrous item", false], ["random", "Random item (SRD tables)", false],
];

export class CuriosWorkshop {
  constructor(api) { this.api = api; this.itemList = null; }

  async prepare() {
    // Names for the specific-item list, filtered by the campaign switches
    const names = await this.api.generator.itemNames();
    const r = T()?.rules?.() ?? { psionics: true, epic: false };
    const list = [];
    for (const [, hits] of names) {
      const h = hits[0];
      const pack = game.packs.get(h.pack);
      const label = pack?.metadata?.label ?? h.pack;
      if (!/magic|wondrous|enchant|curio/i.test(label) && h.pack !== "D35E.magicitems") continue;
      if (!r.epic && this.api.isEpic(h.name)) continue;
      if (!r.psionics && this.api.isPsionic(h.name)) continue;
      list.push(h.name);
    }
    this.itemList = [...new Set(list)].sort((a, b) => a.localeCompare(b));
  }

  content() {
    const r = T()?.rules?.() ?? { psionics: true, epic: false };
    const make = recall("make", "potion");
    const makes = MAKES.filter(([, , psi]) => !psi || r.psionics);
    const cap = this.api.spells.potionCap(), wcap = this.api.spells.wandCap();
    return `<p class="hint">Make potions, scrolls, wands and spellbooks from any spell in your Spell sources${r.psionics ? ", and psionic tattoos, power stones and dorjes from your Power sources" : ""}. Prices follow the SRD; treasure starts unidentified.</p>
      <div class="form-group"><label>Make</label><select name="cw.make">${makes.map(([k, l]) => opt(k, l, make)).join("")}</select></div>
      <div class="form-group" data-cw="spells"><label data-cw-label>Spells</label><textarea name="cw.spells" rows="4" placeholder="One per line. Add @ and a caster level to raise it: Fireball @10">${esc(recall("spells", ""))}</textarea></div>
      <div class="form-group" data-cw="list"><label>Scroll type</label><select name="cw.list">${opt("", "Arcane if the spell is arcane, else divine", recall("list", ""))}${opt("arcane", "Arcane", recall("list", ""))}${opt("divine", "Divine", recall("list", ""))}</select></div>
      <div class="form-group" data-cw="cl"><label>Caster level</label><input type="number" name="cw.cl" min="1" max="40" value="${esc(recall("cl", ""))}" placeholder="minimum"><span class="hint" style="flex:1">blank: the lowest that can cast it</span></div>
      <div class="form-group" data-cw="book"><label>Spells</label><select name="cw.bookMode">${opt("listed", "The spells I list", recall("bookMode", "listed"))}${opt("random", "Random spells", recall("bookMode", "listed"))}</select></div>
      <div class="form-group" data-cw="bookRandom"><label>Highest spell level</label><select name="cw.bookMax">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => opt(n, n === 0 ? "0 (cantrips only)" : String(n), recall("bookMax", "3"))).join("")}</select></div>
      <div class="form-group" data-cw="bookRandom"><label>Number of spells</label><input type="number" name="cw.bookCount" min="1" max="100" value="${esc(recall("bookCount", "10"))}"><span class="hint" style="flex:1">random levels from 0 to the highest, no duplicates; stops early if the book is full (100 pages)</span></div>
      <div class="form-group" data-cw="book"><label>Spellbook class</label><input type="text" name="cw.cls" value="${esc(recall("cls", "Wizard"))}"><span class="hint" style="flex:1">its spells go in the owner's spellbook for this class</span></div>
      <div class="form-group" data-cw="item"><label>Item</label><input type="text" name="cw.item" list="cw-items" value="${esc(recall("item", ""))}" placeholder="Type to search your item sources"><datalist id="cw-items">${(this.itemList ?? []).map((n) => `<option value="${esc(n)}">`).join("")}</datalist></div>
      <div class="form-group" data-cw="crystal"><label>Capacity</label><select name="cw.pp">${CRYSTAL_SIZES.map((n) => opt(n, `${n} power point${n === 1 ? "" : "s"} (${gp(crystalPrice(n))})`, recall("pp", "1"))).join("")}</select><label class="atg-cb" style="flex:1"><input type="checkbox" name="cw.charged" ${recall("charged", "1") === "1" ? "checked" : ""}> Charged</label></div>
      <div class="form-group" data-cw="crown"><label>Psicrown</label><select name="cw.crown">${(this.api.data?.tables?.psicrowns ?? []).map((r) => opt(r.name, `${r.name}${r.artifact ? " (artifact)" : ""}: ${r.pp} PP, ML ${r.ml}${r.price ? `, ${gp(r.price)}` : ""}`, recall("crown", "Dominator"))).join("")}${opt("custom", "Custom: the powers I list", recall("crown", "Dominator"))}</select></div>
      <div class="form-group" data-cw="light"><label>Sheds light</label><select name="cw.light">${opt("settings", "By Generation settings (random)", recall("light", "settings"))}${opt("none", "No", recall("light", "settings"))}${opt("on", "Yes", recall("light", "settings"))}</select><span class="hint" style="flex:1">rings, rods, staffs and wondrous items; look from the item's school of magic</span></div>
      <div class="form-group" data-cw="light"><label>Intelligent</label><select name="cw.intel">${opt("settings", "By Generation settings (random)", recall("intel", "settings"))}${opt("none", "No", recall("intel", "settings"))}${opt("on", "Yes (roll its mind and powers)", recall("intel", "settings"))}</select></div>
      <div class="form-group" data-cw="random"><label>Category</label><select name="cw.cat">${Object.keys(CATS).map((c) => opt(c, T()?.CATEGORIES?.[c]?.label ?? c, recall("cat", "magic:wondrous"))).join("")}</select>
        <select name="cw.grade">${["minor", "medium", "major"].map((g) => opt(g, g[0].toUpperCase() + g.slice(1), recall("grade", "medium"))).join("")}</select></div>
      <div class="form-group"><label>How many</label><input type="number" name="cw.count" min="1" max="20" value="${esc(recall("count", "1"))}"><label class="atg-cb" style="flex:1"><input type="checkbox" name="cw.unid" ${recall("unid", "1") === "1" ? "checked" : ""}> Unidentified</label></div>
      <div class="form-group" data-cw="cl"><label>SRD limits</label><label class="atg-cb" style="flex:1"><input type="checkbox" name="cw.force" ${recall("force", "0") === "1" ? "checked" : ""}> Ignore them (GM): any spell level, area spells in potions, personal spells</label></div>
      <p class="hint" data-cw-check></p>
      <fieldset><legend>GM only</legend>
        <div class="form-group"><label>Highest potion level</label><input type="number" name="cw.potionLevel" min="3" max="9" value="${cap}"><span class="hint" style="flex:1">SRD: 3rd. Raise it to let the GM make potions${r.psionics ? " and tattoos" : ""} of higher-level ${r.psionics ? "spells and powers" : "spells"} here. Players' crafting always stays at 3rd.</span></div>
        <div class="form-group"><label>Highest wand level</label><input type="number" name="cw.wandLevel" min="4" max="9" value="${wcap}"><span class="hint" style="flex:1">SRD: 4th. Raise it to let the GM make wands${r.psionics ? " and dorjes" : ""} of higher-level ${r.psionics ? "spells and powers" : "spells"} here. Players' crafting always stays at 4th.</span></div>
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
      if (lab) lab.textContent = psi ? "Powers" : "Spells";
      section.querySelector("[name='cw.spells']").placeholder = custom ? "One power per line. The manifester level below (blank: the lowest, at least 8th). Price by the SRD staff formula (house rule)." : m === "book" ? (el("bookMode")?.value === "random" ? "Optional: spells that must be in the book, one per line; random ones fill the rest" : "One spell per line") : `One per line. Add @ and a ${psi ? "manifester" : "caster"} level to raise it: ${psi ? "Energy Ray @7" : "Fireball @10"}`;
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
  }

  read(section) {
    const v = (n) => section.querySelector(`[name="cw.${n}"]`)?.value ?? "";
    const lines = v("spells").split(/\n|;/).map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(.*?)\s*@\s*(\d+)\s*$/);
      return m ? { name: m[1].trim(), cl: Number(m[2]) } : { name: s, cl: null };
    });
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
      if (!hit) { bits.push(`✘ ${l.name}: not found`); continue; }
      if (f.make === "book") { const lv = hit.facts.arcane ?? hit.facts.level; bits.push(`✔ ${hit.name} (level ${lv ?? "?"}, ${Math.max(1, Number(lv) || 0)} page${Math.max(1, Number(lv) || 0) === 1 ? "" : "s"})`); continue; }
      const level = hit.facts.isPower ? hit.facts.psionic : kind === "scroll" ? ((f.list === "divine" ? hit.facts.divine : f.list === "arcane" ? hit.facts.arcane : hit.facts.arcane ?? hit.facts.divine)) : hit.facts.level;
      const p = this.api.spells.problems(hit.facts, kind, level ?? 0);
      bits.push(`${p.length ? "✘" : "✔"} ${hit.name} (level ${level ?? "?"})${p.length ? `: ${p.join(" ")}` : ""}`);
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
      if (!f.item) throw new Error("Type the name of an item.");
      const row = this.api.findRow(f.item) ?? { name: f.item, item: f.item };
      if (this.api.isEpic(row.item ?? row.name) && !T()?.rules?.()?.epic) throw new Error(`${f.item} is an epic item; turn on Epic items (Treasure by Level → Generation settings).`);
      const got = await this.api.generator.fixedItem(row, { unidentified: f.unid });
      const lit = maybeLight(got.data, { force: f.light === "on" ? true : f.light === "none" ? false : null });
      const smart = await maybeIntelligent(this.api, got.data, f.intel === "on" ? true : f.intel === "none" ? false : null);
      return { name: got.name, data: got.data, summary: `${gp(Number(got.data.system.price) || got.price)}${got.note ? ` (${got.note})` : ""}${lit ? "; sheds light" : ""}${smart ? `; ${smart.summary}` : ""}` };
    }
    if (f.make === "book") return this.makeBook(f);
    if (f.make === "crystal") {
      const data = makeCrystal(f.pp, { unidentified: f.unid, charged: f.charged });
      return { name: data.name, data, summary: `Cognizance crystal, ${f.pp} PP${f.charged ? "" : " (empty)"}, ${gp(data.system.price)}` };
    }
    if (f.make === "psicrown") {
      if (f.crown === "custom") {
        const c = await customCrown(this.api, { powers: f.lines.map((l) => l.name), ml: f.cl });
        if (f.unid) D.setUnidentified(c.data, "Headband");
        return { name: c.name, data: c.data, summary: `Custom psicrown, ML ${c.ml} (${50 * c.ml} PP), ${c.powers.length} powers, ${gp(c.price)} (SRD staff formula, house rule)` };
      }
      const row = (this.api.data.tables.psicrowns ?? []).find((r) => r.name === f.crown);
      if (!row) throw new Error("Choose a psicrown.");
      const got = await makeCrown(this.api, row, { unidentified: f.unid });
      const n = got.data.flags[MOD].contents.length;
      return { name: got.name, data: got.data, summary: `Psicrown, ${row.pp} PP, ML ${row.ml}, ${n} of ${row.powers.length} powers${got.price ? `, ${gp(got.price)}` : ""}${got.note ? ` (${got.note})` : ""}` };
    }
    if (!f.lines.length) throw new Error("Type at least one spell or power.");
    const kind = { master: "scroll", pmaster: "powerstone" }[f.make] ?? f.make;
    const made = [];
    for (const l of (f.make === "master" || f.make === "pmaster") ? f.lines : f.lines.slice(0, 1)) {
      made.push(await this.api.spells.make({ name: l.name, kind, cl: l.cl ?? f.cl, list: f.list, gm: true, force: f.force, unidentified: f.unid && made.length === 0 && f.make !== "master" && f.make !== "pmaster" }));
    }
    if (f.make === "master" || f.make === "pmaster") {
      const data = makeMaster(kind, made, { unidentified: f.unid });
      return { name: data.name, data, summary: `${made.length} ${kind === "powerstone" ? "powers" : "spells"}, ${gp(data.system.price)}` };
    }
    const m = made[0];
    return { name: m.name, data: m.data, summary: `${KINDS[kind].label}, ${m.cl ? `${KINDS[kind].psionic ? "ML" : "CL"} ${m.cl}, ` : ""}${gp(m.price)}` };
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
      spells.push({ data: doc.toObject(), name: hit.name, level });
      seen.add(normName(hit.name));
      pages += Math.max(1, level);
      return true;
    };
    for (const l of f.lines) {
      const hit = await this.api.spells.find(l.name);
      if (!hit) throw new Error(`Spell "${l.name}" is not in your Spell sources.`);
      if (seen.has(normName(hit.name))) continue;
      const lv = hit.facts.classes.find(([c]) => normName(c) === normName(f.cls))?.[1] ?? hit.facts.arcane ?? hit.facts.level ?? 0;
      await add(hit, lv);
    }
    let note = "";
    if (f.bookMode === "random") {
      const byLevel = await this.api.spells.forClass(f.cls);
      if (!byLevel.size) throw new Error(`No spells for the class "${f.cls}" in your Spell sources (D35E's spell lists name Wizard, Sorcerer, Cleric, Druid, Bard, Ranger, Paladin…).`);
      const target = Math.max(f.bookCount, spells.length);
      while (spells.length < target) {
        // Levels that still have an unused spell that fits in the pages left
        const open = [];
        for (let lv = 0; lv <= f.bookMax; lv++) {
          if (pages + Math.max(1, lv) > CAP) continue;
          if ((byLevel.get(lv) ?? []).some((h) => !seen.has(normName(h.name)))) open.push(lv);
        }
        if (!open.length) { note = pages + 1 > CAP ? "the book is full" : `no more ${f.cls} spells of level 0–${f.bookMax} that fit`; break; }
        const lv = open[Math.floor(Math.random() * open.length)];
        const choices = byLevel.get(lv).filter((h) => !seen.has(normName(h.name)));
        await add(choices[Math.floor(Math.random() * choices.length)], lv);
      }
    }
    if (!spells.length) throw new Error("Type at least one spell, or choose Random spells.");
    spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    const data = makeBook(spells, { cls: f.cls, capacity: CAP });
    return { name: data.name, data, summary: `${spells.length} spells (levels ${spells[0].level}–${spells.at(-1).level}), ${data.flags[MOD].book.pages} pages, ${gp(data.system.price)}${note ? `; stopped early: ${note}` : ""}` };
  }

  async generate(form, ctx = {}) {
    const section = ctx.section ?? form;
    const f = this.read(section);
    const entries = [];
    for (let i = 0; i < f.count; i++) entries.push(await this.makeOne(f));
    return { entries, note: f.count > 1 ? `${f.count} items from the Workshop` : "" };
  }
}

export function registerWorkshop(api) {
  const hub = T();
  if (!hub?.registerTab) return;
  const ws = new CuriosWorkshop(api);
  api.workshop = ws;
  hub.registerTab({
    module: MOD, name: "workshop", title: "Curios", icon: "fas fa-scroll", order: 45,
    prepare: async () => { await api.loaded; await ws.prepare(); },
    content: () => ws.content(),
    wire: (section) => ws.wire(section),
    generate: async (form, ctx) => { await api.loaded; return ws.generate(form, ctx); },
    generateTitle: () => "Curios",
  });
}
