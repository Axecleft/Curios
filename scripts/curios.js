/**
 * Axecleft's Curios — 1.14.10.
 *
 * Potions, scrolls, wands, rings, rods, staffs and wondrous items for the D35E system, and the psionic
 * equivalents (psionic tattoos, power stones, dorjes, universal items, cognizance crystals and psicrowns). Supplies the shared Treasure and
 * Merchant Generators, adds the Curios tab (the Workshop) to the Treasure Generator, and runs master items:
 * multi-spell scrolls, multi-power stones and spellbooks.
 *
 * Macros:
 *   const C = game.modules.get("axeclefts-curios").api;
 *   await C.make({ name: "Fireball", kind: "wand", cl: 8 });            // { data, name, price, ... }
 *   await C.generate("magic:scroll", { grade: "medium" });             // [{ name, data, summary }]
 *   C.masterScroll([await C.make({ name: "Fly", kind: "scroll" }), await C.make({ name: "Haste", kind: "scroll" })]);
 *   C.crystal(7);                                                      // a cognizance crystal holding 7 power points
 *   await C.psicrown("Dominator");                                     // an SRD psicrown, its powers set up
 */
import * as D from "./curios-d35e.js";
import { CuriosSpells } from "./curios-consumables.js";
import { CuriosGenerator, CATS } from "./curios-generate.js";
import { registerLinkHooks, makeMaster, makeBook, spawnChildren } from "./curios-links.js";
import { registerPsionicHooks, makeCrystal, makeCrown, crownRow, customCrown } from "./curios-psionic.js";
import { registerPearlHooks, PEARL_SETTINGS } from "./curios-pearls.js";
import { registerWorkshop } from "./curios-workshop.js";
import { registerCuriosCrafting } from "./curios-craft.js";
import { CuriosIntelligence } from "./curios-intelligent.js";

const { MOD, normName } = D;
const T = globalThis.AxecleftTreasure;

const SETTINGS = {
  potionLevel: { name: /*t*/"Highest potion level (GM)", hint: /*t*/"SRD: potions and psionic tattoos hold 3rd-level spells or powers or lower. The GM may raise this to 9th for items made on the Curios tab. Random treasure follows the SRD tables. Players' crafting always stays at 3rd.", type: Number, default: 3, range: { min: 3, max: 9, step: 1 } },
  wandLevel: { name: /*t*/"Highest wand level (GM)", hint: /*t*/"SRD: wands and dorjes hold 4th-level spells or powers or lower. The GM may raise this to 9th for items made on the Curios tab. Random treasure follows the SRD tables. Players' crafting always stays at 4th.", type: Number, default: 4, range: { min: 4, max: 9, step: 1 } },
  psionicShare: { name: /*t*/"Psionic share of potions, scrolls, wands, staffs and wondrous items (%)", hint: /*t*/"House rule, while Psionics is on (Treasure Generator → Generation settings): this share of random potion, scroll and wand rolls become psionic tattoos, power stones and dorjes; of staff rolls, SRD psicrowns; of wondrous item rolls, cognizance crystals and psionic universal items. 0 = none.", type: Number, default: 10, range: { min: 0, max: 100, step: 5 } },
  ...PEARL_SETTINGS,
  psicrownSetup: { name: /*t*/"Set up psicrowns", hint: /*t*/"A psicrown added to a character from a compendium (D35E's Dominator, Evader…) gets its power points and its powers as separate items that spend the crown's points.", type: Boolean, default: true },
  preferModules: { name: /*t*/"Prefer module compendiums", hint: /*t*/"When a spell, power or item is in both D35E's compendiums and a module's (such as Axecleft's Shared Data), use the module's copy.", type: Boolean, default: true },
  adoptLinks: { name: /*t*/"Take over hand-made linked items", hint: /*t*/"A spellbook or scroll you linked by hand on D35E's Links tab: when it is added to a character, Curios keeps a copy of its contents so used scrolls stay used when it changes hands.", type: Boolean, default: true },
  bookRestriction: { name: /*t*/"Spellbook rule", hint: /*t*/"Optional: characters whose spellbook class is listed below can only prepare spells found in a spellbook item they carry (Read Magic is always allowed, as in the SRD). The GM is warned but not stopped.", type: Boolean, default: false },
  bookClasses: { name: /*t*/"Spellbook classes", hint: /*t*/"Classes the spellbook rule applies to, separated by commas.", type: String, default: "Wizard" },
};

const api = {
  MOD, data: null, ready: false, loaded: null, spells: null, generator: null, D,
  setting(k) { try { return game.settings.get(MOD, k); } catch (e) { return SETTINGS[k]?.default; } },
  async setSetting(k, v) { try { await game.settings.set(MOD, k, v); } catch (e) { console.warn(`${MOD} | could not save ${k}`, e); } },
  isEpic(name) { return !!globalThis.AxecleftTreasure?.isEpicItem?.({ name }) || api._epic?.has(normName(name)); },
  isPsionic(name) { return !!globalThis.AxecleftTreasure?.isPsionicItem?.({ name }) || api._psionic?.has(normName(name)); },
  /** The SRD table row for a ring, rod, staff or wondrous item name (or null). */
  findRow(name) {
    const n = normName(name);
    for (const k of ["rings", "rods", "staffs", "wondrous"]) {
      const r = api.data?.tables?.[k]?.find((x) => normName(x.name) === n || normName(x.item) === n);
      if (r) return r;
    }
    return null;
  },
  async make(spec) { await api.loaded; return api.spells.make(spec); },
  async generate(category, opts = {}) { await api.loaded; return api.generator.generate(category, opts); },
  masterScroll: (made, opts) => makeMaster("scroll", made, opts),
  masterStone: (made, opts) => makeMaster("powerstone", made, opts),
  spellbook: (spells, opts) => makeBook(spells, opts),
  crystal: (pp, opts) => makeCrystal(pp, opts),
  async psicrown(name, opts = {}) {
    await api.loaded;
    const row = crownRow(api, name);
    if (!row) throw new Error(D.t("{name} is not an SRD psicrown ({list}).", { name, list: (api.data.tables.psicrowns ?? []).map((r) => r.name).join(", ") }));
    return (await makeCrown(api, row, opts)).data;
  },
  async customPsicrown(spec) { await api.loaded; return (await customCrown(api, spec)).data; },
  spawnChildren: (master) => spawnChildren(master),
};

