# Axecleft's Curios — changelog
## 1.14.9.24

- Ships Axecleft's Tools 9.2: the User Guide button opens the Tool Suite's wiki in Foundry's language: French, Spanish, Brazilian Portuguese or European Portuguese when you play in one of them, English otherwise.

## 1.14.9.23

- Ships Axecleft's Tools 9.1: a User Guide button at the end of the Axecleft's Tools toolbar group (and menu), for GMs and players. It opens the Tool Suite's wiki (https://github.com/Axecleft/Axecleft-s-Tools-Suite/wiki/Home) in your web browser.

## 1.14.9.22

- Ships the Crafting engine 1.94: crafting time estimates use each skill's full bonus, as the character sheet shows it.

## 1.14.9.21

- Ships the Crafting engine 1.93: a Craft check's weekly progress can be counted in another coin (used by Traps' trap kits).

## 1.14.9.20

- Spell picker, spellbooks: choosing a class in the picker's list sets the Spellbook class to it, so the spells go into that class's spellbook. Typing another class in Spellbook class sets the picker back to "The spellbook class".

## 1.14.9.19

- Spells in several compendiums now have their class lists merged. A copy that lists only some classes (Axecleft's Shared Data, imported from eTools, lists Cure Light Wounds for the Healer, Adept and others but not the Cleric, Bard or Druid) was preferred over D35E's and had no SRD level, so the cure spells were missing from the spell picker and couldn't be made. A spell that is only on other classes' lists (from a supplement) now uses the lowest level it has on any list.

## 1.14.9.18

- Spell picker on the Treasure Generator's Curios tab and the Crafting window's "Scrolls, potions, wands" tab: every spell (or power) in your sources, grouped by level in groups that open and close, with a search box and a choice of list (the item's own rule, arcane, divine or one class). Pick a spell, set the caster level and tick metamagic, then Add to item; the item's spells are listed with ✕ to remove them. Only spells the item can hold are offered (potions up to 3rd level and no personal or area spells, wands up to 4th…), counting the metamagic. The Spells box stays, and typing still works.
- The Curios tab now takes metamagic too ("Fireball @10 +empower"), priced by the effective spell level, as crafting does.

## 1.14.9.17

- Ships the Treasure Generator 9.98: a cursed item that sheds light keeps its own light until the curse is active ("Curse Active" ticked); only then does it glow with the curse's eerie light, and unticking it brings its own light back. Before, the eerie light was there from the start and gave the curse away. The eerie lights now use animations from D35E's item sheet, so saving the sheet no longer clears the animation.

## 1.14.9.16

- Ships the Treasure Generator 9.97: custom curses on a "Custom Curses" page of the Treasure Lists journal (your own curses, drawbacks, situations and specific cursed items, with weights, the items they fit and buff penalties); the SRD's curses can be switched off one by one.

## 1.14.9.15

- Crafting a specific magic item (Rings, rods, staffs, wondrous / Specific magic arms): the caster level needed is never lower than the minimum caster level that can cast the item's required spells (SRD), e.g. Ring Gates needs 17 for gate. The window says which spell sets it.
- Ships Crafting 1.92: a staff (or, for powers, a psicrown) can supply a spell; scrolls and wands name their psionic equivalents (power stone, dorje).

## 1.14.9.14

- Ships the Treasure Generator 9.96: cursed items (SRD tables; Generation settings: a flat rate, 1% by default, or by grade, 3% / 2% / 1%), with D35E's Cursed mark, buffs for active curses and an eerie light on cursed items that shed light.
- New compendium "Common Buffs" (GM only): every curse in the SRD tables as a buff, in folders (item curses, intermittent functioning, drawbacks, psionic item curses), with penalties where the SRD gives numbers. Cursed items link their buff in the identified description.
- The Workshop has a "Cursed" choice: no curse, a random SRD curse, or a chosen kind.

## 1.14.9.13

- The crafting window's caster-level reason for an intelligent item now reads "an intelligent item (caster level 15)" instead of "an intelligent item 15"; the number is filled in by the code, so translations keep the {n} placeholder (French: "un objet intelligent (NLS {n})").
- French words: Gilgalad's corrections to the Words tab are applied (Improved and Greater armor abilities in the right order, base ammunition named in the plural, shop words, gems, art objects and materials).
- "Heightened" in scroll, potion and wand names is now a word like the other metamagic words, so other languages can make it agree (French: "Potion de Soins légers intensifiée (niveau 2)"); English names are unchanged.

## 1.14.9.12

- Ships Axecleft's Tools 9.0, Treasure Generator 9.95, Merchant Generator 7.9, Crafting 1.91: the same scripts now run on Foundry v11 too (the Foundry v11 build of this module is 1.11 instead of 1.14). On v11, windows and dialogs use Foundry's classic ones; nothing changes on v13/v14.
- Intelligent items are offered only when the D35E system supports them (3.1.0 or later); with older D35E versions the Intelligent options are hidden.

## 1.14.9.11

- French draft, second pass: Gigalad's terminology corrections are applied (weapon and armor abilities, bane foes, metamagic words, item grades Faible/Puissant, Pierre psionique, Biens précieux, Token, Améliorer, Objet spécial, Grimoire).
- Ships the Merchant Generator 7.8: shop-name words have their own lines in the word files (Shop: Anvil, Shop: Shadow), so a shop word can differ from the same English word in item names. English shop names are unchanged.

## 1.14.9.10

- French draft: lang/fr.json (buttons, menus, hints, messages and name patterns) and lang/fr.words.json (the words in item and shop names, with their genders) are filled in, and languages.json now lists fr, so worlds set to French show this module in French. A first draft for Gigalad to correct; English worlds are unchanged.

## 1.14.9.9

- Axecleft's Tools 8.4: word files. Each module's lang folder has words.template.json, every English word that goes into names (abilities, materials, base items, gems, art objects, item kinds, shop-name words); a translator copies it to <code>.words.json and writes each word with a short notation: "Épée longue (f)" (text and gender), "(f)" (gender only, keeping Babele's name), "acéré/acérée/acérés/acérées" (forms that agree with the noun), "de feu (of)" (a word that moves after the noun). Patterns can also hold agreeing words: {~sculpté/sculptée}. lang/README.md explains it. This module's template has 147 words.
- Ships the Merchant Generator 7.7: shop names ("The Gilded Anvil", "Garrick's Smithy") go through the grammar and the word files, so they can read "L'Enclume dorée" or "Forge de Garrick".
- Item kinds (Scroll, Potion, Oil…) and metamagic words come from the word file when it has them; the item kind is the name's head word, so its gender drives agreement.
- Fixed: in a translated world, potions of spells cast on objects (bless weapon, magic vestment) are oils again (the spell's target text is translated by Babele).
- English names are unchanged.

## 1.14.9.8

- Axecleft's Tools 8.3: names built from parts ("+1 Flaming Longsword of Speed", "Scroll of Fireball", "Gold Ring set with Ruby") follow the language's grammar: the name patterns are translated in lang/<code>.json like other texts (word order), and a new grammar file per language (lang/<code>.grammar.json) sets the word for "and", articles, agreement ("acérée" with "Épée longue"), elision (de → d'), contractions (de le → du) and capital letters. Drafts for French, Spanish and Portuguese are included (used once the language is listed in languages.json); lang/README.md explains patterns and grammar files.
- Scrolls, potions, oils, wands and other spell items, master scrolls and power stones ("Arcane Scroll of A, B and C"), cognizance crystals and psicrowns are named through the grammar, and all keep their English name (for matching). The metamagic words (Empowered, Heightened (5th)…) are translatable.
- English names are unchanged.

## 1.14.9.7

- Fixed: in a translated world, making an item intelligent could add its intelligence section to the description twice. The message for a missing Intelligent Item Tables compendium is translatable.

## 1.14.9.6

- Curios' own windows are translatable: the Curios tab of the Treasure Generator (Workshop), the four crafting tabs (scrolls, potions and wands; rings, rods, staffs and wondrous items; crystals and psicrowns; alchemical items), item descriptions and summaries, intelligent items, psionic items, pearls of power and messages. Prices use the world's number format. lang/template.json now lists 1,196 texts.
- Alchemical items in the crafting list show the name the world gives them.

## 1.14.9.5

- Axecleft's Tools 8.2: a language loader for Axecleft's modules. Each module has a lang folder (template.json to translate, one file per language, e.g. fr.json); texts not translated yet stay in English, Brazilian and European Portuguese fall back on each other, and setting names are translated too.
- Ships the Treasure Generator 9.94, Merchant Generator 7.6 and Crafting 1.9: their windows, chat cards and messages are translatable. Curios' own windows follow next.

## 1.14.9.4

- Spellbooks list their spells as the world names them (French spell names in a French world); the spells' English names are kept for matching.
- Ships Axecleft's Crafting 1.8: spell requirements in the world's language.

## 1.14.9.3

- Worlds in other languages: spell sources are found when Babele translates the compendium labels ("Sorts"), so potions, scrolls, wands and spellbooks are made again; the crafting lists use the English labels too. Ships the Treasure Generator 9.93.

## 1.14.9.2

- Axecleft's Tools 8.1: works with Babele 2.9 (Foundry 13/14), which keeps its translations in a new place; with it, translated compendium items are found by their English names again.
- Pearls of power (D35E's Pearl of Power, 1st to 9th, and Two Spells) work: daily uses, and using one prepares again a spell of its level cast today. Setting: Pearls of power for spontaneous casters (house rule, off). Added in 1.14.9.1.

## 1.14.9.1

- Added module update support.

## 1.14.9

- **Worlds in other languages** (Babele-translated compendiums, French, Spanish, Portuguese…): spells, powers and magic items are found by their English names, so random potions, scrolls, wands, rings, rods, staffs, wondrous items, psicrowns, the Curios tab and crafting work there as in English. Spells and items typed in your language are found too.
  - Spell levels and scroll types read translated class names ("Magicien" is a Wizard); the spellbook rule and spellbook classes too.
  - Costly material and XP components are read in French, Spanish and Portuguese text ("d'une valeur de 250 po", "Coût en PX").
  - Crafting rings, rods, staffs and wondrous items reads D35E's English construction line for the item (new data/prereqs.json), since a translated description can't be read.
  - Psicrowns are recognized by their English name ("Dominateur" is the Dominator) and their translated text.
  - Generated items show spells and items under their translated names, and keep their English name for the tools.
- Axecleft's Tools 8: in a world not in English, naming or renaming an item asks for its English name (optional; Skip / Don't ask again), and item sheets get an "English name" button, so items made in your language are recognized by the treasure, merchant and crafting tools.
- Fix: "Staff of Nature's Fury" and similar names no longer capitalize the letter after an apostrophe.
- Ships the Treasure Generator 9.92 and the Crafting engine 1.7.
- Item names still mix languages ("Scroll of Boule de feu"); translated names come with the language files.

## 1.14.8.1

- Psicrown powers no longer show as empty (greyed out) in the inventory: they show the crown's power points, and follow them as the crown is used. They always spent the crown's points; D35E's inventory just read the power item's own (empty) uses.

## 1.14.8

- **Cognizance crystals** (SRD, while Psionics is on): crystals storing 1–17 power points, at SRD prices ((PP + 1) ÷ 2)² × 1,000 gp. Using one (its Use button) opens a dialog:
  - **Manifest** one of your powers with the crystal's points. As the SRD says, the power is paid wholly from the crystal (augmenting too, up to its points) and your own reserve isn't touched: Curios lends the crystal's points to the power's spellbook for that one manifestation, D35E's own dialog runs as usual, then your reserve comes back and the crystal loses what was spent. Cancelling costs nothing.
  - **Recharge** it from your own power points, 1 for 1, up to its capacity.
- **Psicrowns** (SRD): headbands with 50 power points per manifester level and a fixed list of powers. A psicrown is a master item: on a character, each of its powers is its own item ("Dominator: Charm, Psionic") at the crown's manifester level, whose charges are the crown's points (D35E linked charges, at the power's cost, 2 × level − 1). The crown must be worn. Using the crown shows its points and powers and lets you spend extra points for augmenting. All ten SRD psicrowns and the Psicrown of the Crystal Mind (an artifact: its dialog adds its 1 point a day).
  - D35E's psicrowns ("Dominator", "Evader"…) are set up automatically when added to a character (setting: Set up psicrowns), and are renamed "Psicrown, Dominator".
- **Random**: the psionic share (setting renamed "Psionic share of potions, scrolls, wands, staffs and wondrous items") now also turns staff rolls into SRD psicrowns (medium and major tables) and wondrous item rolls into cognizance crystals (3 in 10, SRD crystal table) or psionic universal items. The Psionic emporium stocks psicrowns.
- **Curios tab**: Cognizance crystal (capacity, charged or empty) and Psicrown (an SRD one, or a custom one from the powers you list).
- **Crafting**: a "Crystals, psicrowns" tab: Craft Cognizance Crystal (manifester level = capacity; made empty) and Craft Psicrown (an SRD psicrown at its price, or a custom one priced by the SRD staff formula as a house rule; you must know each power). Psicrowns are no longer offered on the Rings, rods, staffs, wondrous tab.
- Macros: `api.crystal(7)`, `await api.psicrown("Dominator")`, `await api.customPsicrown({ powers: [...], ml: 9 })`.

## 1.14.7.1

- Ships the Merchant Generator 7.5: epic stock in Epic campaign settlements of any size (about 1 magic item in 10, past the gp limit).

## 1.14.7

- **Metamagic on scrolls, potions and wands** (Crafting window, and `api.make({ …, metamagic })`): add `+empower`, `+enlarge`, `+extend`, `+heighten 7`, `+maximize`, `+quicken`, `+silent`, `+still` or `+widen` after a spell (for example `Fireball @15 +maximize +empower`). Each raises the spell's effective level, so its price (SRD: base × effective level × caster level) and minimum caster level; the crafter needs each feat. Potions keep the 3rd-level limit, wands the 4th and scrolls the 9th, counting the metamagic. The item's name and description say what it holds ("Scroll of Maximized Empowered Fireball (CL 15)"); apply the metamagic when it's used.
- **Scribe Epic Scroll** (while Epic items is on): scrolls of effective level 10th–19th (metamagic) and caster level up to 30, priced 25 gp × level × caster level; the epic rules from the Crafting engine 1.6 (market price ÷ 25 + 1,000 XP, Scribe Scroll and Scribe Epic Scroll). Minimum caster level for 10th level and up: 11 + level (SRD).
- **Epic potions and wands** (house rule, while Epic items is on): caster level above 20, under the SRD epic item rules (market price ÷ 100 + 10,000 XP); their spell level limits stay.
- **Random epic scrolls** (EL 21+ treasure, Treasure Generator 9.91): 1d8 spells, each a 5th–9th-level spell raised to 10th–19th with metamagic (Heighten first when needed) at caster level 21–30, as a master scroll. The SRD's epic scroll level and metamagic tables aren't available, so Axecleft's weighting favours the lower epic levels.
- Ships the Treasure Generator 9.91.

## 1.14.6.1

- **Epic crafting** (Crafting engine 1.6): epic rings, rods, staffs and wondrous items (marked epic, or with an epic feat in their construction line) use the SRD epic XP (market price ÷ 100 + 10,000) and need both creation feats; 1 day per 10,000 gp (house rule, reported).

## 1.14.6

- **SRD epic rings, rods, staffs and wondrous items** (only while Epic items is on): the SRD Epic Magic Items random tables (25 rings, 25 rods, 13 staffs, 40 wondrous items), at SRD prices, for EL 21+ treasure (Treasure Generator 9.9) and anything asking for grade "epic". All are marked epic.
  - Ring of Epic Protection +6 to +10 isn't in D35E: made from its Ring of Protection +5 with the SRD text and price. Ring of Energy Immunity is named for its energy type.
- Ships the Treasure Generator 9.9.

## 1.14.5.4

- Ships the Treasure Generator 9.8: trap loot (incidental loot for trap tokens, ¼ to 1× by CR) and a fix for rolling loot by hand while Automatic loot is on.

## 1.14.5.3

- Ships the Crafting engine 1.5 (searchable lists without the Treasure Generator; also shipped by Axecleft's Traps, Poisons, and Diseases for its Trap kits tab).

## 1.14.5.2

- Ships Axecleft's Tools 7 (searchable lists that scroll, for modules without the Treasure Generator, such as Traps).
- Ships the Treasure Generator 9.7: **Token loot**, each NPC token's own treasure by its CR, by hand or automatically when an unlinked token is placed (see TREASURE-GENERATOR-CHANGELOG.md).

## 1.14.5.1

- The **Psionic emporium** also stocks a few psionic weapons, armor and shields when Axecleft's Armory 1.14.7 or later is active.

## 1.14.5

- **Intelligent rings, rods, staffs and wondrous items**, by the SRD and D35E 3.1's own intelligent item support (the same rules and tables as the Armory's intelligent arms; Curios carries its own copy, so it works without the Armory):
  - D35E's Intelligent Item Tables are rolled: alignment, Int/Wis/Cha and communication, senses, lesser and greater powers (D35E's power items and spells), special purpose and dedicated power (Generation settings rule: always with greater powers). D35E's own fields (system.intelligent) are filled, so the item sheet shows it; each feature's SRD price is added; the Ego and features are listed in the description.
  - **Random treasure and merchants:** Generation settings, row **Other permanent magic items** (SRD: under 1%; default 1%). Never on potions, scrolls, wands or other consumables. Items already intelligent in their compendium are left alone.
  - **Curios tab:** an **Intelligent** choice (by Generation settings, no, yes) for a specific item and random rings, rods, staffs and wondrous items.
  - **Crafting (rings, rods, staffs, wondrous):** **Make it intelligent**: caster level 15 (SRD), the crafter's alignment; its mind and powers are rolled by the GM's client when the request is approved, and their price joins the base price, so the gp, XP and time follow.

## 1.14.4

- **Light on permanent magic items** (rings, rods, staffs, wondrous and universal items), set on D35E's own item light (system.light):
  - Random treasure and merchants follow the Treasure Generator's Generation settings, row **Other permanent magic items** (house rule: 1%, 5 ft. bright / 10 ft. dim). Never on potions, scrolls, wands or other consumables.
  - With "Light color and animation follow the item's abilities", the look comes from the item's **school of magic** (its aura line, "Moderate evocation"): evocation an orange torch flicker, abjuration a pale blue dome, transmutation a golden pulse, conjuration green, divination white sunburst, enchantment pink, illusion violet waves, necromancy a ghostly green, psionic disciplines a crystalline blue. Fire, frost, lightning, holy or shadow words in the name win (a staff of fire burns orange-red). Otherwise a neutral white, pale blue or soft gold.
  - With "Stronger items glow brighter", faint to overwhelming auras glow brighter and more animated.
  - The description says "It sheds light (5 ft. bright, 10 ft. dim)."; an unidentified item just "It sheds light."
  - Items that already shed light in their compendium are left as they are.
- **Curios tab:** a **Sheds light** choice (by Generation settings, no, yes) for a specific item and for random rings, rods, staffs and wondrous items.
- **Crafting (rings, rods, staffs, wondrous):** a **Sheds light** choice, decided by the creator when the item is made.

## 1.14.3

- **Alchemical items in the Crafting window** (new tab "Alchemical items"), by the SRD Craft rules:
  - acid (DC 15); alchemist's fire, smokestick, tindertwig (DC 20); antitoxin, sunrod, tanglefoot bag, thunderstone (DC 25), from D35E's Items compendium, plus any other alchemical item in your item sources (tagged "Shop: Alchemical item" or named like one), for which you pick a DC from the SRD Craft table.
  - Raw materials ⅓ of the price; one Craft (alchemy) check, rolled after the GM approves; failing by 4 or less makes no progress, by 5 or more ruins half the raw materials (pay again to retry). The time is shown (Craft: check × DC in silver pieces a week).
  - Several at once (up to 100), as one batch.
  - Only a spellcaster can use Craft (alchemy) (checked). An alchemist's lab in the inventory is noted (+2, add it when rolling).
  - The SRD price is used when D35E's item has none (thunderstone).
  - Holy water isn't on the list: the SRD makes it with bless water, not Craft.

## 1.14.2.3

- The item boxes on the Curios tab and the Rings, rods, staffs, wondrous crafting tab now open a list that scrolls and stays on screen: double-click or ↓ to see everything, type to filter (Treasure Generator 9.6, Crafting engine 1.4).

## 1.14.2.2

- Ships the Crafting engine 1.3: an item priced per version in its statblock ("Ring of Protection +2") now picks the right version's price and caster level.

## 1.14.2.1

- The **Rings, rods, staffs, wondrous** crafting tab has a collapsible **How requirements are found** box: the construction line's format, what it understands, and how to make your own items craftable.
- The construction-line reader now lives in the shared Crafting engine (1.2), so the Armory reads custom special abilities the same way. Feats are recognized before spells.
- Ships the Crafting engine 1.2.

## 1.14.2

- **Rings, rods, staffs and wondrous items in the Crafting window** (new tab "Rings, rods, staffs, wondrous"): Forge Ring, Craft Rod, Craft Staff, Craft Wondrous Item and, with Psionics on, Craft Universal Item. Epic items are listed only while Epic items is on.
  - Pick the kind, then type to search the items in your compendiums (the SRD table versions too: each Ioun stone, figurine, carpet size…). Artifacts and items without a price can't be made.
  - The base price is the market price: supplies ½ of it, XP 1/25 of it. When the statblock gives its own cost (manuals and tomes, epic rods: "Cost 1,250 gp + 5,100 XP"), that is what the crafter pays.
  - **Prerequisites are read from the item's SRD construction line** in its description ("CL 10th; Craft Wondrous Item, bull's strength" and the epic "Caster Level: 20th; Prerequisites: …"), so each item checks its own needs:
    - the creation feat (and Forge Epic Ring, Craft Epic Rod… for epic items), plus any other feat it names (Empower Spell for a metamagic rod);
    - each spell, with the SRD's "or" ("wish or miracle"); spells named the SRD way ("greater magic fang") are matched to D35E's names ("Magic Fang, Greater");
    - caster level: the feat's minimum (Forge Ring 12, Craft Rod 9, Craft Staff 12, Craft Wondrous Item 3), "caster level 11th", or "three times the bonus" (+N from the item's name);
    - alignment, character level, race and skill ranks ("5 ranks in Jump") where the line says so; anything else is listed for the GM to check (!).
  - Items whose text lives on another item (D35E's Carpet of Flying II, III) are read from that item.
  - Each item's own caster level (what it works at) is shown with the requirements.
- Tested against all 548 D35E wondrous items, rings, rods and staffs: every one except the 15 artifacts has a readable construction line.

## 1.14.1

Crafting.

- **Scrolls, potions and wands in the Crafting window** (new tab "Scrolls, potions, wands"), by the SRD:
  - Scribe Scroll, Brew Potion and Craft Wand; with Psionics on, also power stones, psionic tattoos and dorjes (Imprint Stone, Scribe Tattoo, Craft Dorje).
  - Base price = 25 / 50 / 750 × spell level (0-level ½) × caster level. Supplies cost ½ of it in gp and the XP is 1/25 of it.
  - Costly material components are paid in gp and XP components in XP: once for scrolls and potions, 50 times for wands and dorjes. Both are part of the market price.
  - Caster level is the crafter's choice: blank uses the minimum, `@` sets one per spell (`Fly @7`). It can't be higher than the crafter's own.
  - The crafter provides each spell (prepared or known, or a helping caster, a scroll or a wand), with the engine's usual ✔ / ! / ✘ marks.
  - A scroll's type follows the spellbook the crafter casts it from (a cleric's scroll is divine), or pick it.
  - Several spells on one scroll (or powers on one stone) make one master scroll, like random treasure.
  - Potions: up to 50 at once, each paid in full (SRD: brewing takes 1 day each).
  - Limits: potions 3rd level or lower, targeting a creature, not personal; wands 4th or lower. A player's request always uses the SRD limits; the GM's higher potion and wand levels apply only when the GM crafts.
- Ships the shared Crafting engine (axecleft-crafting.js 1.1, the same copy as the Armory's).

## 1.14.0.2

- **Highest wand level (GM)**, like the potion one: on the Curios tab (GM only) and in the module settings, 4th (SRD) to 9th. Raising it lets the GM make wands and dorjes of higher-level spells and powers on the Curios tab, priced by the SRD formula (750 × spell level × caster level). Players' crafting always stays at 4th; random treasure follows the SRD tables.
- The potion setting's note no longer says it affects random treasure (the SRD potion table has no spell above 3rd).
- Changing either limit on the Curios tab rechecks the spells you've typed.

## 1.14.0.1

- **Random spellbooks** in the Curios tab: choose Spellbook, then Spells → Random spells, the highest spell level (0–9) and the number of spells. Each spell gets a random level from 0 to the highest and a random spell of that level from the class's list (Spellbook class), with no duplicates, until the number is reached or the book's 100 pages are full. Spells you type in the box go in first (also no duplicates). The result says if it stopped early (book full, or no more spells of those levels).

## 1.14.0

First build.

- **Random magic items by the SRD tables** for the Treasure Generator (Treasure by Level) and the Merchant Generator: potions, scrolls, wands, rings, rods, staffs and wondrous items. The tables come from D35E's own SRD tables, matched to your item compendiums by name.
  - Potions, scrolls and wands are made on demand from your Spell sources, at the table's caster level, priced by the SRD (0-level spells count as ½; costly material components and XP components added).
  - Scrolls hold 1d3 (minor), 1d4 (medium) or 1d6 (major) spells, arcane 70% / divine 30%, as in the SRD. A scroll with more than one spell is a **master scroll**.
  - Rings, rods, staffs and wondrous items come from your item compendiums (module ones first, such as Shared Data). Table rows for one version of a general item (Ioun stones, figurines of wondrous power, necklaces of fireballs, carpets, crystal balls, golem manuals) get their own name and price. SRD rings missing from D35E (meld into stone; elemental command air, earth, fire) are made with their name and SRD price for you to finish.
  - Treasure is unidentified; merchants' stock is identified.
- **Master items** (multi-spell scrolls, multi-power stones, spellbooks): the master keeps its contents in its own flags, so no compendium entry is needed. On a character, each unused scroll is a separate item; using one marks it used on the master, so a traded scroll stays partly used. Removing the master removes its scrolls (D35E's own link delete). A scroll moved away on its own becomes an ordinary scroll and is gone from the master.
  - Hand-made linked items (D35E's Links tab, like your Spell Book) are taken over the first time they are added to a character (setting).
- **Spellbooks**: spells go into the owner's spellbook for the book's class. SRD pages (spell level, 0-level = 1; 100 pages); value 15 gp + 100 gp per page. Optional **spellbook rule** (setting, off): listed classes (Wizard) can only prepare spells from a spellbook they carry; Read Magic is always allowed; the GM is warned, not stopped.
- **Psionics** (world switch, Treasure Generator → Generation settings): psionic tattoos, power stones and dorjes from your Power sources; multi-power stones; a share of random potions, scrolls and wands become psionic (setting, 10%, house rule); the **Psionic emporium** shop type.
- **Epic items** (world switch): epic rings, rods, staffs and wondrous items are kept out of treasure and shops unless it is on; the Workshop makes them while it is on.
- **The Curios tab** (Workshop) in the Treasure Generator: a potion, scroll, wand, master scroll, spellbook, psionic tattoo, power stone, multi-power stone or dorje from any spell or power, a specific item by name, or a random item by category and grade. Spells are checked as you type.
  - SRD limits: potions 3rd level or lower, targeting a creature, not personal; wands 4th or lower. The **highest potion level** is a GM setting (3 to 9); players' crafting will always use 3rd. A GM tick ignores the limits.
- Settings: highest potion level, psionic share, prefer module compendiums, take over hand-made linked items, spellbook rule and classes.
- Ships Treasure Generator 9.5 and Merchant Generator 7.4.
