/**
 * Axecleft's Curios — master items: multi-spell scrolls, multi-power stones and spellbooks.
 *
 * A master item holds its contents (full item data for each scroll or spell) in its own flags, with a
 * "used" mark per entry, so it needs no compendium entry for each spell and a partly used scroll stays
 * partly used when it is traded. When a master is added to an actor, Curios creates the unused contents
 * as separate items marked with D35E's link fields (system.linkSourceId = the master's system.linkId), so
 * D35E's own delete removes them with the master.
 *
 * Hand-made masters that use D35E's Links tab (system.linkedItems, e.g. the user's Spell Book) keep
 * working: D35E creates their linked items from the compendium as before, and Curios then copies them into
 * the master's flags and empties the links, so from then on the item behaves like a Curios master.
 *
 * flags.axeclefts-curios on a master: { master: "scroll" | "powerstone" | "book" | "psicrown", contents: [{ key, name, data, used }],
 *   book?: { cls, pages, capacity }, crown?: { ml, pp, recharge } }
 * Psicrowns (1.14.8, curios-psionic.js): the contents are the crown's powers; each child's charges are linked to the crown
 * (system.linkedChargeItem), so manifesting spends the crown's power points, and none is ever marked used.
 * flags.axeclefts-curios on a child: { child: { master: <master item id>, key, kind } }
 */
import * as D from "./curios-d35e.js";

const { MOD, normName } = D;
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const { gp, t } = D;
const ordinal = (n) => (n === 0 ? t("0-level") : t("{level}-level", { level: D.ord(n) }));
const IMG = {
  scroll: "systems/D35E/icons/items/magic/generated/scroll.png",
  powerstone: "systems/D35E/icons/items/magic/generated/crystal.png",
  book: "icons/sundries/books/book-reye-reptile-brown.webp",
};
const SKIP_HOOK = "curiosInternal"; // option on Curios' own creates and updates, so its hooks don't react to them

/* ---------- building masters ---------- */

/** SRD spellbook pages: a spell takes pages equal to its level, 0-level spells 1 page. 100 pages; 15 gp blank. */
export const pagesFor = (level) => Math.max(1, Number(level) || 0);

/** The description shown on a master: its contents and which are used. */
export function masterDescription(kind, contents, extra = "") {
  const li = contents.map((c) => {
    const f = c.data?.flags?.[MOD] ?? {};
    const lvl = Number.isFinite(f.level) ? `${ordinal(f.level)}` : "";
    const cl = f.cl ? `, ${t(kind === "powerstone" ? "ML {n}" : "CL {n}", { n: f.cl })}` : "";
    return `<li>${c.used ? "<s>" : ""}${esc(f.spellShown ?? f.spell ?? c.name)}${lvl || cl ? ` <small>(${esc(lvl)}${esc(cl)})</small>` : ""}${c.used ? `</s> <small>(${esc(t("used"))})</small>` : ""}</li>`;
  }).join("");
  const head = kind === "book" ? `<p>${t("<strong>Spellbook.</strong> Its spells are added to the owner's spells while the book is carried.")}</p>`
    : `<p>${kind === "powerstone" ? t("<strong>Power stone with {n} powers.</strong> While carried, each one is a separate power stone in the inventory; once used it is gone.", { n: contents.length }) : t("<strong>Scroll with {n} spells.</strong> While carried, each one is a separate scroll in the inventory; once used it is gone.", { n: contents.length })}</p>`;
  return `${head}<ol>${li}</ol>${extra}`;
}

/** A master scroll's or power stone's name (a pattern translated in lang/<code>.json). */
const MASTER_NAME = /*t*/"{kind} of {spells:and}";
const MASTER_WORDS = [/*t*/"Power Stone", /*t*/"Arcane Scroll", /*t*/"Divine Scroll"]; // eslint-disable-line no-unused-vars

/**
 * Make a master scroll or power stone from consumable data ([{ data, name, price }] from CuriosSpells.make()).
 */
