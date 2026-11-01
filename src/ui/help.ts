// Plain-English help for anything marked data-help="key" (ARCHITECTURE U4, U5).
// Ported from v36's HELPDATA. Where v36's help text contradicted a house ruling or another
// part of the sheet, the port fixes the text and says so in a comment.

import type { Character } from '../model/types';
import { sgn } from '../rules/core';
import { mods } from '../rules/derive';
import { metaFeats, magicalLineageSpell } from '../rules/metamagic';
import { deathLine, mythicPower, surgeDie } from '../rules/mythic-math';
import { commandUndeadDC, graveTouchRounds, restHeal, restHealRAW, schoolPowerUses } from '../rules/powers';
import { skillTotal } from '../rules/skills';
import { saveDC, spellFocusBonus } from '../rules/spells';
import { capsOf } from '../rules/undead';

export interface Help {
  t: string;
  b?: string;
  m?: string;
}

const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function helpFor(ch: Character, key: string): Help | null {
  const m = mods(ch), L = ch.lvl, T = ch.tier | 0, gt = schoolPowerUses(m.Int), mp = mythicPower(T);
  const caps = capsOf(ch);
  const ml = magicalLineageSpell(ch);
  const H: Record<string, Help> = {
    mythicPower: { t: 'Mythic Power', b: 'Your pool of legendary fuel. You spend one use to power Wild Arcana or a Surge. Comes back every morning.', m: `3 + (2 × tier ${T}) = ${mp} per day` },
    wildArcana: {
      t: 'Wild Arcana',
      b: 'Swift action. Spend 1 Mythic Power and cast ANY arcane spell on your class list — it does NOT have to be prepared, and it does NOT cost you a spell slot. The only limits are that it must be on your list and of a level you can already cast. You may add metamagic if the adjusted level still fits a slot you own.',
      m: `Casts at caster level ${L + 2} · costs 1 mythic power, no slot`,
    },
    surge: { t: 'Surge', b: 'Spend 1 Mythic Power to add a die to any d20 roll — attack, save, skill, anything. You may do it AFTER you roll but before the DM tells you the result. Missed a save by 3? Surge it.', m: `Your surge die at tier ${T}: ${surgeDie(T)}` },
    hardToKill: {
      t: 'Hard to Kill',
      b: 'Below 0 hit points you automatically stabilize, with no Constitution check. You are NOT conscious — you are still down and out. Bleed damage still takes hit points off you. What it really buys you is the death line: you do not die until your negative total reaches double your Constitution score.',
      m: `You stabilize on your own · you die at ${deathLine(ch.ab.Con)} hp, not –10`,
    },
    harmonious: { t: 'Harmonious Mage', b: 'Wizards normally pick two schools they’re bad at. You don’t have any. Evocation and Enchantment cast at full strength.' },
    graveTouch: {
      t: 'Grave Touch',
      b: 'Your necromancer school power. Melee touch attack — the target becomes shaken (–2 on attacks, saves, skills, and ability checks). If it’s already shaken and has fewer Hit Dice than your level, it becomes frightened and flees instead.',
      m: `3 + Int mod (${m.Int}) = ${gt} per day · shaken for ${graveTouchRounds(L)} rounds`,
    },
    commandUndead: {
      t: 'Command Undead (feat)',
      b: 'Standard action. Spend one channel use to enslave an undead you can see within 30 ft. It gets a Will save. Two DIFFERENT numbers apply and people mix them up: how many times you can TRY per day, and how many Hit Dice you can HOLD at once. Trying again on a new target does not raise the cap — if you are already full you must release something first. This is for undead you FIND. Ones you raise with Animate Dead are a separate pool.',
      m: `${gt} attempts per day · hold up to ${caps.cmdCap} HD · Will DC ${commandUndeadDC(L, m.Cha)}`,
    },
    bonded: { t: 'Bonded amulet', b: 'Your wizard bonded object. Once per day you can cast any ONE spell from your spellbook without having prepared it.', m: '1 per day' },
    samsaranMagic: { t: 'Samsaran Magic', b: 'Racial spell-like abilities. You just use them — no slot, no preparation, no components.', m: `1 each per day · caster level ${L}` },
    comprehend: { t: 'Comprehend Languages', b: 'You understand every spoken and written language for 10 minutes per level. Doesn’t let you speak them.' },
    deathwatch: { t: 'Deathwatch', b: 'See how close to death every creature within a 30-ft. cone is — healthy, wounded, dying, or already dead. Also spots undead and constructs.' },
    stabilize: { t: 'Stabilize', b: 'A dying creature within close range stops bleeding out and becomes stable. Emergency button for a downed ally.' },
    wand: { t: 'Wand of Magic Missile', b: 'Point and shoot. Magic missile never misses, ignores armor, and allows no saving throw. Each charge fires the missiles for that casting.', m: '1d4+1 per missile · recharges 5/day, max 20 (table ruling 3)' },
    spellFocus: { t: 'Spell Focus (Necromancy)', b: 'Every Necromancy spell you cast is harder to resist. This is already added into every DC shown on this sheet.', m: '+1 to the save DC of all Necromancy spells' },
    undeadMaster: { t: 'Undead Master', b: 'You count as four levels higher when working out how many Hit Dice of undead you can animate and control. Also doubles the duration of your command undead spell.', m: '+4 to caster level for animating' },
    undeadMasterM: {
      t: 'Undead Master (Mythic)',
      b: 'When you cast animate dead or use the Command Undead feat, add your tier to your caster level for working out Hit Dice of undead. This stacks with the +4 from Undead Master. Separately: when you cast the command undead SPELL, its duration is TRIPLED rather than doubled — that is the 2nd-level spell, not the feat.',
      m: `+${T} caster level · animating caster level ${caps.animCL} · command undead spell would last ${3 * L} days`,
    },
    commandUndeadSpell: {
      t: 'Command undead (the SPELL)',
      b: 'A 2nd-level wizard spell, and a third way to control undead — separate from both pools on this page. One undead target, Will negates, and it does not eat into your Animate Dead or Command Undead feat caps. Normally lasts 1 day per level; Undead Master (Mythic) triples that for you.',
      m: `Would last ${3 * L} days at wizard ${L} · save DC ${saveDC(ch, 2, 'Necromancy')}${spellFocusBonus(ch, 'Necromancy') ? ' with Spell Focus' : ''}`,
    },
    // v36 said "Right now this does nothing" unconditionally; now it depends on the feat list.
    magicalLineage: {
      t: 'Magical Lineage (trait)',
      b: `Pick one spell — yours is ${ml ? title(ml) : 'not set'}. Metamagic feats applied to it cost one spell level less than normal, but never below the spell's own level.` +
        (metaFeats(ch).length ? '' : ' You have no metamagic feat yet, so it has nothing to discount until you take one.'),
      m: `Metamagic on ${ml ? title(ml) : 'that spell'} costs 1 level less`,
    },
    reactionary: { t: 'Reactionary (trait)', b: 'You were bullied as a child and learned to jump first. This is where your +2 initiative comes from.', m: '+2 initiative' },
    lifebound: { t: 'Lifebound (racial)', b: 'Samsarans cling to life. A big deal for a necromancer, who spends a lot of time around exactly these effects.', m: '+2 on saves vs. death effects, negative energy, and to remove negative levels; +2 on Con checks to stabilize' },
    // v36 suggested asking to reassign the three wasted picks; table ruling 8 settled that.
    mysticPastLife: {
      t: 'Mystic Past Life (racial)',
      b: 'You remember magic from a former life. Spells from the witch list were added to your wizard list permanently. Three of the picks (Mirror Image, Lesser Animate Dead, Vampiric Touch) were already wizard spells; they stand as chosen (table ruling 8).',
      m: '1 + Int modifier spells, chosen at 1st level',
    },
    scribeScroll: { t: 'Scribe Scroll', b: 'You can turn a prepared spell into a scroll. The scroll is worth spell level × caster level × 25 gp and uses half that in materials. Anything worth 250 gp or less takes 2 hours, above that 1 day per 1,000 gp. Spellcraft DC 5 + caster level, and the prepared slot is spent either way. Use the Scriptorium on the Inventory tab.' },
    // v36 said "cast Mage Armor every morning for +4"; table ruling 4 dropped that for Enduring Armor.
    ac: { t: 'Armor Class', b: 'How hard you are to hit. An attacker must roll this number or higher. You wear a robe, so your protection is Dexterity plus whatever effects are running — Enduring Armor, for you, which is why Mage Armor adds nothing while it is up.' },
    touchac: { t: 'Touch AC', b: 'Used when something makes a touch attack — most rays and touch spells. Armor and natural armor DON’T count against these, only Dex, size, deflection, and dodge.' },
    flatfooted: { t: 'Flat-Footed AC', b: 'Your AC before you’ve acted in combat, or any time you’re caught off guard. You lose your Dexterity bonus.' },
    cmd: { t: 'Combat Maneuver Defense', b: 'The number an enemy must beat to grapple, trip, disarm, or bull rush you.' },
    cmb: { t: 'Combat Maneuver Bonus', b: 'What you roll to grapple, trip, or disarm someone.' },
    bab: { t: 'Base Attack Bonus', b: 'Wizards are a poor-BAB class — you get half your level, rounded down. It only goes up on even levels.' },
    fort: { t: 'Fortitude save', b: 'Resisting poison, disease, exhaustion, and anything that attacks your body. Wizards have a poor Fortitude progression.' },
    ref: { t: 'Reflex save', b: 'Dodging fireballs, traps, and area effects. Poor progression, but your Dex helps.' },
    will: { t: 'Will save', b: 'Resisting charms, fear, illusions, and mind control. This is your GOOD save — wizards are built to shrug these off.' },
    init: { t: 'Initiative', b: 'Rolled once at the start of combat to decide turn order. Going early matters a lot for a caster.' },
    conc: {
      t: 'Concentration check',
      b: 'If something disrupts you mid-cast — you take damage, you’re grappled, you’re on a moving mount — roll this or the spell is lost along with the slot.',
      m: `Caster level ${L} + Int ${m.Int}. DC = 10 + damage taken + spell level if you were hit; DC 15 + spell level otherwise.`,
    },
    casterlevel: { t: 'Caster level', b: 'Your power as a caster. Sets spell damage, duration, range, and how well you punch through spell resistance. Equals your wizard level.' },
    classskill: { t: 'Class skill', b: 'A skill your class is trained in. The moment you put even one rank in it, you get a flat +3 on top. That’s why one rank in a class skill is such a good deal.' },
    skillranks: { t: 'Skill ranks', b: 'Points you spend to get better at a skill. You get 2 per level from the wizard class plus your Int modifier. You can never have more ranks in one skill than your character level.', m: `2 + Int ${m.Int} = ${2 + m.Int} per level` },
    undeadCap: {
      t: 'Undead control limits',
      b: 'You have TWO separate pools and they do not share. Undead raised with Animate Dead are capped by your caster level. Undead taken over with the Command Undead feat are capped by your character level. The animate dead rules say it outright: undead controlled through the Command Undead feat do not count toward the animate dead limit. Go over either cap and the excess breaks free — you choose which ones to release.',
      m: `Animate Dead: 4 HD × caster level ${caps.animCL} = ${caps.strictCap} HD · Command Undead feat: ${caps.cmdCap} HD`,
    },
    // v36's title and body had the numbers 8 and 9 typed in; now computed.
    cmdCap: {
      t: `Why only ${caps.cmdCap} HD when I get ${gt} uses?`,
      b: `They measure different things. The ${gt} is how many times per day you can attempt an enslavement — 3 + your Int modifier, from Power over Undead. The ${caps.cmdCap} HD is how much undead you can keep under your control at any one moment. Every new one past the cap forces you to release an old one. The cap is your level + 4 + tier, so it grows as you level.`,
      m: `Attempts: 3 + Int (${m.Int}) = ${gt}/day · Capacity: level ${L} + 4 + ${T} = ${caps.cmdCap} HD`,
    },
    potions: { t: 'Potions', b: 'Drinking one is a standard action and provokes an attack of opportunity. These do NOT come back when you rest — you have to buy more.' },
    metamagic: {
      t: 'Metamagic',
      b: 'A metamagic feat bends a spell you already know — longer, wider, harder-hitting — and the price is that the bent spell fills a higher slot than usual. The spell itself does not become a higher-level spell, so its saving throw DC does not move. Heighten Spell is the single exception: it genuinely raises the level, and its DC rises with it. You pick which spells carry metamagic when you prepare in the morning, so an empty slot on the Today tab offers lower-level spells your feats can lift into it.',
    },
    scribe: {
      t: 'Scriptorium',
      b: 'Materials are gold already spent, sitting in your pack waiting to become scrolls. Pick a spell you have prepared and have not cast yet, choose a caster level, and you get what the scroll is worth, what it costs in materials, how many hours it takes and the Spellcraft DC — then it rolls the check and files the scroll in your inventory. A lower caster level makes a cheaper but weaker scroll, never below the lowest level that could cast the spell. Whether you succeed or fail, the prepared spell is spent and the materials are used up.',
      m: `Materials on hand: ${ch.craft?.mats || 0} gp · your Spellcraft is ${sgn(skillTotal(ch, 'Spellcraft'))} against DC 5 + caster level`,
    },
    buffs: {
      t: 'Active effects',
      b: 'Everything that is changing a number right now: mythic abilities, spells you have running, magic items, and conditions. Switch one on and every number it touches moves, and each of those numbers shows why. Two bonuses of the same type do not stack — the loser shows struck through as SUPPRESSED, which is usually the answer to “why didn’t my AC go up?” Timed spell effects clear on a new day; permanent gear and mythic abilities stay.',
    },
    round: { t: 'Combat round', b: 'One round is 6 seconds. Next round advances it and your spell durations count down automatically.' },
    brug: { t: 'Brug', b: 'Your ogre. He owes you a life debt — he is not a hireling and takes no orders you have to pay for. He rolls his own initiative and acts on his own turn.', m: 'Best move: cast Enlarge Person on him. Huge size, +2 Str, 15-ft. reach.' },
    // v36 said rest heals 1 hp/level and that Hard to Kill keeps you conscious — both
    // contradicted the sheet (table ruling 5, and the Hard to Kill text above).
    hp: {
      t: 'Hit points',
      b: T > 0
        ? 'At 0 you fall unconscious. Below 0 you would normally be dying — Hard to Kill stabilizes you automatically, but you stay unconscious until healed.'
        : 'At 0 you fall unconscious. Below 0 you are dying and lose 1 hp a round until stabilized.',
      m: `A night’s rest heals 2 × level = ${restHeal(L)} hp (table ruling 5; by the book, ${restHealRAW(L)}).`,
    },
    amulet: { t: 'Bonded object', b: 'Your wizard’s bonded amulet. You must hold or wear it to cast comfortably — casting without it requires a concentration check (DC 20 + spell level). Once a day it grants you one free unprepared spell.' },
  };
  return H[key] || null;
}
