/**
 * Axecleft's Curios — intelligent items (SRD), built on D35E 3.1's own intelligent item support.
 * A copy of the Armory's armory-intelligent.js (same tables and rules), so Curios works without the Armory.
 *
 * Rolls D35E's "Intelligent Item Tables" (the SRD tables: alignment, mental scores and capabilities,
 * lesser powers, greater powers, special purpose, dedicated power) without posting table draws to chat,
 * attaches D35E's power items (spells and the Intelligent Item Powers compendium), fills system.intelligent,
 * and adds the SRD price of each feature to the item's base price. D35E works out the Ego itself.
 *
 * Every step can be fixed by a choice (the Forge) or left random.
 * roll() choice.effective: the item's total enhancement (bonus plus abilities), for the Ego.
 */
const MOD = "axeclefts-curios";
const T = () => globalThis.AxecleftTreasure;
const D = { enName: (x) => globalThis.AxecleftTools?.enName?.(x) ?? x?.name ?? "" };
const normName = (s) => String(s ?? "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']+/g, " ").trim();
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const d100 = () => 1 + Math.floor(Math.random() * 100);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
// Text in the world's language (Axecleft's Tools 8.2 language files), else the English
const t = (s, d) => globalThis.AxecleftTools?.t?.(s, d) ?? (d ? String(s).replace(/\{(\w+)\}/g, (m, k) => d[k] ?? m) : String(s));
const num = (n) => { const l = globalThis.AxecleftTools?.i18n?.lang; return Number(n).toLocaleString(l && l !== "en" ? l : "en-US"); };
const gp = (n) => t("{n} gp", { n: num(Math.round(n * 100) / 100) });
/** A result of D35E's Intelligent Item Tables in the world's language (D35E's tables are English; their lines are in the language file). */
const tx = (s) => t(String(s ?? ""));
/** An alignment's name in the world's language. */
const alignName = (a) => t(ALIGN_NAMES[a] ?? a);
const mod = (s) => Math.floor((Number(s) - 10) / 2);

export const ALIGN_NAMES = { lg: /*t*/"lawful good", ng: /*t*/"neutral good", cg: /*t*/"chaotic good", ln: /*t*/"lawful neutral", nn: /*t*/"neutral", cn: /*t*/"chaotic neutral", le: /*t*/"lawful evil", ne: /*t*/"neutral evil", ce: /*t*/"chaotic evil" };
const OPPOSED = { lg: "ce", ng: "ne", cg: "le", ln: "cn", cn: "ln", le: "cg", ne: "ng", ce: "lg" };
/** Abilities that fix one axis of the item's alignment. */
const ABILITY_AXIS = { holy: ["ge", "g"], unholy: ["ge", "e"], axiomatic: ["lc", "l"], anarchic: ["lc", "c"],
  "holy power": ["ge", "g"], "unholy power": ["ge", "e"], "axiomatic power": ["lc", "l"], "anarchic power": ["lc", "c"] }; // and their SRD epic versions
const PURPOSE_TEXT = {
  oppAlign: (ctx) => ctx.align === "nn" ? t("Defeat/slay creatures of extreme alignments (lawful good, chaotic good, lawful evil, chaotic evil)") : t("Defeat/slay {alignment} creatures (the opposed alignment)", { alignment: alignName(OPPOSED[ctx.align]) }),
  arcane: () => t("Defeat/slay arcane spellcasters (including spellcasting monsters and those that use spell-like abilities)"),
  divine: () => t("Defeat/slay divine spellcasters (including divine entities and servitors)"),
  noncaster: () => t("Defeat/slay nonspellcasters"),
  creatureType: (ctx) => t("Defeat/slay {foe}", { foe: ctx.foe("type") }),
  race: (ctx) => t("Defeat/slay {foe}", { foe: ctx.foe("race") }),
  defendRace: (ctx) => t("Defend {foe}", { foe: ctx.foe("race") }),
  slayDeityServants: () => t("Defeat/slay the servants of a specific deity (the GM chooses the deity)"),
  defendDeity: () => t("Defend the servants and interests of a specific deity (the GM chooses the deity)"),
  slayAll: () => t("Defeat/slay all (other than the item and the wielder)"),
  choose: () => t("A purpose of the GM's choice"),
};

/** Usage from a table result's text: "3/day", "at will", "continually". */
function usageOf(text) {
  // English, or a table translated with Babele (French, Spanish, Portuguese, German)
  const m = String(text ?? "").match(/(\d+)\s*(?:\/|par|por|pro)\s*(?:day|jour|d[ií]a|tag)/i);
  if (m) return { usage: "day", count: Number(m[1]) };
  if (/at will|à volonté|a voluntad|à vontade|nach belieben/i.test(text)) return { usage: "atwill", count: 0 };
  if (/continual|continuous|always active|once per month|continu|permanen|par mois|por mes|por mês/i.test(text)) return { usage: "atwill", count: 0 };
  return { usage: "day", count: 1 };
}

export class CuriosIntelligence {
  constructor(api) { this.api = api; this.tables = null; this.converter = undefined; }
  get data() { return this.api.data; }

  /** D35E's six tables, read once: { alignment, capabilities, lesser, greater, purpose, dedicated } -> [{ range, text, uuid, flags }]. */
  async loadTables() {
    if (this.tables) return this.tables;
    const cfg = globalThis.CONFIG?.D35E?.intelligentItemTables ?? {};
    const pack = game.packs.get(cfg.pack ?? "D35E.intelligent-item-tables");
    if (!pack) throw new Error(t("D35E's Intelligent Item Tables compendium isn't available."));
    const docs = await pack.getDocuments();
    const out = {};
    const NAME = { alignment: /alignment/i, capabilities: /capabilit|mental/i, lesser: /lesser/i, greater: /greater/i, purpose: /purpose/i, dedicated: /dedicated/i };
    for (const kind of Object.keys(NAME)) {
      const tbl = docs.find((d) => d.id === cfg[kind] || d._id === cfg[kind]) ?? docs.find((d) => NAME[kind].test(D.enName(d)) || NAME[kind].test(d.name)); // English name first (Babele)
      if (!tbl) continue;
      out[kind] = [...(tbl.results ?? [])].map((r) => ({
        range: r.range, text: r.description || r.text || r.name || "", uuid: r.documentUuid ?? null,
        flags: foundry.utils.getProperty(r, "flags.D35E") ?? r.flags?.D35E ?? {},
      })).sort((a, b) => a.range[0] - b.range[0]);
    }
    this.tables = out;
    return out;
  }
  rowFor(kind, r) { return (this.tables?.[kind] ?? []).find((x) => r >= x.range[0] && r <= x.range[1]) ?? null; }
  /** Choices for the Forge dropdowns: [{ value: index, label }]. */
  options(kind) {
    return (this.tables?.[kind] ?? []).map((x, i) => {
      const price = x.flags.priceGp ?? x.flags.priceModifierGp;
      return { value: String(i), label: `${tx(x.text).replace(/\s*\+[\d\s,.\u00a0\u202f]+\s*[^\s\d.]+\.?$/, "")}${price ? ` (+${gp(Number(price))})` : ""}` };
    });
  }

  /** D35E's converter for spell powers (falls back to a plain copy outside Foundry). */
  async spellPower(doc, usage, count) {
    if (this.converter === undefined) {
      try {
        const route = globalThis.foundry?.utils?.getRoute?.("systems/D35E/module/item/converters/intelligentItemPowerConverter.js") ?? "/systems/D35E/module/item/converters/intelligentItemPowerConverter.js";
        this.converter = (await import(route)).IntelligentItemPowerConverter ?? null;
      } catch (e) { this.converter = null; }
    }
    const raw = typeof doc.toObject === "function" ? doc.toObject() : foundry.utils.deepClone(doc);
    let p;
    if (this.converter) p = this.converter.toSpellPower(raw, usage);
    else {
      p = foundry.utils.deepClone(raw);
      p.type = "enhancement"; p._id = foundry.utils.randomID(); p.powerType = "spell";
      p.system = p.system ?? {}; p.system.isFromSpell = true; p.system.atWill = usage === "atwill";
      p.system.uses = usage === "atwill" ? { per: "", max: 0, value: 0 } : { per: "day", max: 1, value: 1 };
      delete p.system.spellbook; delete p.system.preparation;
    }
    if (usage === "day" && count > 0) { p.system.uses = { ...(p.system.uses ?? {}), per: "day", max: count, value: count }; }
    return p;
  }
  /** One power from a table row, as D35E stores it in system.intelligent.powers. */
  async power(row, tier) {
    const base = { tier, powerTier: tier, label: tx(row.text).slice(0, 120), text: tx(row.text), egoPoints: row.flags.egoPoints ?? (tier === "greater" ? 2 : tier === "lesser" ? 1 : 0), priceModifierGp: row.flags.priceModifierGp ?? 0 };
    if (row.uuid) {
      try {
        const doc = await fromUuid(row.uuid);
        if (doc) {
          if (/D35E\.spells/.test(row.uuid)) { const { usage, count } = usageOf(row.text); return Object.assign(await this.spellPower(doc, usage, count), base, { name: doc.name }); }
          const p = typeof doc.toObject === "function" ? doc.toObject() : foundry.utils.deepClone(doc);
          p._id = foundry.utils.randomID();
          return Object.assign(p, base, { name: p.name ?? base.label });
        }
      } catch (e) { console.warn(`${MOD} | intelligent item power ${row.uuid} not found`, e); }
    }
    return { _id: foundry.utils.randomID(), name: base.label, ...base };
  }

  /** Alignment axes the item's abilities require (holy: good, unholy: evil, axiomatic: lawful, anarchic: chaotic). */
  axes(abilities = []) {
    const need = {};
    for (const a of abilities) { const ax = ABILITY_AXIS[normName(a.name ?? a.title ?? a)]; if (ax) need[ax[0]] = ax[1]; }
    return need;
  }
  fits(align, need) { return (!need.lc || align[0] === need.lc) && (!need.ge || align[1] === need.ge); }

  /**
   * Roll (or take) every feature. choice = { alignment?: "lg", capabilities?: index, lesser?: [index|null], greater?: [index|null],
   * purpose?: "none" | "random" | index, dedicated?: index | null, abilities, bonus }.
   * Returns { intelligent, price, ego, lines, summary }.
   */
  async roll(choice = {}) {
    const tbl = await this.loadTables();
    const need = this.axes(choice.abilities ?? []);
    // Alignment: a fixed one (the creator's, or the GM's choice), or rolled until it suits holy/unholy/axiomatic/anarchic
    let align = choice.alignment ?? null;
    for (let i = 0; !align && i < 60; i++) { const r = this.rowFor("alignment", d100()); if (r && this.fits(r.flags.alignment, need)) align = r.flags.alignment; }
    align ??= `${need.lc ?? "n"}${need.ge ?? "n"}`;
    // Mental scores and capabilities
    const capRow = choice.capabilities != null && choice.capabilities !== "" ? tbl.capabilities[Number(choice.capabilities)] : this.rowFor("capabilities", d100());
    const c = capRow.flags;
    const high = Number(c.int ?? 12), low = 10, lowAt = pick(["int", "wis", "cha"]);
    const scores = { int: lowAt === "int" ? low : high, wis: lowAt === "wis" ? low : high, cha: lowAt === "cha" ? low : high };
    // Powers: chosen ones first, the rest rolled; no duplicates
    const rollPowers = async (tier, n, fixed = []) => {
      const out = [], seen = new Set();
      for (let i = 0; i < n; i++) {
        let row = fixed[i] != null && fixed[i] !== "" ? tbl[tier][Number(fixed[i])] : null;
        for (let k = 0; !row && k < 60; k++) { const r = this.rowFor(tier, d100()); if (r && !seen.has(r.text)) row = r; }
        if (!row || seen.has(row.text)) continue;
        seen.add(row.text);
        out.push({ row, power: await this.power(row, tier) });
      }
      return out;
    };
    const lesser = await rollPowers("lesser", Number(c.lesser) || 0, choice.lesser ?? []);
    const greater = await rollPowers("greater", Number(c.greater) || 0, choice.greater ?? []);
    // Special purpose and dedicated power
    let purposeRow = null, dedicated = null;
    const pc = choice.purpose ?? "rule";
    const wantPurpose = pc === "none" ? false : pc === "rule" ? this.purposeByRule(greater.length) : true;
    if (wantPurpose) {
      purposeRow = /^\d+$/.test(String(pc)) ? tbl.purpose[Number(pc)] : this.rowFor("purpose", d100());
      const dRow = choice.dedicated != null && choice.dedicated !== "" ? tbl.dedicated[Number(choice.dedicated)] : this.rowFor("dedicated", d100());
      if (dRow) dedicated = { row: dRow, power: await this.power(dRow, "dedicated") };
    }
    const foes = this.data.tables.baneFoes;
    const ctx = { align, foe: (k) => { const list = k === "race" ? foes.filter((f) => /humanoid|giant|elf|dwarf|orc|goblin/i.test(f.foe)) : foes; return pick(list.length ? list : foes).foe.toLowerCase(); } };
    const purposeText = purposeRow ? (PURPOSE_TEXT[purposeRow.flags.code] ?? (() => tx(purposeRow.text)))(ctx) : "";
    // Languages: Common plus one per point of Intelligence bonus
    const extra = Math.max(0, mod(scores.int));
    const languages = extra ? t("Common and {n} more (the GM's choice)", { n: extra }) : t("Common");
    const senses = [];
    if (c.vision) senses.push(t("{n} ft. vision and hearing", { n: c.vision }));
    if (c.darkvision) senses.push(t("{n} ft. darkvision and hearing", { n: c.darkvision }));
    if (c.blindsense) senses.push(t("blindsense"));
    const powers = [...lesser, ...greater, ...(dedicated ? [dedicated] : [])].map((p) => p.power);
    const intelligent = {
      enabled: true, alignment: align, ...scores,
      empathy: !!c.empathy, speech: !!c.speech, telepathy: !!c.telepathy, readLanguages: !!c.readLanguages, readMagic: !!c.readMagic,
      languages, visionRange: Number(c.vision) || 0, sensesText: senses.join("; "),
      senses: { lowLight: false, lowLightMultiplier: 2, blindsight: 0, darkvision: Number(c.darkvision) || 0, tremorsense: 0, truesight: 0 },
      powers, skills: [], hasSpecialPurpose: !!purposeRow, specialPurpose: purposeText, dedicatedPower: dedicated ? tx(dedicated.row.text) : "",
      personality: "", egoOverride: null,
    };
    const price = (Number(c.priceGp) || 0) + [...lesser, ...greater].reduce((s, p) => s + (Number(p.row.flags.priceModifierGp) || 0), 0)
      + (dedicated ? Number(dedicated.row.flags.priceModifierGp) || 0 : 0);
    // Ego (SRD Item Ego table), shown for the GM; D35E keeps its own count on the sheet
    const ego = (Number(choice.effective ?? choice.bonus) || 0) + lesser.length + 2 * greater.length + (purposeRow ? 4 : 0)
      + (c.telepathy ? 1 : 0) + (c.readLanguages ? 1 : 0) + (c.readMagic ? 1 : 0) + ["int", "wis", "cha"].reduce((s, k) => s + Math.max(0, mod(scores[k])), 0);
    const lines = [
      t("Alignment {alignment}; Int {int}, Wis {wis}, Cha {cha}; Ego {ego}", { alignment: alignName(align), int: scores.int, wis: scores.wis, cha: scores.cha, ego }),
      t("Communication: {ways}; speaks {languages}", { ways: [c.empathy ? t("empathy") : "", c.speech ? t("speech") : "", c.telepathy ? t("telepathy") : "", c.readLanguages ? t("reads languages") : "", c.readMagic ? t("reads magic") : ""].filter(Boolean).join(", "), languages }),
      t("Senses: {senses}", { senses: senses.join("; ") }),
      ...lesser.map((p) => t("Lesser power: {power}", { power: tx(p.row.text) })), ...greater.map((p) => t("Greater power: {power}", { power: tx(p.row.text) })),
      ...(purposeRow ? [t("Special purpose: {purpose}", { purpose: purposeText }), t("Dedicated power: {power}", { power: dedicated ? tx(dedicated.row.text) : "—" })] : []),
    ];
    return { intelligent, price, ego, lines, summary: t("intelligent ({alignment}, Ego {ego})", { alignment: alignName(align), ego }) };
  }

  /** Does an intelligent item get a special purpose? Generation settings: always with greater powers, plus a % of others. */
  purposeByRule(greaterCount) {
    const p = T()?.generation?.()?.intelligence?.purpose ?? this.data.generation?.intelligence?.purpose ?? { greater: true, chance: 0 };
    if (p.on === false) return false;
    if (greaterCount > 0 && p.greater !== false) return true;
    return Math.random() * 100 < (Number(p.chance) || 0);
  }

  /** Add an intelligence (from roll()) to Curios item data: the price, D35E's system.intelligent and the description. */
  applyToData(d, intel) {
    d.system.intelligent = intel.intelligent;
    d.system.price = Math.round(((Number(d.system.price) || 0) + intel.price) * 100) / 100;
    foundry.utils.setProperty(d, `flags.${MOD}.intelligence`, { price: intel.price, ego: intel.ego });
    const html = `<h3>${esc(t("Intelligent item"))}</h3><ul>${intel.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p><em>${esc(t("Intelligence adds {gp} to the price.", { gp: gp(intel.price) }))}</em></p>`;
    d.system.description ??= {};
    d.system.description.value = `${d.system.description.value ?? ""}${html}`;
    return d;
  }

  /** Add an intelligence (from roll()) to a built item: data, price (base price and market), description, summary. */
  apply(built, intel) {
    const d = built.data;
    d.system.intelligent = intel.intelligent;
    const qty = 1;
    built.price = Math.round((built.price + intel.price / qty) * 100) / 100;
    d.system.price = built.price;
    if (built.craft) built.craft.magicEach = Math.round((built.craft.magicEach + intel.price) * 100) / 100;
    const flags = d.flags?.[MOD];
    if (flags?.price) flags.price.push([t("intelligence ({summary})", { summary: intel.summary }), intel.price]);
    if (flags) flags.intelligence = { price: intel.price, ego: intel.ego };
    const html = `<h3>${esc(t("Intelligent item"))}</h3><ul>${intel.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p><em>${esc(t("Intelligence adds {gp} to the price.", { gp: gp(intel.price) }))}</em></p>`;
    const desc = d.system.description ?? {};
    const before = String(desc.value ?? "");
    desc.value = before.replace(/(<hr>)/, `${html}$1`);
    if (desc.value === before) desc.value += html; // no <hr>: at the end
    d.system.description = desc;
    built.summary = `${built.summary}; ${intel.summary}`;
    return built;
  }
}