export function makeMaster(kind, made, { unidentified = false, name = null, label = null } = {}) {
  const contents = made.map((m, i) => ({ key: `c${i + 1}`, name: m.name, data: m.data, used: false }));
  const spells = made.map((m) => m.data.flags?.[MOD]?.spellShown ?? m.data.flags?.[MOD]?.spell ?? m.name);
  const spellsEn = made.map((m) => m.data.flags?.[MOD]?.spell ?? m.name);
  const kindEn = label ?? (kind === "powerstone" ? "Power Stone" : "Scroll");
  // "Scroll of A, B, C and 2 more" (Axecleft's Tools 8.3 grammar: the pattern and the list words in the world's language)
  const list = (names, en) => (names.length > 3 ? [...names.slice(0, 3), en ? `${names.length - 3} more` : D.t("{n} more", { n: names.length - 3 })] : names);
  const title = name ?? D.N(MASTER_NAME, { kind: D.W(kindEn, D.t(kindEn)), spells: list(spells, false) });
  const titleEn = name ?? D.N(MASTER_NAME, { kind: kindEn, spells: list(spellsEn, true) }, { lang: "en" });
  const price = made.reduce((a, m) => a + (Number(m.price) || 0), 0);
  const data = D.masterBase({ name: title, img: IMG[kind], price, description: masterDescription(kind, contents) });
  foundry.utils.setProperty(data, `flags.${MOD}`, { master: kind, contents });
  if (!name) foundry.utils.setProperty(data, "flags.world.axecleftEn", titleEn); // its English identity (Axecleft's Tools 8)
  if (unidentified) D.setUnidentified(data, kind === "powerstone" ? "Crystal" : "Scroll");
  return data;
}

/**
 * Make a spellbook from spell item data. spells: [{ data, name, level }]. cls: the class whose spellbook takes them ("Wizard").
 * Value (house rule, from the SRD costs): 15 gp blank + 100 gp per page written.
 */
export function makeBook(spells, { cls = "Wizard", name = null, capacity = 100 } = {}) {
  const contents = spells.map((s, i) => {
    const data = foundry.utils.deepClone(s.data);
    foundry.utils.setProperty(data, `flags.${MOD}.spell`, s.name); // English (Babele worlds)
    foundry.utils.setProperty(data, `flags.${MOD}.spellShown`, s.shown ?? s.name); // as this world names it
    foundry.utils.setProperty(data, `flags.${MOD}.level`, s.level);
    return { key: `s${i + 1}`, name: s.shown ?? s.name, data, used: false };
  });
  const pages = spells.reduce((a, s) => a + pagesFor(s.level), 0);
  if (pages > capacity) throw new Error(t("These spells need {pages} pages; a spellbook has {capacity}.", { pages, capacity }));
  const price = 15 + pages * 100;
  const data = D.masterBase({ name: name ?? t(spells.length === 1 ? "Spellbook ({class}, {n} spell)" : "Spellbook ({class}, {n} spells)", { class: cls, n: spells.length }), img: IMG.book, price, weight: 3,
    description: masterDescription("book", contents, `<p><small>${t("{pages} of {capacity} pages. Value: 15 gp blank + 100 gp per page ({gp}).", { pages, capacity, gp: gp(price) })}</small></p>`) });
  foundry.utils.setProperty(data, `flags.${MOD}`, { master: "book", contents, book: { cls, pages, capacity } });
  return data;
}

/* ---------- hooks ---------- */

const isMaster = (item) => !!item?.flags?.[MOD]?.master;
const childOf = (item) => item?.flags?.[MOD]?.child ?? null;

