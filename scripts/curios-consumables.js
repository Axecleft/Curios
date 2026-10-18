/**
 * Axecleft's Curios — spell and power consumables made on demand.
 *
 * Potions, scrolls and wands (and psionic tattoos, power stones and dorjes) are never stored: each is made
 * from a spell or power item in the GM's Spell or Power sources when it is rolled, bought or made.
 * Prices follow the SRD: base × spell level (0-level counts as ½) × caster level, plus costly material
 * components (once for scrolls and potions, ×50 for wands) and 5 gp per XP of an XP component.
 */
import * as D from "./curios-d35e.js";

const T = () => globalThis.AxecleftTreasure;
const { MOD, KINDS, normName } = D;

/**
 * SRD metamagic feats for spell items (1.14.7): each raises the spell's effective level, and so the item's price and minimum
 * caster level. Heighten raises the spell to a chosen level. Effective level 10th–19th (or caster level 21–30) makes an epic
 * item, allowed only while Epic items is on (SRD epic scrolls; potions and wands by the same rule, Axecleft house rule).
 */
/** Spell items' names: "Scroll of Empowered Fireball (CL 10)" (a pattern translated in lang/<code>.json; Axecleft's Tools 8.3 grammar). */
export const CONSUMABLE_NAME = /*t*/"{kind} of {metamagic} {spell}[ ({level})]";
const KIND_WORDS = [/*t*/"Potion", /*t*/"Oil", /*t*/"Scroll", /*t*/"Wand", /*t*/"Psionic tattoo", /*t*/"Power stone", /*t*/"Dorje"]; // eslint-disable-line no-unused-vars
export const METAMAGIC = {
  empower: { feat: /*t*/"Empower Spell", word: /*t*/"Empowered", adj: 2 },
  enlarge: { feat: /*t*/"Enlarge Spell", word: /*t*/"Enlarged", adj: 1 },
  extend: { feat: /*t*/"Extend Spell", word: /*t*/"Extended", adj: 1 },
  heighten: { feat: /*t*/"Heighten Spell", word: /*t*/"Heightened", adj: 0 },
  maximize: { feat: /*t*/"Maximize Spell", word: /*t*/"Maximized", adj: 3 },
  quicken: { feat: /*t*/"Quicken Spell", word: /*t*/"Quickened", adj: 4 },
  silent: { feat: /*t*/"Silent Spell", word: /*t*/"Silent", adj: 1 },
  still: { feat: /*t*/"Still Spell", word: /*t*/"Still", adj: 1 },
  widen: { feat: /*t*/"Widen Spell", word: /*t*/"Widened", adj: 3 },
};
/** "empowered" / "Empower Spell" / "max" → "empower" (or null). */
export function metamagicKey(word) {
  const w = normName(word).replace(/ spell$/, "");
  return Object.keys(METAMAGIC).find((k) => w === k || w.startsWith(k.slice(0, 4)) || normName(METAMAGIC[k].word) === w) ?? null;
}
/** Minimum caster level for an effective spell level: SRD 2 × level − 1; 10th and higher (epic) 11 + level. */
export const minClFor = (lv) => (lv > 9 ? 11 + lv : D.minCasterLevel(lv));
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const epicOn = () => T()?.rules?.()?.epic === true;

export class CuriosSpells {
  constructor(api) { this.api = api; this.cache = null; }

