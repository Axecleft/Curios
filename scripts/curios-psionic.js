/**
 * Axecleft's Curios — cognizance crystals and psicrowns (SRD Psionic Items), 1.14.8.
 *
 * Cognizance crystal: a crystal that stores power points (an odd number, 1 to 17). Price ((PP + 1) ÷ 2)² × 1,000 gp;
 * aura psychokinesis, manifester level = its capacity; Craft Cognizance Crystal; 1 lb. Using it (the item's Use button)
 * opens a dialog:
 *   - Manifest with the crystal: one of the owner's powers, paid wholly from the crystal (SRD: a power can't draw points
 *     from more than one source, and the crystal can't refill the owner's own reserve). Curios lends the crystal's points
 *     to the power's spellbook for that one manifestation, so D35E's own dialog (augmenting included) works as usual,
 *     then puts the owner's reserve back and takes what was spent from the crystal.
 *   - Recharge: the owner's own power points go into the crystal, 1 for 1, up to its capacity.
 *
 * Psicrown: a headband holding power points (50 × its manifester level) and a fixed list of powers. It is a master item
 * (curios-links.js): on an actor, each power becomes its own item ("Dominator: Charm, Psionic"), a dorje-like consumable at
 * the crown's manifester level whose charges are the crown's power points (D35E's linked charges, system.linkedChargeItem),
 * at the power's cost (2 × level − 1). The crown has no recharge (the Psicrown of the Crystal Mind, an artifact, gains 1 a day:
 * its dialog has a button for that).
 * Using the crown itself opens a dialog: its points, its powers (to manifest), and spending extra points to augment.
 * Psicrowns from D35E's compendium ("Dominator", "Evader"…) or any item whose text says "This psicrown has N power points"
 * are set up the same way when they are made by Curios or added to an actor.
 */
import * as D from "./curios-d35e.js";

const { MOD, normName } = D;
const T = () => globalThis.AxecleftTreasure;
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const gp = (n) => `${Number(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US")} gp`;
const th = (n) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const plain = (html) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const SKIP_HOOK = "curiosInternal";
const IMG = {
  crystal: "systems/D35E/icons/items/magic/generated/crystal.png",
  crown: "systems/D35E/icons/items/magic/head/Helm_36.png",
};

/** SRD item aura strength by manifester level. */
export const auraStrength = (ml) => (ml <= 5 ? "Faint" : ml <= 11 ? "Moderate" : "Strong");
/** SRD power point cost of a power level (1st 1, 2nd 3, … 9th 17; 0-level in D35E data counts as 1st). */
export const powerCost = (level) => Math.max(1, 2 * (Number(level) || 0) - 1);
/** SRD cognizance crystal price. */
export const crystalPrice = (pp) => ((pp + 1) / 2) ** 2 * 1000;
export const CRYSTAL_SIZES = [1, 3, 5, 7, 9, 11, 13, 15, 17];

/* ------------------------------------------ */
/*  Cognizance crystals                       */
/* ------------------------------------------ */

export function crystalDescription(pp) {
  return `<p><strong>Cognizance crystal (${pp} power point${pp === 1 ? "" : "s"}).</strong> A cognizance crystal stores power points. Its owner must hold it or carry it for at least 10 minutes to attune to it.</p>
<p>A psionic character can manifest a power with the crystal's points instead of her own, but a single power can't draw points from more than one source (the crystal's points can pay for augmenting it too). She can't move the crystal's points into her own reserve. She can recharge the crystal by spending her own power points, 1 for 1, up to its capacity.</p>
<p><em>Axecleft's Curios:</em> use the crystal (its Use button) to manifest a power with its points or to recharge it.</p>
<p>${auraStrength(pp)} psychokinesis; ML ${th(pp)}; Craft Cognizance Crystal; Price ${gp(crystalPrice(pp))}; Weight 1 lb.</p>
<p><small>AC 7, 10 hit points, hardness 8, break DC 16.</small></p>`;
}