/** Create the unused contents of a master on its actor. */
export async function spawnChildren(master) {
  const actor = master.actor;
  const f = master.flags[MOD];
  const linkId = foundry.utils.randomID(16);
  await master.update({ "system.linkId": linkId }, { [SKIP_HOOK]: true, stopUpdates: true });
  const book = f.master === "book" ? D.spellbookFor(actor, f.book?.cls) : null;
  if (f.master === "book" && !book) ui.notifications.warn(t("{actor} has no {class} spellbook, so {item}'s spells go in the primary spellbook.", { actor: actor.name, class: f.book?.cls ?? t("matching"), item: master.name }));
  const create = (f.contents ?? []).filter((c) => !c.used && c.data).map((c) => {
    const d = foundry.utils.deepClone(c.data);
    delete d._id;
    d.system ??= {};
    Object.assign(d.system, { linkSourceId: linkId, linkSourceName: master.name, linkImported: true });
    if (f.master === "psicrown") {
      // The crown's powers: their charges are the crown's power points (D35E linked charges)
      d.system.quantity = 1;
      d.system.identified = master.system?.identified !== false;
      d.system.linkedChargeItem = { id: master.id, name: master.name, img: master.img };
      // Shown as the crown's points (D35E's inventory reads the item's own uses to grey it out); D35E spends the crown's
      d.system.uses = { ...(d.system.uses ?? {}), value: Number(master.system?.uses?.value) || 0, max: Number(master.system?.uses?.max) || 0 };
      if (!d.system.identified) foundry.utils.setProperty(d, "system.unidentified.name", "Psicrown power");
    } else if (f.master === "book") {
      d.system.spellbook = book ?? "primary";
      foundry.utils.setProperty(d, "system.preparation.preparedAmount", 0); // known spells, not free castings
    } else {
      d.system.quantity = 1;
      d.system.identified = master.system?.identified !== false;
    }
    foundry.utils.setProperty(d, `flags.${MOD}.child`, { master: master.id, key: c.key, kind: f.master });
    return d;
  });
  if (create.length) await actor.createEmbeddedDocuments("Item", create, { [SKIP_HOOK]: true });
}

/** A hand-made master with D35E links: copy the items D35E just created into Curios' flags. */
async function adoptD35eLinks(master) {
  const actor = master.actor;
  const linkId = master.system?.linkId;
  if (!linkId) return;
  const kids = actor.items.filter((i) => i.system?.linkSourceId === linkId);
  // Only scrolls, power stones and spellbooks: other linked items (class features, metamagic rods' feats…) are D35E's business
  if (master.type !== "equipment" || !kids.length) return;
  const fits = kids.every((k) => k.type === "spell") || kids.every((k) => k.type === "consumable" && ["scroll", "powerstone"].includes(k.system?.consumableType));
  if (!fits) return;
  const isBook = kids.every((k) => k.type === "spell");
  const kind = isBook ? "book" : kids.some((k) => k.system?.consumableType === "powerstone") ? "powerstone" : "scroll";
  const contents = kids.map((k, i) => {
    const data = k.toObject();
    delete data._id;
    foundry.utils.setProperty(data, `flags.${MOD}.spell`, k.name);
    if (isBook) foundry.utils.setProperty(data, `flags.${MOD}.level`, Number(k.system?.level) || 0);
    return { key: `l${i + 1}`, name: k.name, data, used: !isBook && D.usesLeft(k) <= 0 };
  });
  const cls = isBook ? (D.spellbooksOf(actor).find((b) => b.key === kids[0].system?.spellbook)?.cls || "Wizard") : null;
  await master.update({
    "system.linkedItems": [],
    [`flags.${MOD}`]: { master: kind, contents, ...(isBook ? { book: { cls, pages: contents.reduce((a, c) => a + pagesFor(c.data.flags[MOD].level), 0), capacity: 100 } } : {}), adopted: true },
  }, { [SKIP_HOOK]: true, stopUpdates: true });
  await actor.updateEmbeddedDocuments("Item", kids.map((k, i) => ({ _id: k.id, [`flags.${MOD}.child`]: { master: master.id, key: contents[i].key, kind } })), { [SKIP_HOOK]: true, stopUpdates: true });
}

/** Mark a master's entry used (or removed) and refresh its description. */
async function markUsed(actor, child) {
  const c = childOf(child);
  const master = actor?.items?.get(c?.master);
  if (!master || !isMaster(master)) return;
  const f = foundry.utils.deepClone(master.flags[MOD]);
  const entry = f.contents?.find((x) => x.key === c.key);
  if (!entry || entry.used) return;
  entry.used = true;
  const extra = f.master === "book" ? `<p><small>${t("{pages} of {capacity} pages.", { pages: f.book?.pages ?? 0, capacity: f.book?.capacity ?? 100 })}</small></p>` : "";
  await master.update({ [`flags.${MOD}.contents`]: f.contents, "system.description.value": masterDescription(f.master, f.contents, extra) }, { [SKIP_HOOK]: true, stopUpdates: true });
  if (f.master !== "book" && f.contents.every((x) => x.used)) ui.notifications.info(t(f.master === "powerstone" ? "{item}: every power has been used." : "{item}: every spell has been used.", { item: master.name }));
}