  /** Name index of spells and powers in the chosen sources: Map(normName -> [{ pack, id, name, entry, facts }]). */
  async index({ force = false } = {}) {
    if (this.cache && !force) return this.cache;
    const hub = T();
    const out = { spells: new Map(), powers: new Map() };
    // Keyed by English name (Babele worlds: the hub's index gives English names) and by the shown name, so a spell typed in French is found too
    const add = (map, x) => {
      const hit = { ...x, display: x.display ?? x.entry?.display ?? x.name, facts: D.spellFacts(x.entry) };
      for (const k of new Set([normName(x.name), normName(hit.display)])) (map.get(k) ?? map.set(k, []).get(k)).push(hit);
    };
    const prefer = this.api.setting("preferModules");
    const order = (list) => prefer ? [...list].sort((a, b) => Number(a.pack.startsWith("D35E.")) - Number(b.pack.startsWith("D35E."))) : list;
    for (const x of order(await (hub?.kindItems?.(`${MOD}.spells`, { force }) ?? []))) add(out.spells, x);
    for (const x of order(await (hub?.kindItems?.(`${MOD}.powers`, { force }) ?? []))) add(out.powers, x);
    // The same spell in several compendiums (1.14.9.19): their class lists are merged, so a copy that lists only some
    // classes (an eTools import lists the supplements' classes, not the Cleric's or the Wizard's) still has its SRD levels
    for (const map of [out.spells, out.powers]) {
      const groups = new Map(); // English name -> every copy
      for (const hits of map.values()) for (const h of hits) { const k = normName(h.name); const g = groups.get(k) ?? groups.set(k, new Set()).get(k); g.add(h); }
      for (const g of groups.values()) {
        if (g.size < 2) continue;
        const merged = new Map(); // class -> lowest level
        for (const h of g) for (const [c, l] of h.facts.classes) if (Number.isFinite(l) && (!merged.has(normName(c)) || l < merged.get(normName(c))[1])) merged.set(normName(c), [c, l]);
        const cls = [...merged.values()];
        for (const h of g) {
          if (cls.length === h.facts.classes.length) continue;
          const e = h.entry ?? {}, sys = e.system ?? {};
          h.facts = D.spellFacts({ ...e, system: { ...sys, learnedAt: { ...(sys.learnedAt ?? {}), class: cls } } });
        }
      }
    }
    this.cache = out;
    return out;
  }
  clear() { this.cache = null; }
  /** A spell or power's name as this world shows it (French in a Babele world), from its English name; the name itself if unknown (needs index() first). */
  shownName(name) {
    const k = normName(name);
    const h = this.cache?.spells.get(k)?.[0] ?? this.cache?.powers.get(k)?.[0];
    return h?.display ?? name;
  }

  /**
   * A spell or power's name as your sources spell it, or null (needs index() first). Understands the SRD's word order:
   * "greater magic fang" → "Magic Fang, Greater", "psionic suggestion" → "Suggestion, Psionic", "mass enlarge person".
   */
  resolveName(text) {
    if (!this.cache) return null;
    const k = normName(text);
    const get = (key) => this.cache.spells.get(key)?.[0]?.name ?? this.cache.powers.get(key)?.[0]?.name ?? null;
    const m = k.match(/^(greater|lesser|mass|psionic|improved|superior)\s+(.+)$/);
    return get(k) ?? (m ? get(`${m[2]} ${m[1]}`) : null) ?? get(k.replace(/\s*\(.*\)$/, ""));
  }

  /** Find a spell (or power) by name; tolerant of case, apostrophes and "Cure light wounds" vs "Cure Light Wounds". */
  async find(name, { power = false } = {}) {
    const idx = await this.index();
    const map = power ? idx.powers : idx.spells;
    const n = normName(name);
    return map.get(n)?.[0] ?? map.get(n.replace(/\s*\(.*\)$/, ""))?.[0] ?? null;
  }

  /**
   * SRD: an item's caster level is never lower than the minimum needed to cast its required spells (and never higher than
   * the creator's own). groups: [["gate"], ["flame blade", "fireball"]] (one spell of each group) → { cl, spell } or null.
   */
  async minClOfGroups(groups) {
    let best = null;
    for (const g of groups ?? []) {
      let low = null;
      for (const name of g) {
        const hit = (await this.find(name)) ?? (await this.find(name, { power: true }));
        const cl = hit ? D.spellMinCl(hit.facts) : null;
        if (cl != null && (low == null || cl < low.cl)) low = { cl, spell: hit.name };
      }
      if (low && (!best || low.cl > best.cl)) best = low;
    }
    return best;
  }

  /** Every spell or power of a level for a list ("arcane" | "divine" | "psionic"): [{ name, pack, id, facts }]. */
  async ofLevel(level, list) {
    const idx = await this.index();
    const src = list === "psionic" ? idx.powers : idx.spells;
    const out = [];
    const seen = new Set();
    for (const [, hits] of src) {
      const h = hits[0];
      if (seen.has(h)) continue; // listed under its English and its shown name
      seen.add(h);
      const lv = list === "arcane" ? h.facts.arcane : list === "divine" ? h.facts.divine : h.facts.psionic;
      if (lv === level) out.push(h);
    }
    return out;
  }

  /** Spells on a class's list (D35E learnedAt), by level: Map(level -> [hit]). "Wizard" also matches "Sorcerer/Wizard". */
  async forClass(cls) {
    const idx = await this.index();
    const want = normName(D.classEn(cls)); // "Magicien" counts as Wizard (Babele)
    const out = new Map();
    const seen = new Set();
    for (const [, hits] of idx.spells) {
      const h = hits[0];
      if (seen.has(h)) continue;
      seen.add(h);
      const lv = h.facts.classes.find(([c]) => normName(c) === want)?.[1];
      if (lv === undefined || !Number.isFinite(lv)) continue;
      (out.get(lv) ?? out.set(lv, []).get(lv)).push(h);
    }
    return out;
  }

