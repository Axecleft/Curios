# Axecleft's Curios — design

Module id `axeclefts-curios`, title "Axecleft's Curios". Requires the D35E system.
Targets Foundry v14 / D35E 3.1.0 first; legacy build (11.315 / 2.4.3) after the final integration pass.
Versions as in the Armory: start `1.14.0`, minor `1.14.0.1`…, major `1.14.1`…

## What Curios does

Everything in the SRD magic item chapter that is not arms or armor, plus the psionic equivalents:

| Group | Magic | Psionic | How it is made |
|---|---|---|---|
| Scroll | Scroll (single or multi-spell) | Power stone (single or multi-power) | Generated on demand from a spell/power item |
| Potion | Potion / oil | Psionic tattoo | Generated on demand |
| Wand | Wand | Dorje | Generated on demand |
| Staff | Staff | Psicrown | Fixed item from compendium (+ generated for crafting) |
| Ring, rod | Ring, rod | — | Fixed item from compendium |
| Wondrous | Wondrous item | Universal item, cognizance crystal | Fixed item from compendium |
| Book | Spellbook / tome (optional rule) | — (see Psionics) | Generated on demand |
| Other | Cursed items, artifacts (GM only), intelligent items | same | Fixed items + shared intelligence service |

Nothing spell-based is stored as a finished item. The only premade consumables allowed are ones that are not spell
completion / spell trigger items (e.g. alchemical oils and salves with their own SRD entry).

## Toggles (GM, per world, Generation Settings)

- **Psionics** (default on): psionic items, powers, power stones, tattoos, dorjes, psicrowns, universal items. Off hides
  them from random treasure, merchants, crafting and the Forge. Shared setting — every Axecleft module reads it
  (Armory: psionic weapon/armor abilities; Merchants: psionic shops/NPCs; Traps: psionic traps if any).
- **Epic items** (default off): allows SRD epic magic items in the Forge, random treasure and merchants, and lifts the
  normal caps (e.g. +10). Same switch the Armory's `spec.epic` uses, promoted to a shared setting.
- **Merchant Generator → settlement characters: Epic campaign** (default off): allows epic-level (21+) NPCs and epic
  stock in large cities/metropolises.
- **High-level potions (GM only)**: number box, 3 (SRD) to 9. Players crafting potions are always held to 3rd level;
  the GM's Forge and random generation use this value. Same box covers psionic tattoos.
- **Spellbook restriction** (default off): see Spellbooks.

## Where things come from

| Piece | Source |
|---|---|
| Rings, rods, staffs, wondrous, psionic universal items | Item compendiums chosen on the Item Sources tab. D35E `magicitems` by default (637 items: 70 rings, 58 rods, 34 staffs, ~386 wondrous; 34 psionic; ~85 epic). |
| Spells | D35E `spells` + any GM spell compendium (new **Spell sources** kind via `registerSourceKind`). |
| Shared Data (SD-1) | Mirrors D35E's packs (`SD-1.spells`, `SD-1.powers`, `SD-1.magic-items`, …) with the GM's fixes. When both hold an item with the same name, the GM picks which source wins (default: Shared Data). |
| Powers | D35E `powers` (441 power items, `system.isPower`, `powerPointsCost`, `learnedAt.class`). **Power sources** kind. |
| SRD tables, prices, prerequisites, epic list, slot/category fixes | `data/curios.json` |
| GM additions | Shared lists (journal + `Data/axecleft-treasure/treasure-lists.json`) |

### Error checking on compendium items

Applied in memory at scan time and on the created copy, never by editing D35E (same price-correction layer as the Armory):
- 31 D35E magic items have no price (Ioun Stones, Necklace of Fireballs, Staff of the Magi, Deck of Many Things…):
  price from `curios.json`, or never rolled randomly if the SRD gives none (artifacts).
- All 548 misc items are `equipmentSubtype: "wondrous"`; rings/rods/staffs are told apart by slot and name, with
  overrides in `curios.json`.
- `system.epic` and `system.psionic` exist but are empty on every item: Curios marks epic and psionic items from its
  own lists.
- Non-SRD items mixed into the pack are excluded from random rolls unless the GM enables them.

## Generated consumables