/** Is this user the one who should act for a change made by userId on this actor? */
const mine = (userId) => userId === game.user.id;

export function registerLinkHooks(api) {
  // A master arrives on an actor: create its contents (or adopt D35E's links)
  Hooks.on("createItem", async (item, options, userId) => {
    if (!mine(userId) || options?.[SKIP_HOOK] || !item.actor) return;
    try {
      if (isMaster(item)) await spawnChildren(item);
      else if ((item.system?.linkedItems?.length ?? 0) > 0 && item.system?.linkId && api.setting("adoptLinks")) await adoptD35eLinks(item);
    } catch (err) { console.error(`${MOD} | could not set up ${item.name}`, err); ui.notifications.error(`Curios: could not set up ${item.name}: ${err.message}`); }
  });

  // A child arriving on its own (traded, dragged, sold): it becomes an ordinary item
  Hooks.on("preCreateItem", (item, data, options) => {
    if (options?.[SKIP_HOOK] || !childOf(data)) return;
    item.updateSource({ [`flags.${MOD}.-=child`]: null, "system.linkSourceId": "", "system.linkSourceName": "", "system.linkImported": false });
  });

  // A scroll or stone used up: mark it used on the master so it doesn't come back
  Hooks.on("updateItem", async (item, changes, options, userId) => {
    if (!mine(userId) || options?.[SKIP_HOOK] || !childOf(item) || !item.actor) return;
    if (childOf(item).kind === "book" || childOf(item).kind === "psicrown") return; // a crown's powers spend the crown's points
    if (D.usesLeft(item) <= 0) await markUsed(item.actor, item);
  });

  // A child removed on its own (used and deleted, torn out, traded away) is gone from the master too.
  // When the master itself is deleted, D35E deletes its children in the same call, and the master is already gone here.
  Hooks.on("deleteItem", async (item, options, userId) => {
    if (!mine(userId) || options?.[SKIP_HOOK] || !childOf(item) || !item.actor) return;
    if (childOf(item).kind === "psicrown") return; // removed by hand: it comes back with the crown
    await markUsed(item.actor, item);
  });

  // Optional rule: prepared casters (Wizard by default) may only prepare spells from spellbooks they carry
  Hooks.on("preUpdateItem", (item, changes) => {
    if (item.type !== "spell" || !item.actor || !api.setting("bookRestriction")) return;
    const next = foundry.utils.getProperty(changes, "system.preparation.preparedAmount");
    if (next === undefined || Number(next) <= D.preparedAmount(item.system)) return;
    const book = item.actor.system?.attributes?.spells?.spellbooks?.[item.system?.spellbook];
    const classes = String(api.setting("bookClasses") ?? "Wizard").split(",").map((s) => normName(s)).filter(Boolean);
    if (!book || !classes.some((c) => normName(D.classEn(book.class)).includes(c) || normName(book.class).includes(c) || normName(book.name).includes(c))) return;
    if (normName(D.enName(item)) === "read magic" || normName(item.name) === "read magic") return; // SRD: a wizard can prepare read magic without a spellbook
    const fromBook = childOf(item)?.kind === "book" || item.actor.items.some((i) => childOf(i)?.kind === "book" && normName(i.name) === normName(item.name));
    if (fromBook) return;
    const msg = t("{spell} isn't in a spellbook {actor} carries, so it can't be prepared (Curios: spellbook rule).", { spell: item.name, actor: item.actor.name });
    if (game.user.isGM) { ui.notifications.warn(`${msg} ${t("Allowed for the GM.")}`); return; }
    ui.notifications.warn(msg);
    return false;
  });
}

export const LINK_OPTIONS = { SKIP_HOOK };
