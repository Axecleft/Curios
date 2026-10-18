/**
 * Axecleft's Curios — the spell picker (1.14.9.18): pick spells and powers from lists instead of typing them.
 *
 * Used on the Treasure Generator's Curios tab and the Crafting window's "Scrolls, potions, wands" tab. Every spell (or
 * power) in the Spell (Power) sources, grouped by level in groups that open and close, with a search box and a choice of
 * class list. A caster level box and metamagic checkboxes, then Add to item: the spell goes into the item's text box as
 * a line ("Fireball @10 +empower"), the same text that can be typed, so both ways work together. The item list under
 * the picker shows each line with ✕ to remove it.
 */
import * as D from "./curios-d35e.js";
import { METAMAGIC, metamagicKey, minClFor } from "./curios-consumables.js";

const { KINDS, normName } = D;
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const t = (s, d) => D.t(s, d);
const H = (s, d) => esc(t(s, d));

/**
 * "Fireball @25 +maximize +quicken +heighten 9" → { name, cl, metamagic: [{ key, to }] }. Caster level after @,
 * metamagic after + (heighten takes the level). Throws on a metamagic word Curios doesn't know.
 */
export function parseSpellLine(s) {
  const metamagic = [];
  const rest = String(s).replace(/\+\s*([\p{L} ]+?)(?:\s+(\d+)(?:st|nd|rd|th|e|er)?)?(?=\s*(?:\+|@|$))/giu, (all, word, to) => {
    const key = metamagicKey(word.trim());
    if (!key) throw new Error(t("\"{word}\" isn't a metamagic feat Curios knows (empower, enlarge, extend, heighten N, maximize, quicken, silent, still, widen).", { word: word.trim() }));
    metamagic.push({ key, to: to ? Number(to) : null });
    return "";
  }).trim();
  const m = rest.match(/^(.*?)\s*@\s*(\d+)\s*$/);
  return m ? { name: m[1].trim(), cl: Number(m[2]), metamagic } : { name: rest, cl: null, metamagic };
}
/** Every line of a spell box, parsed (lines that don't parse are kept with error). */
export function parseSpellBox(text) {
  return String(text ?? "").split(/\n|;/).map((s) => s.trim()).filter(Boolean).map((s) => {
    try { return { ...parseSpellLine(s), text: s }; } catch (e) { return { name: s, cl: null, metamagic: [], text: s, error: e.message }; }
  });
}
/** The spell's effective level with metamagic. */
const effective = (level, mm) => {
  const height = Math.max(level, ...mm.filter((x) => x.key === "heighten").map((x) => Number(x.to) || level));
  return height + mm.reduce((a, x) => a + (METAMAGIC[x.key]?.adj ?? 0), 0);
};

/** "Empower Spell" → "Empower" in the world's language (the feat names are translated in the language files). */
const featShort = (k) => { const f = METAMAGIC[k].feat; return t(f).replace(new RegExp(`\\s*${t("Spell")}$|\\s+Spell$`, "i"), ""); };

export class SpellPicker {
  constructor(api) { this.api = api; }

  /** The picker's markup (no form names: its controls aren't part of the item; Add writes the item's text box). */
  html() {
    const mm = Object.keys(METAMAGIC).map((k) => k === "heighten"
      ? `<label class="atg-cb" style="white-space:nowrap"><input type="checkbox" data-sp-mm="heighten"> ${H("Heighten to")} <input type="number" data-sp-heighten min="1" max="9" style="width:3.2em"></label>`
      : `<label class="atg-cb" style="white-space:nowrap"><input type="checkbox" data-sp-mm="${k}"> ${esc(featShort(k))}</label>`).join(" ");
    return `<fieldset class="cu-picker" data-sp>
      <legend data-sp-legend>${H("Spell picker")}</legend>
      <div class="form-group"><input type="search" data-sp-search placeholder="${H("Search")}" style="flex:2"><select data-sp-list style="flex:1"></select></div>
      <div data-sp-groups style="max-height:220px;overflow-y:auto;border:1px solid var(--color-border-light-tertiary,#7a7971);border-radius:3px;padding:2px 4px;margin:4px 0"></div>
      <div class="form-group" data-sp-clrow><label data-sp-cllabel>${H("Caster level")}</label><input type="number" data-sp-cl min="1" max="40"><span class="hint" data-sp-clhint style="flex:2"></span></div>
      <div data-sp-mmrow style="display:flex;flex-wrap:wrap;gap:2px 10px;margin:2px 0 4px"><span style="flex:0 0 100%;font-weight:bold">${H("Metamagic")}</span>${mm}</div>
      <div class="form-group"><span class="hint" data-sp-chosen style="flex:2"></span><button type="button" data-sp-add style="flex:0 0 auto"><i class="fas fa-plus"></i> ${H("Add to item")}</button></div>
      <div data-sp-items></div>
    </fieldset>`;
  }