/** A cognizance crystal's item data. pp: 1, 3, 5 … 17; charged: start full (treasure) or empty. */
export function makeCrystal(pp, { unidentified = false, charged = true } = {}) {
  const n = CRYSTAL_SIZES.includes(Number(pp)) ? Number(pp) : 1;
  const data = D.masterBase({ name: `Cognizance Crystal (${n} PP)`, img: IMG.crystal, price: crystalPrice(n), weight: 1, description: crystalDescription(n) });
  Object.assign(data.system, {
    hardness: 8, hp: { max: 10, value: 10 },
    uses: { value: charged ? n : 0, max: n, per: "charges", maxFormula: String(n), autoDeductCharges: false, canBeLinked: false },
  });
  foundry.utils.setProperty(data, `flags.${MOD}.crystal`, { pp: n });
  if (unidentified) D.setUnidentified(data, "Crystal");
  return data;
}

export const isCrystal = (item) => !!item?.flags?.[MOD]?.crystal;

/* ------------------------------------------ */
/*  Psicrowns                                 */
/* ------------------------------------------ */

const bareCrownName = (name) => String(name ?? "").replace(/^psicrown\s*,\s*/i, "").replace(/^psicrown of the\s+/i, "").trim();
export const crownName = (name) => (/psicrown/i.test(name) ? name : `Psicrown, ${name}`);

/** The SRD psicrown row for an item name ("Dominator", "Psicrown, Dominator", "Psicrown of the Crystal Mind"), or null. */
export function crownRow(api, name) {
  const rows = api.data?.tables?.psicrowns ?? [];
  const n = normName(name), b = normName(bareCrownName(name));
  return rows.find((r) => normName(r.name) === n || normName(r.name) === b || normName(bareCrownName(r.name)) === b) ?? null;
}

/** Facts read from an item's own text: "This psicrown has 450 power points" … "ML 9th; Craft Psicrown, a, b, c; Price". */
export function crownFromText(html) {
  const t = plain(html);
  const pp = Number(t.match(/psicrown has ([\d,]+) power points/i)?.[1]?.replace(/,/g, ""));
  if (!pp) return null;
  const ml = Number(t.match(/\bML (\d+)/)?.[1]) || Math.round(pp / 50);
  const line = t.match(/Craft Psicrown\s*,([^;]+);/i)?.[1] ?? "";
  const powers = line.split(",").map((s) => s.trim()).filter(Boolean);
  return { pp, ml, powers };
}

/** Is this item data (or item) a psicrown that Curios hasn't set up yet? Returns { row?, pp, ml, powers } or null. */
export function crownFacts(api, data) {
  if (!data || data.type !== "equipment" || data.flags?.[MOD]?.master) return null;
  const row = crownRow(api, data.name);
  if (row) return { row, pp: row.pp, ml: row.ml, powers: row.powers };
  return crownFromText(data.system?.description?.value);
}

/** One power of a crown as a dorje-like consumable at the crown's manifester level, paid from the crown's points. */
async function crownPower(api, crown, power, ml) {
  const name = api.spells.resolveName(power) ?? power;
  const hit = await api.spells.find(name, { power: true });
  if (!hit) return null;
  const m = await api.spells.make({ hit, kind: "dorje", cl: ml, force: true, gm: true });
  const level = Number(hit.facts.psionic ?? hit.facts.level) || 0;
  const cost = powerCost(level);
  const d = m.data;
  d.name = `${bareCrownName(crown)}: ${hit.name}`;
  Object.assign(d.system, {
    price: 0, weight: 0, quantity: 1, identifiedName: d.name,
    uses: { ...(d.system.uses ?? {}), value: 0, max: 0, per: "charges", maxFormula: "", chargesPerUse: cost, autoDeductCharges: true },
  });
  const desc = d.system.description ??= {};
  desc.value = `<p><strong>Psicrown power.</strong> Manifested from ${esc(crown)}'s power points: ${cost} per use, at manifester level ${ml} (the wearer's own manifester level if it is higher: adjust the roll). Augmenting: spend the extra points from the psicrown (use the psicrown); the total can't exceed the wearer's manifester level. The psicrown must be worn.</p>${desc.value ?? ""}`;
  foundry.utils.setProperty(d, `flags.${MOD}.crownPower`, { level, cost, ml });
  return { key: `p${normName(hit.name).replace(/\s+/g, "-")}`, name: hit.name, data: d, used: false, cost, level };
}