Built with D35E's own converter logic (`ItemConsumableConverter.toConsumable`, types wand, potion, scroll, dorje,
tattoo, powerstone) so they behave exactly like items made by dragging a spell onto a sheet, then Curios fixes:
- price from SRD formulas (0-level = ½; material/XP component costs added);
- potion/tattoo level cap (3, or the GM value), no personal-range spells;
- wand/dorje level cap 4th;
- arcane/divine scroll type from the spell's class list;
- unidentified name/price for treasure.

## Master scrolls and power stones (multi-spell)

**Behavior asked for:** a master item in inventory adds one single-use scroll consumable per spell; using one sets it
to 0 uses; removing the master removes its unused scrolls.

**What D35E 3.1.0 does today** (from `actor/entity.js` and `item/entity.js`):
- A link is only `{ name, img, itemId, packId }` in `system.linkedItems`. It can be written by script; drag-and-drop
  is not required.
- When the item is added to an actor, D35E fetches every linked item **from its compendium** and creates copies
  marked `linkSourceId`; the parent gets `linkId`. If a linked compendium entry is missing, D35E stops with
  "Linked item missing". So a link with no original compendium item does **not** work in D35E's mechanism.
- Deleting the parent deletes every child with that `linkSourceId` (used or not).
- The Links tab only appears on equipment and feat sheets, not loot.
- Every time the master is added to an actor, all children are created fresh from the compendium. A partly used master
  scroll traded to another character would come back full.
- The v14 drop bug is likely in `getLinkDataFromData`, which reads `itemData.document.pack` from a plain object.

**User's example (Spell Book, D35E 3.1.0 / Foundry 14.364):** an `equipment` item, `equipmentType: "misc"`,
`equipmentSubtype: "wondrous"`, `slot: "slotless"`, with `system.linkedItems` pointing to spell items in
`SD-1.spells` (Fireball, Flaming Sphere, Magic Missile). The equipment type is what gives it the Links tab. Curios
uses the same base for master scrolls, power stones and spellbooks, so the GM can still see and edit links by hand.

**Curios approach:** Curios uses D35E's link fields, but with its own data store:
1. The master item (slotless wondrous equipment, scroll icon) holds each spell's full consumable data in `flags.axeclefts-curios.contents`
   with a `used` flag per entry. No compendium is needed.
2. A `createItem` hook on the actor (GM side via socket) creates the unused children, setting
   `system.linkSourceId = master.system.linkId`. D35E's own delete then removes the children with the master.
3. A hook on child updates marks the entry `used` on the master when its quantity hits 0, so a traded master only
   recreates the remaining spells.
4. Children are flagged as linked: they can't be sold, dropped or traded on their own, only through the master.
5. If a master still has D35E `system.linkedItems` (your hand-made examples), Curios reads them, so existing items keep
   working.

Pricing follows the SRD: the sum of each spell's scroll price.

## Spellbooks and tomes (optional rule)

Same master/child mechanism, but the children are the actual **spell** items, not consumables:
- SRD: 100 pages, 15 gp blank; each spell uses pages equal to its level (0-level = 1); scribing costs 100 gp per page.
  Value and page count are computed and checked against the limit.
- Children land in the spellbook named on the spell item (`system.spellbook`, usually `primary`). Curios re-points
  them to the actor's spellbook for the matching class (e.g. a wizard who is the secondary book), and adds
  them unprepared, so the book gives known spells, not free castings (D35E preparation fields to confirm).
- Book contents carry the class and level the spell was scribed for (a cleric book is not a wizard book).
- **Spellbook restriction on:** a wizard-type spellbook can only prepare spells found in a spellbook item in the
  actor's inventory. Removing the book removes the spells it supplied. This needs a D35E hook that runs before
  preparation; to be confirmed.
- Off: books are just valuable loot with readable contents (Learn Spell from the book = copy into own book).

## Psionics

- Power stone = scroll (25 × PL × ML), multi-power stones use the master mechanism above.
- Psionic tattoo = potion (50 ×, 3rd level or lower), dorje = wand (750 ×, 4th or lower, 50 charges),
  psicrown = staff (stores power points, not charges).
- Cognizance crystal = power-point store. D35E's `linkedChargeItem` (an item drawing charges from another item) may
  model this. To check.
- **There is no psionic spellbook in the SRD.** Psions know their powers on level up. The "crystal that holds a power
  you can manifest" is the power stone, so the multi-power stone covers it.