  /**
   * Wire the picker in section. opts: { box (the text box), state() → { kind ("potion"… or "book"), list (scroll type),
   * cls (spellbook class), many, cl (caster level allowed?), gm, force (SRD limits ignored) } }.
   */
  async wire(section, opts) {
    const root = section.querySelector("[data-sp]");
    if (!root) return;
    const $ = (s) => root.querySelector(s);
    const idx = await this.api.spells.index();
    const uniq = (map) => { const seen = new Set(), out = []; for (const [, hits] of map) { const h = hits[0]; if (!seen.has(h)) { seen.add(h); out.push(h); } } return out; };
    const all = { spells: uniq(idx.spells), powers: uniq(idx.powers) };
    const classes = [...new Set(all.spells.flatMap((h) => h.facts.classes.map(([c]) => c)))].filter(Boolean).sort((a, b) => a.localeCompare(b));
    let picked = null; // the hit chosen in the list
    let open = new Set(); // levels whose group is open

    const st = () => opts.state();
    const isPower = (s) => s.kind !== "book" && !!KINDS[s.kind]?.psionic;
    /** The list choices for this item. */
    const fillLists = () => {
      const s = st(), sel = $("[data-sp-list]"), keep = sel.value;
      const o = (v, l) => `<option value="${esc(v)}">${esc(l)}</option>`;
      if (isPower(s)) sel.innerHTML = o("psionic", t("Psionic powers"));
      else sel.innerHTML = o("", t({ book: /*t*/"The spellbook class", scroll: /*t*/"By the scroll type" }[s.kind] ?? /*t*/"Lowest level (SRD prices)")) + o("arcane", t("Arcane")) + o("divine", t("Divine"))
        + `<optgroup label="${H("Class")}">${classes.map((c) => o(`class:${c}`, t(c))).join("")}</optgroup>`;
      if ([...sel.options].some((x) => x.value === keep)) sel.value = keep;
    };
    /** A spell's level on the chosen list (null: not on it). */
    const levelOf = (h, s) => {
      const f = h.facts, v = $("[data-sp-list]").value;
      if (isPower(s)) return f.psionic;
      if (v.startsWith("class:")) { const c = normName(v.slice(6)); return f.classes.find(([x]) => normName(x) === c)?.[1] ?? null; }
      if (v === "arcane") return f.arcane;
      if (v === "divine") return f.divine;
      if (s.kind === "book") { const c = normName(D.classEn(s.cls || "Wizard")); return f.classes.find(([x]) => normName(x) === c || normName(x).split("/").includes(c))?.[1] ?? null; }
      if (s.kind === "scroll") return s.list === "divine" ? f.divine : s.list === "arcane" ? f.arcane : f.arcane ?? f.divine ?? f.level;
      return f.level;
    };
    /** Can this spell go in the item at its base level? (the item's own rules; ignored when the GM ignores the SRD limits) */
    const allowed = (h, lv, s) => {
      if (s.kind === "book" || s.force) return true;
      return !this.api.spells.problems(h.facts, s.kind, lv, { gm: s.gm }).length;
    };
    const metamagic = () => [...root.querySelectorAll("[data-sp-mm]:checked")].map((c) => ({ key: c.dataset.spMm, to: c.dataset.spMm === "heighten" ? Number($("[data-sp-heighten]").value) || null : null }));

    const renderGroups = () => {
      const s = st(), q = normName($("[data-sp-search]").value);
      const pool = isPower(s) ? all.powers : all.spells;
      const by = new Map();
      for (const h of pool) {
        const lv = levelOf(h, s);
        if (lv === null || lv === undefined || !Number.isFinite(lv)) continue;
        if (q && !normName(h.display).includes(q) && !normName(h.name).includes(q)) continue;
        if (!allowed(h, lv, s)) continue;
        (by.get(lv) ?? by.set(lv, []).get(lv)).push(h);
      }
      const levels = [...by.keys()].sort((a, b) => a - b);
      const box = $("[data-sp-groups]");
      if (!levels.length) { box.innerHTML = `<p class="hint">${H(q ? /*t*/"No spell matches." : /*t*/"No spell fits this item.")}</p>`; return; }
      box.innerHTML = levels.map((lv) => {
        const list = by.get(lv).sort((a, b) => a.display.localeCompare(b.display));
        const isOpen = q || open.has(lv);
        const label = lv === 0 ? t(isPower(s) ? /*t*/"Level 0" : /*t*/"0 level (cantrips, orisons)") : t(isPower(s) ? /*t*/"{n} level powers" : /*t*/"{n} level spells", { n: D.ord(lv) });
        return `<details data-sp-lv="${lv}"${isOpen ? " open" : ""}><summary style="cursor:pointer">${esc(label)} (${list.length})</summary>
          <div style="display:flex;flex-wrap:wrap;gap:2px 4px;padding:2px 0 4px 12px">${list.map((h) => `<a data-sp-pick="${esc(h.name)}" data-sp-level="${lv}" style="padding:0 4px;border-radius:3px;cursor:pointer${picked?.name === h.name ? ";background:var(--color-border-highlight,#ff6400);color:#fff" : ""}">${esc(h.display)}</a>`).join("")}</div></details>`;
      }).join("");
      // Remember the groups the user opens (not the ones a search opens)
      if (!q) box.querySelectorAll("details").forEach((d) => d.addEventListener("toggle", () => { const lv = Number(d.dataset.spLv); if (d.open) open.add(lv); else open.delete(lv); }));
      box.querySelectorAll("[data-sp-pick]").forEach((a) => a.addEventListener("click", (ev) => {
        ev.preventDefault();
        picked = pool.find((h) => h.name === a.dataset.spPick) ?? null;
        if (picked) picked = { ...picked, lv: Number(a.dataset.spLevel) };
        box.querySelectorAll("[data-sp-pick]").forEach((x) => { const on = x === a; x.style.background = on ? "var(--color-border-highlight,#ff6400)" : ""; x.style.color = on ? "#fff" : ""; });
        renderChosen();
      }));
    };
    const renderChosen = () => {
      const s = st(), out = $("[data-sp-chosen]"), clIn = $("[data-sp-cl]"), hint = $("[data-sp-clhint]");
      if (!picked) { out.textContent = t("Choose a spell in the list."); hint.textContent = ""; clIn.placeholder = ""; return; }
      const mm = isPower(s) ? [] : metamagic();
      const eff = effective(picked.lv, mm), min = minClFor(eff);
      clIn.min = String(min);
      clIn.placeholder = String(min);
      hint.textContent = t("minimum {n}; blank: the minimum", { n: min });
      out.textContent = `${picked.display}: ${eff !== picked.lv ? t("{level} level, as {eff} with metamagic", { level: D.ord(picked.lv), eff: D.ord(eff) }) : t("{level} level", { level: D.ord(picked.lv) })}`;
    };
    /** The item's lines under the picker, each with ✕. */
    const renderItems = () => {
      const s = st(), lines = parseSpellBox(opts.box.value);
      const items = $("[data-sp-items]");
      if (!lines.length) { items.innerHTML = ""; return; }
      const word = (k) => t(METAMAGIC[k]?.word ?? k).toLowerCase();
      const inBook = s.kind === "book" ? /*t*/"In the spellbook" : /*t*/"In the item";
      items.innerHTML = `<div style="font-weight:bold">${esc(t(inBook))}</div>` + lines.map((l, i) => {
        const bits = [];
        if (l.cl) bits.push(t(isPower(s) ? /*t*/"ML {n}" : /*t*/"CL {n}", { n: l.cl }));
        for (const m of l.metamagic) bits.push(m.key === "heighten" ? t("heightened to {n}", { n: D.ord(m.to ?? 0) }) : word(m.key));
        return `<div style="display:flex;align-items:center;gap:6px"><span style="flex:1">${esc(this.api.spells.shownName?.(l.name) ?? l.name)}${bits.length ? ` <span class="hint">(${esc(bits.join(", "))})</span>` : ""}${l.error ? ` <span style="color:var(--color-level-error,#c00)">✘ ${esc(l.error)}</span>` : ""}</span><a data-sp-del="${i}" title="${H("Remove")}" style="cursor:pointer;padding:0 4px">✕</a></div>`;
      }).join("");
      items.querySelectorAll("[data-sp-del]").forEach((a) => a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const keep = opts.box.value.split(/\n|;/).map((x) => x.trim()).filter(Boolean).filter((x, i) => i !== Number(a.dataset.spDel));
        setBox(keep.join("\n"));
      }));
    };
    const setBox = (text) => {
      opts.box.value = text;
      opts.box.dispatchEvent(new Event("input", { bubbles: true }));
      opts.box.dispatchEvent(new Event("change", { bubbles: true }));
      renderItems();
    };
    const add = () => {
      const s = st();
      if (!picked) { ui.notifications?.warn(t("Choose a spell in the list.")); return; }
      const mm = isPower(s) || s.kind === "book" ? [] : metamagic();
      if (mm.some((x) => x.key === "heighten" && !(x.to > picked.lv))) { ui.notifications?.warn(t("Heighten needs a level above the spell's ({n}).", { n: picked.lv })); return; }
      const eff = effective(picked.lv, mm);
      // The item's limits count the metamagic (a potion of empowered fly would be 5th level)
      const probs = s.kind === "book" || s.force ? [] : this.api.spells.problems(picked.facts, s.kind, eff, { gm: s.gm });
      if (probs.length) { ui.notifications?.warn(probs.join(" ")); return; }
      const min = minClFor(eff);
      const clv = Number($("[data-sp-cl]").value) || null;
      if (clv && clv < min) { ui.notifications?.warn(t("The caster level can't be below {n}.", { n: min })); return; }
      const line = `${picked.display}${s.cl && clv ? ` @${clv}` : ""}${mm.map((x) => (x.key === "heighten" ? ` +heighten ${x.to}` : ` +${x.key}`)).join("")}`;
      const now = opts.box.value.split(/\n|;/).map((x) => x.trim()).filter(Boolean);
      setBox(s.many ? [...now, line].join("\n") : line);
    };
    /** Show what fits the item (metamagic only for spells in items that take it; caster level where the item has one). */
    const refresh = () => {
      const s = st();
      $("[data-sp-legend]").textContent = t(isPower(s) ? /*t*/"Power picker" : /*t*/"Spell picker");
      $("[data-sp-cllabel]").textContent = t(isPower(s) ? /*t*/"Manifester level" : /*t*/"Caster level");
      $("[data-sp-clrow]").style.display = s.cl ? "" : "none";
      $("[data-sp-mmrow]").style.display = !isPower(s) && s.kind !== "book" ? "" : "none";
      fillLists();
      // The Spellbook class typed by hand: the list follows it
      const sel = $("[data-sp-list]");
      if (s.kind === "book" && sel.value.startsWith("class:") && normName(D.classEn(sel.value.slice(6))) !== normName(D.classEn(s.cls || ""))) sel.value = "";
      if (picked && levelOf(picked, s) == null) picked = null;
      renderGroups(); renderChosen(); renderItems();
    };
    let timer = null;
    $("[data-sp-search]").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(renderGroups, 150); });
    $("[data-sp-list]").addEventListener("change", (ev) => {
      // A spellbook filtered by a class: the book is that class's (1.14.9.20)
      const v = ev.target.value;
      if (v.startsWith("class:") && st().kind === "book") opts.onClass?.(v.slice(6));
      renderGroups();
    });
    root.querySelectorAll("[data-sp-mm], [data-sp-heighten]").forEach((c) => c.addEventListener("change", renderChosen));
    $("[data-sp-heighten]").addEventListener("input", (ev) => { const cb = root.querySelector('[data-sp-mm="heighten"]'); if (ev.target.value && cb) cb.checked = true; renderChosen(); });
    $("[data-sp-add]").addEventListener("click", (ev) => { ev.preventDefault(); add(); });
    opts.box.addEventListener("input", renderItems);
    // The item, scroll type, class or limits changed: refresh the lists (the caller's controls, outside the picker)
    section.addEventListener("change", (ev) => { if (!root.contains(ev.target) && ev.target !== opts.box) refresh(); });
    refresh();
    globalThis.AxecleftTreasure?.refreshSize?.();
  }
}