if (T?.registerSourceKind) {
  T.registerSourceKind({
    module: MOD, key: "spells", label: /*t*/"Spells",
    hint: /*t*/"Spells that potions, scrolls, wands and spellbooks are made from. D35E's Spells compendium and any compendium of spells, such as Axecleft's Shared Data.",
    match: (label) => /\bspells?\b/i.test(label) && !/spell[- ]like|spell items|schools?|domains?/i.test(label),
    accept: (e) => e.type === "spell" && e.system?.isPower !== true,
    fields: ["system.level", "system.learnedAt", "system.isPower", "system.range.units", "system.school", "system.target"],
  });
  T.registerSourceKind({
    module: MOD, key: "powers", label: /*t*/"Psionic powers",
    hint: /*t*/"Powers that psionic tattoos, power stones and dorjes are made from. D35E's Powers compendium and any compendium of powers.",
    match: (label) => /\bpowers?\b/i.test(label) && !/intelligent/i.test(label),
    accept: (e) => e.type === "spell" && e.system?.isPower === true,
    fields: ["system.level", "system.learnedAt", "system.isPower", "system.range.units", "system.school", "system.target"],
  });
  T.registerProvider({
    module: MOD, name: "curios", label: "Axecleft's Curios", hints: false,
    categories: Object.keys(CATS),
    async roll({ category, grade, tags = [], merchant = false, epic = false, exclude = null }) {
      await api.loaded;
      if (!api.generator) throw new Error(D.t("curios.json did not load"));
      return api.generator.generate(category, { grade: grade ?? "minor", tags, unidentified: !merchant, epic, exclude });
    },
  });
  registerWorkshop(api);
} else {
  console.warn(`${MOD} | the Treasure Generator script version 9.5 or later is not loaded; Curios can't supply treasure or merchants.`);
}

globalThis.AxecleftMerchants?.registerMerchantType?.({
  module: MOD, key: "psionic", label: /*t*/"Psionic emporium", trade: "Crystals", nouns: ["Crystal", "Mind", "Eye", "Lotus", "Prism"], needs: "psionics", tags: ["psionic"],
  categories: { "magic:potion": 3, "magic:scroll": 3, "magic:wand": 2, "magic:wondrous": 2, "magic:staff": 1, "magic:weapon": 1, "magic:armor": 1 },
});

registerLinkHooks(api);
registerPsionicHooks(api); // cognizance crystals and psicrowns
registerPearlHooks(api); // pearls of power
registerCuriosCrafting(api); // the shared Crafting window: scrolls, potions, wands and the psionic ones

Hooks.once("init", () => {
  game.modules.get(MOD).api = api;
  for (const [k, def] of Object.entries(SETTINGS)) game.settings.register(MOD, k, { scope: "world", config: true, ...def });
  api.spells = new CuriosSpells(api);
  api.generator = new CuriosGenerator(api);
  // Intelligent items need D35E 3.1.0 or later (Foundry v11's D35E 2.4.3 has none)
  api.intelligence = globalThis.AxecleftTools?.intelligentItems?.() === false ? null : new CuriosIntelligence(api);
  api.loaded = foundry.utils.fetchJsonWithTimeout(`modules/${MOD}/data/curios.json`)
    .then((data) => {
      api.data = data;
      api._epic = new Set((data.epic ?? []).map(normName));
      api._psionic = new Set((data.psionic ?? []).map(normName));
      api.ready = true;
      const hub = globalThis.AxecleftTreasure;
      hub?.registerItemMarks?.({ module: MOD, epic: data.epic ?? [], psionic: data.psionic ?? [] });
      if (hub?.registerPriceCorrections) hub.registerPriceCorrections({ module: MOD, corrections: data.priceCorrections ?? [] });
      if (game.ready && game.user?.isGM) hub?.scanCompendiums?.();
      const t = data.tables;
      console.log(`${MOD} | curios.json loaded: ${t.potions.length} potion, ${t.wands.length} wand, ${t.rings.length} ring, ${t.rods.length} rod, ${t.staffs.length} staff and ${t.wondrous.length} wondrous rows; ${api._epic.size} epic and ${api._psionic.size} psionic items`);
      return data;
    })
    .catch((err) => console.error(`${MOD} | could not load data/curios.json`, err));
});

// Item sources changed: forget cached names
Hooks.on("updateSetting", (s) => { if (/axecleftItemSources$/.test(s.key ?? "")) { api.spells?.clear(); api.generator?.clear(); } });