- Feats: Imprint Stone, Scribe Tattoo, Craft Dorje, Craft Psicrown, Craft Cognizance Crystal, Craft Universal Item,
  Craft Psionic Arms and Armor (Armory).
- **Armory (1.14.7):** the SRD psionic weapon, armor and shield abilities are built from `armory.json` (D35E has no
  enhancement items for them); the Psionic emporium stocks psionic arms through the Armory's provider (tag `psionic`).

## Integration

- Ships the shared scripts (tools, treasure, merchants, crafting). The highest version runs.
- Provider categories: `magic:ring|rod|staff|wondrous|potion|scroll|wand`, psionic equivalents, `book`.
- Treasure by Level: minor/medium/major SRD tables from `curios.json`.
- Merchants: magic shop, temple (divine scrolls/potions), alchemist (non-spell oils), psionic shop (when on).
- Crafting kinds: Scribe Scroll, Brew Potion, Craft Wand, Craft Staff, Forge Ring, Craft Rod, Craft Wondrous Item,
  psionic feats; GM-only potion level override.

## Status

- 1.14.8: cognizance crystals (Use: manifest with the crystal's points by lending them to the spellbook for one manifestation; recharge 1 for 1) and psicrowns (master items whose power children use D35E linked charges on the crown); random via the psionic share on staffs and wondrous items; Curios tab and crafting tab "Crystals, psicrowns" (curios-psionic.js).
- 1.14.6–1.14.7.1: epic rules: SRD epic ring/rod/staff/wondrous tables, metamagic on spell items, Scribe Epic Scroll, epic potions and wands (CL 21+), random epic scrolls; Crafting engine 1.6 (epic XP and feats, 1 day per 10,000 gp), Treasure Generator 9.91 (EL 21–30, epic share), Merchant Generator 7.5 (epic stock).
- 1.14.5.1: Psionic emporium stocks psionic arms (Armory 1.14.7). Next: epic rules; Gemstones on the shared archive.
- 1.14.5: intelligent permanent items (scripts/curios-intelligent.js, a copy of the Armory's). Next: the Armory's psionic pass; epic rules; Gemstones on the shared archive.
- 1.14.4: light on permanent items (scripts/curios-light.js), themed by school of magic. Next: intelligence on permanent items.
- 1.14.3: alchemical items (Craft (alchemy)). Curios' crafting plan is complete except cognizance crystals and psicrowns (no data in D35E) and the epic rules.
- 1.14.2: crafting for rings, rods, staffs, wondrous and universal items, prerequisites read from the SRD construction line (scripts/curios-prereqs.js). Next: alchemical items; cognizance crystals and psicrowns (none in D35E's compendiums); epic treasure (EL 21+) and Scribe Epic Scroll; light and intelligence on permanent items.
- 1.14.1: crafting kinds for scrolls, potions and wands and the psionic equivalents (scripts/curios-craft.js). Next: staffs, rings, rods and wondrous items; alchemical items; light and intelligence on permanent items.
- 1.14.0: steps 1–6 below are built (data, shared switches, consumables, master items, fixed items, spellbooks); the Curios tab; Psionic emporium. Next: crafting kinds (step 7), light and intelligence on permanent items through the Armory's services, the psionic pass on the Armory.
- Known D35E data problems found: no prices on 31 magic items (artifacts, psionic items, Ioun Stones…), "Ring of Ring of Elemental Command (Water)", no Ring of Meld into Stone or Elemental Command (air, earth, fire); its random tables give Staff of Fire 28,500 gp (SRD 17,750) and an overlapping 9th-level scroll row (fixed here).

## Build plan

1. `curios.json`: SRD tables, prices, prerequisites, epic list, psionic list, price fixes.
2. Shared settings: Psionics, Epic items, Epic campaign (merchants).
3. Consumable generator (scroll/potion/wand + psionic).
4. Master scroll/power stone mechanism; test with the example items.
5. Fixed items with error checking; Treasure by Level and merchants.
6. Spellbooks + optional restriction.
7. Crafting kinds.
8. Psionic pass on the Armory and the other modules.

## Open items

- Spellbook example received (equipment / slotless wondrous + `linkedItems`). No master-scroll example exists; it
  will be built the same way, with scroll consumables as children.
- The D35E hook for blocking spell preparation (spellbook restriction).
- Whether `linkedChargeItem` works for cognizance crystals and psicrowns.