/** The psicrown master block: its points and powers. */
export function crownDescription(name, crown, contents, missing = []) {
  const li = contents.map((c) => `<li>${esc(c.name)} <small>(${th(c.level || 1)}-level, ${c.cost} PP)</small></li>`).join("");
  return `<div class="curios-psicrown"><p><strong>Psicrown: ${crown.pp.toLocaleString("en-US")} power points, manifester level ${crown.ml}.</strong> While worn, each power below is its own item in the inventory; manifesting one spends the crown's points (standard action unless the power says otherwise). The wearer can't pay with her own points. ${crown.recharge ? `It recharges: ${esc(crown.recharge)}.` : "Once its points are spent, it is an ordinary headband."}</p>
<ol>${li}</ol>${missing.length ? `<p><small>Not in your Power sources: ${esc(missing.join(", "))}.</small></p>` : ""}
<p><small>Axecleft's Curios: use the psicrown (its Use button) to see its points, manifest its powers, or spend extra points to augment.</small></p></div>`;
}

/**
 * Turn item data into a psicrown master (in place). facts: { pp, ml, powers, row? }. Returns the data.
 * The crown's points are system.uses ({ value, max }); its powers are the master's contents.
 */
export async function setupCrown(api, data, facts, { unidentified = null } = {}) {
  await api.spells.index();
  const name = crownName(data.name);
  const contents = [], missing = [];
  for (const p of facts.powers ?? []) {
    try {
      const c = await crownPower(api, name, p, facts.ml);
      if (c) contents.push(c); else missing.push(p);
    } catch (err) { missing.push(p); console.warn(`${MOD} | psicrown power ${p}`, err); }
  }
  const crown = { ml: facts.ml, pp: facts.pp, recharge: facts.row?.recharge ?? null };
  data.name = name;
  data.system ??= {};
  data.system.identifiedName = name;
  if (!(Number(data.system.price) > 0) && facts.row?.price) data.system.price = facts.row.price;
  data.system.slot ||= "headband";
  data.system.uses = { value: facts.pp, max: facts.pp, per: "charges", maxFormula: String(facts.pp), autoDeductCharges: false, canBeLinked: true };
  data.system.linkedItems = [];
  const desc = data.system.description ??= {};
  desc.value = `${crownDescription(name, crown, contents, missing)}<hr>${(desc.value ?? "").replace(/<div class="curios-psicrown">[\s\S]*?<\/div><hr>/, "")}`;
  foundry.utils.setProperty(data, `flags.${MOD}.master`, "psicrown");
  foundry.utils.setProperty(data, `flags.${MOD}.contents`, contents.map(({ key, name: n, data: d, used }) => ({ key, name: n, data: d, used })));
  foundry.utils.setProperty(data, `flags.${MOD}.crown`, crown);
  if (unidentified) D.setUnidentified(data, "Headband");
  return data;
}

/** An SRD psicrown by table row: the compendium item when there is one (D35E names them "Dominator"…), else a plain headband. */
export async function makeCrown(api, row, { unidentified = false } = {}) {
  const got = await api.generator.fixedItem({ name: row.name, item: row.name, price: row.price }, { unidentified: false, raw: true });
  const data = got.data;
  if (/not in your compendiums/.test(got.note ?? "")) {
    data.system.slot = "headband";
    data.img = IMG.crown;
    data.system.description.value = `<p>${auraStrength(row.ml)} psionics; ML ${th(row.ml)}; Craft Psicrown, ${row.powers.join(", ")}; Price ${gp(row.price)}.</p>`;
  }
  await setupCrown(api, data, { pp: row.pp, ml: row.ml, powers: row.powers, row }, { unidentified });
  return { data, name: data.name, price: Number(data.system.price) || row.price, note: got.note, from: got.from };
}

