/**
 * Axecleft's Curios — pearls of power (SRD), 1.14.10.
 *
 * "Once per day on command, a pearl of power enables the possessor to recall any one spell that she had prepared and then cast
 * that day. The spell is then prepared again, just as if it had not been cast. The spell must be of a particular level, depending
 * on the pearl. Different pearls exist for recalling one spell per day of each level from 1st through 9th and for the recall of
 * two spells per day (each of a different level, 6th or lower)."
 *
 * D35E's "Pearl of Power (1st)" … "(9th)" and "Pearl of Power, Two Spells" (found by English name, so Babele-translated ones too):
 *   - on a character they get daily uses (1, or 2 for the two-spell pearl), which D35E restores when the character rests;
 *   - using the pearl (its Use button) lists the prepared spells of its level that were cast today (D35E: fewer left than prepared)
 *     and prepares the chosen one again (+1 prepared), spending a use. The two-spell pearl takes two different levels, 6th or lower.
 *   - spontaneous casters (sorcerers, bards): the SRD pearl is for casters who prepare spells. A GM setting (house rule, off by
 *     default) lets them regain one spell slot of the pearl's level instead.
 */
import * as D from "./curios-d35e.js";

const { MOD, normName } = D;
const SKIP_HOOK = "curiosInternal";
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const th = (n) => D.ord(n);
const t = D.t;

/** The pearl's rules from its English name, or null: { levels: [n] } or { two: true, max: 6 }. */
export function pearlFacts(item) {
  const n = normName(D.enName(item));
  let m = n.match(/^pearl of power (\d)(?:st|nd|rd|th)?(?: level)?(?: spell)?$/) ?? n.match(/^pearl of power (\d)(?:st|nd|rd|th) level spell$/);
  if (m) return { level: Number(m[1]), uses: 1 };
  if (/^pearl of power two spells?$/.test(n)) return { two: true, max: 6, uses: 2 };
  return null;
}

/** Daily uses for a pearl (item data, in place). */
function pearlUses(data, facts) {
  foundry.utils.setProperty(data, "system.uses", { ...(data.system?.uses ?? {}), value: facts.uses, max: facts.uses, per: "day", maxFormula: String(facts.uses), autoDeductCharges: false });
  foundry.utils.setProperty(data, `flags.${MOD}.pearl`, { ...(facts.two ? { two: true, max: facts.max } : { level: facts.level }), today: [] });
  return data;
}
const ready = (item) => item.system?.uses?.per === "day" && Number(item.system?.uses?.max) > 0 && item.flags?.[MOD]?.pearl;

/** What the pearl can recall now: [{ kind: "spell", item, level, book } | { kind: "slot", book, level }]. */
function choices(actor, pearl, facts, { spontaneous }) {
  const books = actor.system?.attributes?.spells?.spellbooks ?? {};
  const used = facts.two ? (pearl.flags?.[MOD]?.pearl?.today ?? []) : [];
  const fits = (lv) => (facts.two ? lv >= 1 && lv <= facts.max && !used.includes(lv) : lv === facts.level);
  const out = [];
  for (const i of actor.items) {
    if (i.type !== "spell") continue;
    const book = books[i.system?.spellbook];
    if (!book || book.spontaneous || book.usePowerPoints) continue;
    const lv = Number(i.system?.level) || 0;
    const p = i.system?.preparation ?? {};
    if (!fits(lv) || !(Number(p.maxAmount) > Number(p.preparedAmount ?? 0))) continue; // prepared and cast today
    out.push({ kind: "spell", item: i, level: lv, book: book.name || i.system.spellbook });
  }
  if (spontaneous) {
    for (const [key, book] of Object.entries(books)) {
      if (!book?.spontaneous || book.usePowerPoints) continue;
      for (let lv = 1; lv <= 9; lv++) {
        const s = book.spells?.[`spell${lv}`];
        if (fits(lv) && s && Number(s.max) > Number(s.value)) out.push({ kind: "slot", key, book: book.name || key, level: lv });
      }
    }
  }
  return out.sort((a, b) => a.level - b.level || String(a.item?.name ?? "").localeCompare(String(b.item?.name ?? "")));
}