  /** The highest potion/tattoo level allowed: SRD 3rd; the GM may raise it to 9th (never for players' crafting). */
  /** The highest wand/dorje level allowed: SRD 4th; the GM may raise it to 9th (never for players' crafting). */
  wandCap({ gm = true } = {}) {
    const v = Number(this.api.setting("wandLevel")) || 4;
    return gm ? Math.min(9, Math.max(4, v)) : 4;
  }

  potionCap({ gm = true } = {}) {
    const v = Number(this.api.setting("potionLevel")) || 3;
    return gm ? Math.min(9, Math.max(3, v)) : 3;
  }

  /**
   * Check a spell for an item kind. Returns a list of problems (empty: allowed).
   * opts.gm: the GM's own choice (allows high-level potions up to the GM's setting).
   */
  problems(facts, kind, level, { gm = true } = {}) {
    const k = KINDS[kind], out = [];
    if (k.psionic !== facts.isPower) out.push(D.t(k.psionic ? "{name} is a spell, not a power." : "{name} is a power, not a spell.", { name: facts.name }));
    const capped = kind === "potion" || kind === "tattoo" || kind === "wand" || kind === "dorje";
    const cap = kind === "potion" || kind === "tattoo" ? this.potionCap({ gm }) : kind === "wand" || kind === "dorje" ? this.wandCap({ gm }) : kind === "scroll" && epicOn() ? 19 : k.maxLevel; // epic scrolls: 10th–19th (SRD)
    if (level > cap) out.push(D.t(facts.isPower ? "{kind}: {level}-level powers or lower" : "{kind}: {level}-level spells or lower", { kind: D.t(k.label), level: D.ord(cap) }) + (capped && gm ? ` ${D.t(kind === "wand" || kind === "dorje" ? "(the GM can raise the highest wand level on the Curios tab)" : "(the GM can raise the highest potion level on the Curios tab)")}` : "") + ".");
    if ((kind === "potion" || kind === "tattoo") && facts.personal) out.push(D.t("{name} has a range of personal, so it can't be a {kind} (SRD).", { name: facts.name, kind: D.t(k.label).toLowerCase() }));
    else if ((kind === "potion" || kind === "tattoo") && !facts.target) out.push(D.t("{name} affects an area or makes an effect instead of targeting a creature, so it can't be a {kind} (SRD).", { name: facts.name, kind: D.t(k.label).toLowerCase() }));
    return out;
  }