/**
 * A custom psicrown (the GM's Workshop, crafting): any powers at a chosen manifester level (SRD: at least 8th, and no more
 * than 5 above the highest power's minimum). Price (Axecleft house rule, the SRD staff formula the SRD psicrowns come
 * close to): highest power level × ML × 375 gp, the next × 0.75, the rest × 0.5.
 */
export async function customCrown(api, { name = null, powers = [], ml = null }) {
  await api.spells.index();
  const hits = [];
  for (const p of powers) {
    const hit = await api.spells.find(api.spells.resolveName(p) ?? p, { power: true });
    if (!hit) throw new Error(`Power "${p}" is not in your Power sources.`);
    hits.push(hit);
  }
  if (!hits.length) throw new Error("A psicrown needs at least one power.");
  const levels = hits.map((h) => Math.max(1, Number(h.facts.psionic ?? h.facts.level) || 1)).sort((a, b) => b - a);
  const minMl = Math.max(8, D.minCasterLevel(levels[0]));
  const level = Math.max(minMl, Math.min(minMl + 5, Number(ml) || minMl));
  const price = levels.reduce((a, l, i) => a + l * level * 375 * (i === 0 ? 1 : i === 1 ? 0.75 : 0.5), 0);
  const title = name || `Psicrown of ${hits.map((h) => h.name).slice(0, 3).join(", ")}${hits.length > 3 ? "…" : ""}`;
  const data = D.masterBase({ name: title, img: IMG.crown, price, description: `<p>${auraStrength(level)} psionics; ML ${th(level)}; Craft Psicrown, ${hits.map((h) => h.name).join(", ")}; Price ${gp(price)}.</p><p><small>Custom psicrown: price by the SRD staff formula (Axecleft house rule).</small></p>` });
  data.system.slot = "headband";
  await setupCrown(api, data, { pp: 50 * level, ml: level, powers: hits.map((h) => h.name) });
  return { data, name: data.name, price, ml: level, minMl, powers: hits.map((h) => h.name) };
}

export const isCrown = (item) => item?.flags?.[MOD]?.master === "psicrown";

/* ------------------------------------------ */
/*  Random                                    */
/* ------------------------------------------ */

const d100 = () => 1 + Math.floor(Math.random() * 100);
const inGrade = (rows, grade, r) => rows.find((x) => x[grade] && r >= x[grade][0] && r <= x[grade][1]);

export async function rollCrystal(api, grade, { unidentified = true } = {}) {
  const row = inGrade(api.data.tables.cognizanceCrystals ?? [], grade, d100()) ?? inGrade(api.data.tables.cognizanceCrystals ?? [], "medium", d100());
  const data = makeCrystal(row?.pp ?? 1, { unidentified });
  return { name: data.name, data, summary: `Cognizance crystal, ${row?.pp ?? 1} PP, ${gp(data.system.price)} (SRD ${grade} table)` };
}

export async function rollCrown(api, grade, { unidentified = true, exclude = null } = {}) {
  const rows = (api.data.tables.psicrowns ?? []).filter((r) => !r.artifact);
  const g = grade === "major" ? "major" : "medium";
  let row = null;
  for (let guard = 0; guard < 6; guard++) {
    row = inGrade(rows, g, d100());
    if (row && !(exclude?.has?.(normName(crownName(row.name))) && guard < 4)) break;
  }
  if (!row) return { name: `${g} psicrown`, placeholder: true, summary: "nothing on the SRD psicrown table" };
  const got = await makeCrown(api, row, { unidentified });
  const n = got.data.flags[MOD].contents.length;
  return { name: got.name, data: got.data, summary: `Psicrown, ${row.pp} PP, ML ${row.ml}, ${n} power${n === 1 ? "" : "s"}, ${gp(got.price)} (SRD ${g} table)${n < row.powers.length ? `; ${row.powers.length - n} power(s) not in your Power sources` : ""}` };
}