async function usePearl(api, actor, pearl) {
  let facts = pearlFacts(pearl);
  if (!facts) return;
  if (!ready(pearl)) await pearl.update(pearlUses({}, facts), { [SKIP_HOOK]: true }); // a pearl added before Curios 1.14.10
  const left = Number(pearl.system?.uses?.value) || 0, max = Number(pearl.system?.uses?.max) || 1;
  if (left <= 0) return ui.notifications.warn(t(max > 1 ? "{item} has been used twice today; it works again after a rest." : "{item} has been used today; it works again after a rest.", { item: pearl.name }));
  // A fresh day (all uses back): forget which levels the two-spell pearl recalled
  if (facts.two && left >= max && (pearl.flags?.[MOD]?.pearl?.today ?? []).length) await pearl.update({ [`flags.${MOD}.pearl.today`]: [] }, { [SKIP_HOOK]: true });
  const list = choices(actor, pearl, facts, { spontaneous: api.setting("pearlSpontaneous") === true });
  const what = facts.two ? t("two spells a day, each of a different level (1st–6th)") + ((pearl.flags?.[MOD]?.pearl?.today ?? []).length ? t("; already recalled today: {levels}", { levels: pearl.flags[MOD].pearl.today.map(th).join(", ") }) : "") : t("one {level}-level spell a day", { level: th(facts.level) });
  if (!list.length) {
    const none = facts.two ? t("{item}: no prepared spell has been cast today", { item: pearl.name }) : t("{item}: no {level}-level prepared spell has been cast today", { item: pearl.name, level: th(facts.level) });
    return ui.notifications.info(`${none}${api.setting("pearlSpontaneous") ? t(" and no spell slot of that level is used") : ""}. ${t("(It recalls {what}.)", { what })}`);
  }
  const DV = globalThis.AxecleftTools?.DialogV2 ?? foundry.applications?.api?.DialogV2;
  const label = (c) => (c.kind === "spell" ? `${c.item.name} (${th(c.level)}, ${c.book})` : t("A {level}-level spell slot ({book}, spontaneous: house rule)", { level: th(c.level), book: c.book }));
  const content = `<p>${esc(t("{item} recalls {what}: a spell prepared and cast today is prepared again.", { item: pearl.name, what }))}</p>
    <div class="form-group"><label>${esc(t("Recall"))}</label><select name="pick">${list.map((c, i) => `<option value="${i}">${esc(label(c))}</option>`).join("")}</select></div>`;
  let idx = null;
  if (DV) {
    const res = await DV.wait({ window: { title: pearl.name }, content, rejectClose: false,
      buttons: [{ action: "recall", label: t("Recall"), icon: "fas fa-rotate-left", default: true, callback: (ev, btn) => btn.form.elements.pick?.value }, { action: "close", label: t("Cancel"), icon: "fas fa-times" }] });
    if (res === null || res === undefined || res === "close") return;
    idx = Number(res);
  } else {
    idx = await new Promise((resolve) => new Dialog({ title: pearl.name, content: `<form>${content}</form>`, default: "recall",
      buttons: { recall: { label: t("Recall"), callback: (html) => resolve(Number(html.find('[name="pick"]').val())) }, close: { label: t("Cancel"), callback: () => resolve(null) } }, close: () => resolve(null) }).render(true));
    if (idx === null) return;
  }
  const c = list[idx];
  if (!c) return;
  if (c.kind === "spell") {
    const p = c.item.system.preparation;
    await c.item.update({ "system.preparation.preparedAmount": Math.min(Number(p.maxAmount) || 1, (Number(p.preparedAmount) || 0) + 1) });
  } else {
    const path = `system.attributes.spells.spellbooks.${c.key}.spells.spell${c.level}`;
    const s = foundry.utils.getProperty(actor, path);
    await actor.update({ [`${path}.value`]: Math.min(Number(s.max) || 0, (Number(s.value) || 0) + 1) });
  }
  const upd = { "system.uses.value": left - 1 };
  if (facts.two) upd[`flags.${MOD}.pearl.today`] = [...(pearl.flags?.[MOD]?.pearl?.today ?? []), c.level];
  await pearl.update(upd, { [SKIP_HOOK]: true });
  try {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p>${c.kind === "spell" ? t("<strong>{actor}</strong> uses {item}: <em>{spell}</em> is prepared again.", { actor: esc(actor.name), item: esc(pearl.name), spell: esc(c.item.name) }) : t("<strong>{actor}</strong> uses {item}: regains a {level}-level spell slot.", { actor: esc(actor.name), item: esc(pearl.name), level: th(c.level) })}</p>` });
  } catch (e) { /* no chat */ }
}

export function registerPearlHooks(api) {
  // A pearl arriving on a character gets its daily uses (D35E restores them on rest)
  Hooks.on("preCreateItem", (item, data, options) => {
    if (options?.[SKIP_HOOK] || !item.parent || item.type !== "equipment") return;
    const facts = pearlFacts(item);
    if (!facts || ready(item)) return;
    item.updateSource(pearlUses({}, facts));
  });
  Hooks.on("D35E.ItemUse.preUseItem", (item, actor, hookValues) => {
    const owner = actor ?? item?.actor;
    if (!owner || item?.type !== "equipment" || !pearlFacts(item)) return;
    hookValues.customUse = true;
    usePearl(api, owner, item);
  });
}

export const PEARL_SETTINGS = {
  pearlSpontaneous: { name: /*t*/"Pearls of power for spontaneous casters (house rule)", hint: /*t*/"SRD: a pearl of power recalls a spell a caster prepared. On: sorcerers, bards and other spontaneous casters can use one to regain a used spell slot of the pearl's level.", type: Boolean, default: false },
};