  /**
   * Make one consumable. spec: { name | hit, kind, cl?, list? ("arcane" | "divine"), gm?, unidentified?, force? }
   * Returns { data, name, price, level, cl, problems }.
   */
  async make(spec) {
    const kind = spec.kind;
    const k = KINDS[kind];
    if (!k) throw new Error(D.t("Unknown item kind \"{kind}\".", { kind }));
    const hit = spec.hit ?? await this.find(spec.name, { power: k.psionic });
    if (!hit) throw new Error(D.t(k.psionic ? "Power \"{name}\" is not in your Power sources." : "Spell \"{name}\" is not in your Spell sources.", { name: spec.name }));
    const f = hit.facts;
    // Which list: scrolls are arcane or divine; other spell items use the lowest level the spell has
    let list = spec.list ?? (kind === "scroll" ? (f.arcane !== null ? "arcane" : "divine") : null);
    if (list === "arcane" && f.arcane === null) list = "divine";
    if (list === "divine" && f.divine === null) list = f.arcane !== null ? "arcane" : null;
    const level = f.isPower ? f.psionic : list === "arcane" ? f.arcane : list === "divine" ? f.divine : f.level;
    if (level === null || level === undefined || !Number.isFinite(level)) throw new Error(D.t("{name} has no class level in its data.", { name: hit.display ?? hit.name }));
    // Metamagic (spells only): [{ key, to? }] — heighten takes "to", the level it raises the spell to
    const mm = (k.psionic ? [] : spec.metamagic ?? []).map((x) => (typeof x === "string" ? { key: metamagicKey(x) } : { ...x, key: metamagicKey(x.key) })).filter((x) => x.key);
    const heightTo = Math.max(level, ...mm.filter((x) => x.key === "heighten").map((x) => Number(x.to) || level));
    const effLevel = heightTo + mm.reduce((a, x) => a + METAMAGIC[x.key].adj, 0);
    const problems = this.problems(f, kind, effLevel, { gm: spec.gm !== false });
    const minCl = minClFor(effLevel);
    const cl = Math.max(minCl, Math.min(40, Number(spec.cl) || minCl));
    const epic = effLevel > 9 || cl > 20;
    if (epic && !epicOn()) problems.push(effLevel > 9 ? D.t("Effective spell level {n} (with metamagic) is above 9th: an epic item, and Epic items is off.", { n: effLevel }) : D.t("Caster level {n} is above 20th: an epic item, and Epic items is off.", { n: cl }));
    if (problems.length && !spec.force) throw new Error(problems.join(" "));
    const doc = await game.packs.get(hit.pack)?.getDocument(hit.id);
    if (!doc) throw new Error(D.t("Could not read {name} from {pack}.", { name: hit.display ?? hit.name, pack: hit.pack }));
    const spell = doc.toObject();
    // The converter works out save DCs from the level: a heightened spell keeps its higher level, other metamagic doesn't change DCs
    const data = await D.toConsumable(spell, kind, { cl, level: Math.min(9, heightTo), scrollType: kind === "scroll" ? list : "" });
    // SRD price, with components
    const comp = D.componentCosts(spell);
    const per = k.charges ? 50 : 1;
    const price = Math.max(0.5, effLevel) * cl * k.mult + (comp.gp + comp.xp * 5) * per;
    data.system.price = price;
    const words = mm.map((x) => (x.key === "heighten" ? `Heightened (${D.ordEn(heightTo)})` : METAMAGIC[x.key].word));
    // "Heightened" agrees like the other metamagic words; its level follows it ("Heightened (5th)", "intensifiée (niveau 5)")
    const heightened = () => {
      const w = D.W("Heightened", D.t("Heightened")), tail = D.t(" ({level})", { level: D.ord(heightTo), n: heightTo });
      if (typeof w === "string") return w + tail;
      return { ...w, text: w.text + tail, forms: w.forms ? Object.fromEntries(Object.entries(w.forms).map(([k, v]) => [k, v + tail])) : w.forms };
    };
    const wordsShown = mm.map((x) => (x.key === "heighten" ? heightened() : D.W(METAMAGIC[x.key].word, D.t(METAMAGIC[x.key].word))));
    // Oils: potions of spells cast on objects (bless weapon, magic vestment)
    const target = String(spell.system?.target?.value ?? spell.system?.target ?? "");
    // (the target text may be translated by Babele: French, Spanish and Portuguese words too)
    const oil = kind === "potion" && /\b(weapon|armor|shield|object|armes?|armures?|boucliers?|objets?|armas?|armaduras?|escudos?|objetos?)\b/iu.test(target)
      && !/\b(creature|you|créatures?|vous|criaturas?|tú|você)\b/iu.test(target);
    const kindEn = oil ? "Oil" : k.label;
    const showLevel = cl > minCl || mm.length;
    // The name in this world's language (the spell as Babele translates it, the language's word order); the English one stays in the flags for matching
    data.name = D.N(CONSUMABLE_NAME, { kind: D.W(kindEn, D.t(kindEn)), metamagic: wordsShown, spell: hit.display ?? hit.name, level: showLevel ? D.t(k.psionic ? "ML {n}" : "CL {n}", { n: cl }) : "" });
    if (mm.length) {
      const desc = data.system.description ??= {};
      desc.value = `<p><strong>${esc(mm.map((x) => D.t(METAMAGIC[x.key].feat)).join(", "))}:</strong> ${esc(D.t("{spell} as a {level}-level spell, caster level {cl}. Apply the metamagic when it is used.", { spell: hit.display ?? hit.name, level: D.ord(effLevel), cl }))}</p>${desc.value ?? ""}`;
    }
    if (epic) foundry.utils.setProperty(data, "system.epic", true);

    foundry.utils.setProperty(data, "flags.world.axecleftEn", D.N(CONSUMABLE_NAME, { kind: k.label, metamagic: words, spell: hit.name }, { lang: "en" })); // its English identity (Axecleft's Tools 8)
    foundry.utils.setProperty(data, `flags.${MOD}`, { kind, spell: hit.name, spellShown: hit.display ?? hit.name, level, effLevel, metamagic: mm, cl, epic, list: list ?? (f.isPower ? "psionic" : null), source: hit.pack });
    if (spec.unidentified) D.setUnidentified(data, k.unid);
    // base: the magic alone (what crafting halves and divides by 25); comp: component costs the item carries
    return { data, name: data.name, price, level, effLevel, metamagic: mm, epic, cl, problems, hit, minCl, list, base: Math.max(0.5, effLevel) * cl * k.mult, comp: { gp: comp.gp * per, xp: comp.xp * per } };
  }
}