/* ------------------------------------------ */
/*  Using them                                */
/* ------------------------------------------ */

const PP_PATH = (key) => `system.attributes.spells.spellbooks.${key}.powerPoints`;
const psiBooks = (actor) => D.spellbooksOf(actor).filter((b) => b.usePowerPoints);
const ownPowers = (actor) => (actor?.items ?? []).filter((i) => i.type === "spell" && actor.system?.attributes?.spells?.spellbooks?.[i.system?.spellbook]?.usePowerPoints)
  .sort((a, b) => (Number(a.system?.level) || 0) - (Number(b.system?.level) || 0) || a.name.localeCompare(b.name));
const DialogV2 = () => foundry.applications?.api?.DialogV2;

async function say(actor, html) {
  try { await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: html }); } catch (e) { /* no chat */ }
}

/** Manifest one of the owner's powers with the crystal's points (only the crystal's: SRD). */
export async function manifestWithCrystal(actor, crystal, power) {
  const key = power.system?.spellbook;
  const path = PP_PATH(key);
  if (!actor.system?.attributes?.spells?.spellbooks?.[key]?.usePowerPoints) return ui.notifications.warn(`${power.name} isn't in a spellbook that uses power points.`);
  const stored = Number(crystal.system?.uses?.value) || 0;
  const cost = Number(power.system?.powerPointsCost) || 1;
  if (stored < cost) return ui.notifications.warn(`${crystal.name} holds ${stored} power point${stored === 1 ? "" : "s"}; ${power.name} costs ${cost}.`);
  const own = Number(foundry.utils.getProperty(actor, path)) || 0;
  let after = stored;
  // Lend the crystal's points to the spellbook for this one manifestation; D35E's dialog then caps augmenting at the crystal's points
  await actor.update({ [path]: stored }, { [SKIP_HOOK]: true });
  try {
    await power.use({ ev: null, skipDialog: false });
  } catch (err) {
    console.error(`${MOD} | manifesting ${power.name} from ${crystal.name}`, err);
  } finally {
    after = Number(foundry.utils.getProperty(actor, path));
    if (!Number.isFinite(after)) after = stored;
    await actor.update({ [path]: own }, { [SKIP_HOOK]: true });
  }
  const spent = Math.max(0, Math.min(stored, stored - after));
  if (!spent) return ui.notifications.info(`${power.name} wasn't manifested; ${crystal.name} keeps its points.`);
  await crystal.update({ "system.uses.value": stored - spent }, { [SKIP_HOOK]: true });
  await say(actor, `<p><strong>${esc(actor.name)}</strong> manifests <strong>${esc(power.name)}</strong> with ${spent} power point${spent === 1 ? "" : "s"} from ${esc(crystal.name)} (${stored - spent} left).</p>`);
}

/** Recharge a crystal from the owner's own power points, 1 for 1. */
export async function rechargeCrystal(actor, crystal, bookKey, amount) {
  const path = PP_PATH(bookKey);
  const own = Number(foundry.utils.getProperty(actor, path)) || 0;
  const stored = Number(crystal.system?.uses?.value) || 0, max = Number(crystal.system?.uses?.max) || 0;
  const n = Math.max(0, Math.min(Number(amount) || 0, own, max - stored));
  if (!n) return ui.notifications.warn(stored >= max ? `${crystal.name} is full.` : "No power points to put in.");
  await actor.update({ [path]: own - n });
  await crystal.update({ "system.uses.value": stored + n }, { [SKIP_HOOK]: true });
  await say(actor, `<p><strong>${esc(actor.name)}</strong> puts ${n} power point${n === 1 ? "" : "s"} into ${esc(crystal.name)} (${stored + n} of ${max}).</p>`);
}

async function crystalDialog(actor, crystal) {
  const DV = DialogV2();
  if (!DV) return ui.notifications.warn("This Foundry version has no DialogV2.");
  const stored = Number(crystal.system?.uses?.value) || 0, max = Number(crystal.system?.uses?.max) || 0;
  const powers = ownPowers(actor);
  const books = psiBooks(actor);
  const content = `<p><strong>${stored}</strong> of ${max} power points stored. <small>(Attuned after 10 minutes held or carried.)</small></p>
    <fieldset><legend>Manifest with the crystal's points</legend>
      ${powers.length ? `<div class="form-group"><label>Power</label><select name="power">${powers.map((p) => `<option value="${p.id}">${esc(p.name)} (${Number(p.system?.powerPointsCost) || 1} PP)</option>`).join("")}</select></div>
      <p class="hint">Paid only from the crystal (augmenting too, up to its points); your own reserve isn't touched.</p>` : `<p class="hint">${esc(actor.name)} knows no powers in a spellbook that uses power points.</p>`}
    </fieldset>
    <fieldset><legend>Recharge from your own points</legend>
      ${books.length ? `<div class="form-group"><label>From</label><select name="book">${books.map((b) => `<option value="${b.key}">${esc(b.name)} (${Number(foundry.utils.getProperty(actor, PP_PATH(b.key))) || 0} PP)</option>`).join("")}</select></div>
      <div class="form-group"><label>Points</label><input type="number" name="amount" min="1" max="${Math.max(1, max - stored)}" value="${Math.max(0, max - stored)}"></div>` : `<p class="hint">No spellbook that uses power points.</p>`}
    </fieldset>`;
  const buttons = [];
  if (powers.length) buttons.push({ action: "manifest", label: "Manifest", icon: "fas fa-brain", default: true, callback: (ev, btn) => ({ action: "manifest", power: btn.form.elements.power?.value }) });
  if (books.length) buttons.push({ action: "recharge", label: "Recharge", icon: "fas fa-bolt", callback: (ev, btn) => ({ action: "recharge", book: btn.form.elements.book?.value, amount: btn.form.elements.amount?.value }) });
  buttons.push({ action: "close", label: "Close", icon: "fas fa-times" });
  const res = await DV.wait({ window: { title: crystal.name }, content, buttons, rejectClose: false });
  if (!res || typeof res !== "object") return;
  if (res.action === "manifest") { const p = actor.items.get(res.power); if (p) await manifestWithCrystal(actor, crystal, p); }
  if (res.action === "recharge") await rechargeCrystal(actor, crystal, res.book, res.amount);
}

const crownPowers = (actor, crown) => (actor?.items ?? []).filter((i) => i.flags?.[MOD]?.child?.master === crown.id && i.flags?.[MOD]?.child?.kind === "psicrown");

async function crownDialog(actor, crown) {
  const DV = DialogV2();
  if (!DV) return ui.notifications.warn("This Foundry version has no DialogV2.");
  const f = crown.flags?.[MOD]?.crown ?? {};
  const left = Number(crown.system?.uses?.value) || 0, max = Number(crown.system?.uses?.max) || 0;
  const kids = crownPowers(actor, crown);
  const worn = crown.system?.equipped !== false;
  const content = `<p><strong>${left.toLocaleString("en-US")}</strong> of ${max.toLocaleString("en-US")} power points; manifester level ${f.ml ?? "?"}.${worn ? "" : " <strong>Not worn:</strong> equip it to use its powers."}</p>
    ${kids.length ? `<div class="form-group"><label>Power</label><select name="power">${kids.map((k) => `<option value="${k.id}">${esc(k.name.replace(/^[^:]*:\s*/, ""))} (${k.flags[MOD].crownPower?.cost ?? 1} PP)</option>`).join("")}</select></div>` : `<p class="hint">Its powers aren't in the inventory (they appear when the psicrown is on a character and the powers are in your Power sources).</p>`}
    <div class="form-group"><label>Spend points</label><input type="number" name="spend" min="1" max="${Math.max(1, left)}" value="1"><span class="hint" style="flex:1">augmenting a power from the crown (the power's cost plus these can't exceed your manifester level)</span></div>`;
  const buttons = [];
  if (kids.length && worn) buttons.push({ action: "manifest", label: "Manifest", icon: "fas fa-brain", default: true, callback: (ev, btn) => ({ action: "manifest", power: btn.form.elements.power?.value }) });
  if (f.recharge && left < max) buttons.push({ action: "regain", label: "A day passed (+1)", icon: "fas fa-sun", callback: () => ({ action: "regain" }) });
  buttons.push({ action: "spend", label: "Spend points", icon: "fas fa-minus", callback: (ev, btn) => ({ action: "spend", n: btn.form.elements.spend?.value }) });
  buttons.push({ action: "close", label: "Close", icon: "fas fa-times" });
  const res = await DV.wait({ window: { title: crown.name }, content, buttons, rejectClose: false });
  if (!res || typeof res !== "object") return;
  if (res.action === "manifest") { const k = actor.items.get(res.power); if (k) await k.use({ ev: null, skipDialog: false }); }
  if (res.action === "regain") { await crown.update({ "system.uses.value": Math.min(max, left + 1) }, { [SKIP_HOOK]: true }); return; }
  if (res.action === "spend") {
    const n = Math.max(0, Math.min(left, Number(res.n) || 0));
    if (!n) return;
    await crown.update({ "system.uses.value": left - n }, { [SKIP_HOOK]: true });
    await say(actor, `<p><strong>${esc(actor.name)}</strong> spends ${n} more power point${n === 1 ? "" : "s"} from ${esc(crown.name)} (${left - n} left).</p>`);
  }
}

/* ------------------------------------------ */
/*  Hooks                                     */
/* ------------------------------------------ */

export function registerPsionicHooks(api) {
  // Custom uses (D35E.ItemUse.preUseItem, as D35E's Tome of Ability items do)
  Hooks.on("D35E.ItemUse.preUseItem", (item, actor, hookValues) => {
    const owner = actor ?? item?.actor;
    if (!owner) return;
    if (isCrystal(item)) { hookValues.customUse = true; crystalDialog(owner, item); return; }
    if (isCrown(item)) { hookValues.customUse = true; crownDialog(owner, item); return; }
    const c = item?.flags?.[MOD]?.child;
    if (c?.kind === "psicrown") {
      const crown = owner.items.get(c.master);
      if (!crown) { hookValues.customUse = true; ui.notifications.warn(`${item.name}: its psicrown isn't in the inventory.`); return; }
      if (crown.system?.equipped === false) { hookValues.customUse = true; ui.notifications.warn(`${crown.name} must be worn to manifest its powers.`); }
    }
  });

  // A psicrown from a compendium (or hand-made from SRD text) added to an actor: set it up before it is created
  Hooks.on("preCreateItem", (item, data, options) => {
    if (options?.[SKIP_HOOK] || !item.parent || !api.ready) return;
    if (api.setting("psicrownSetup") === false) return;
    if (!crownFacts(api, item.toObject())) return;
    item.updateSource({ [`flags.${MOD}.crownPending`]: true }); // set up after creation (making the powers is asynchronous)
  });
  Hooks.on("createItem", async (item, options, userId) => {
    if (userId !== game.user.id || !item.flags?.[MOD]?.crownPending || !item.actor) return;
    try {
      const data = item.toObject();
      delete data.flags[MOD].crownPending;
      const facts = crownFacts(api, data);
      if (!facts) return;
      await setupCrown(api, data, facts);
      // The update triggers no creation; spawn the powers through the master mechanism
      await item.update({ name: data.name, system: { identifiedName: data.name, uses: data.system.uses, slot: data.system.slot, description: data.system.description, price: data.system.price }, [`flags.${MOD}`]: data.flags[MOD], [`flags.${MOD}.-=crownPending`]: null }, { [SKIP_HOOK]: true });
      await api.spawnChildren?.(item);
    } catch (err) { console.error(`${MOD} | could not set up the psicrown ${item.name}`, err); }
  });

}
