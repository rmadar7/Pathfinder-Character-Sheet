// GENERATED from legacy/Kaldaran_Sheet.html (v36) by scripts/gen-tables.mjs, then kept by hand.
// Mythic tier table, universal abilities, Arch-Mage arcana and path abilities.
// Verification status: docs/VERIFY.md. Text is v36's, not yet re-checked against d20pfsrd.
import type { Mod } from '../model/types';
import { surgeDie } from '../rules/mythic-math';

/** Context for the "what this means for you" line under each ability. */
export interface MythCtx { L: number; T: number; Con: number }
export interface TextEntry { b: string; m?: (c: MythCtx) => string }
export interface AbilityEntry extends TextEntry { tier: number; mods?: Mod[] }

export const MYTHIC_TIERS: Record<number, { base: string[]; feat: boolean; abil: boolean }> = {
  1:{base:['Hard to Kill','Mythic Power','Surge +1d6'], feat:true,  abil:false},
  2:{base:['Amazing Initiative'],                       feat:false, abil:true },
  3:{base:['Recuperation'],                             feat:true,  abil:false},
  4:{base:['Surge +1d8'],                               feat:false, abil:true },
  5:{base:['Mythic Saving Throws'],                     feat:true,  abil:false},
  6:{base:['Force of Will'],                            feat:false, abil:true },
  7:{base:['Surge +1d10'],                              feat:true,  abil:false},
  8:{base:['Unstoppable'],                              feat:false, abil:true },
  9:{base:['Immortal'],                                 feat:true,  abil:false},
  10:{base:['Legendary Hero','Surge +1d12'],            feat:false, abil:true }
};

export const MYTHIC_BASE: Record<string, TextEntry> = {
 'Mythic Power':{b:'Your pool of legendary fuel. Spend a use to power Wild Arcana, a Surge, or Amazing Initiative’s extra action. Refills every morning.',
   m:(c: MythCtx)=>`3 + (2 × tier ${c.T}) = ${3+2*c.T} per day`},
 // d20pfsrd, Mythic Heroes → Hard to Kill (Ex): "Whenever you're below 0 hit points, you
 // automatically stabilize without needing to attempt a Constitution check." ... "you don't die
 // until your total number of negative hit points is equal to or greater than double your
 // Constitution score." It says nothing about staying conscious, so the normal rule holds.
 'Hard to Kill':{b:'Whenever you are below 0 hit points you automatically stabilize, with no Constitution check. You do NOT stay conscious — you are still out. Bleed damage still takes hit points off you. What it really buys you is the death line: you do not die until your negative total reaches double your Constitution score.',
   m:(c: MythCtx)=>`You stabilize on your own · you die at ${-(c.Con*2)} hp, not –10`},
 'Surge +1d6':{b:'Spend 1 Mythic Power to add a die to any d20 roll you just made — attack, save, skill, anything. You decide AFTER you see the die but before the GM says whether it worked. Missed a save by 3? Surge it.',
   m:(c: MythCtx)=>`Your surge die at tier ${c.T}: ${surgeDie(c.T)}`},
 'Surge +1d8':{b:'Your Surge die grows.',  m:(c: MythCtx)=>`Now ${surgeDie(c.T)}`},
 'Surge +1d10':{b:'Your Surge die grows.', m:(c: MythCtx)=>`Now ${surgeDie(c.T)}`},
 'Surge +1d12':{b:'Your Surge die grows.', m:(c: MythCtx)=>`Now ${surgeDie(c.T)}`},
 'Amazing Initiative':{b:'You get a bonus on initiative checks equal to your mythic tier. On top of that, as a free action on your turn you can spend 1 Mythic Power to take an ADDITIONAL standard action that turn. You cannot use it to cast a spell.',
   m:(c: MythCtx)=>`+${c.T} initiative (already in your total) · 1 mythic power = one extra standard action`},
 // d20pfsrd, Mythic Heroes → Recuperation (Ex); full quote in rules/powers.ts. v36 said it
 // "removes most conditions" — the ability says nothing about conditions (DECISIONS.md).
 'Recuperation':{b:'8 hours of rest restores you to full hit points, as long as you are not dead. Or spend 1 Mythic Power and rest for just 1 hour: you regain half your full hit points and get back your spell slots and other daily class powers, as if you had slept 8 hours. That hour does not bring back Mythic Power.',
   m:(c: MythCtx)=>c.T>=3?'1 mythic power + 1 hour = half your full hp, spells back':'Arrives at tier 3'},
 'Mythic Saving Throws':{b:'Whenever you succeed at a saving throw against a spell or effect, you suffer no effect at all — not even the reduced one.'},
 'Force of Will':{b:'Spend 1 Mythic Power to reroll a saving throw, or to force a non-mythic creature to reroll a save it just made against one of your abilities.'},
 'Unstoppable':{b:'Spend 1 Mythic Power to immediately remove a long list of conditions — blinded, dazed, exhausted, nauseated, paralyzed, sickened, staggered, stunned and more.'},
 'Immortal':{b:'If you are killed, you return to life 24 hours later unless the killer spends a use of mythic power. Death is a delay, not an ending.'},
 'Legendary Hero':{b:'Your Mythic Power refreshes far faster, and you regain uses simply by resting.'}
};

export const ARCHMAGE_ARCANA: Record<string, TextEntry> = {
 // d20pfsrd, Archmage → Wild Arcana (Su): "When casting a spell in this way, you treat your
 // caster level as 2 levels higher for the purpose of any effect dependent on level."
 'Wild Arcana':{b:'Swift action. Spend 1 Mythic Power and cast ANY arcane spell on your class spell list — it does NOT have to be prepared, and it does NOT cost you a spell slot. The only limits are that the spell must be on your list and of a level you can already cast. You may add metamagic, as long as the adjusted level still fits a slot you have.',
   m:(c: MythCtx)=>`Casts at caster level ${c.L+2} for anything that depends on level · costs 1 mythic power, no slot`},
 'Arcane Surge':{b:'Swift action. Spend 1 Mythic Power to cast a spell you already have prepared without expending it. Non-mythic targets roll their saves twice and take the worse result.'},
 'Mage Strike':{b:'Swift action. Spend 1 Mythic Power to make one melee attack and deliver a touch spell with it.'}
};

export const MYTHIC_ABILITIES: Record<string, AbilityEntry> = {
 'Enduring Armor':{tier:1, b:'You are wrapped in armor made of force. It grants an ARMOR bonus to AC equal to 3 + your tier. It is always on, costs nothing, needs no slot, and if something dispels it you switch it back on as a swift action. Being an armor bonus, it does not stack with mage armor or bracers of armor — you take whichever is higher.',
   m:(c: MythCtx)=>`+${3+c.T} armor bonus to AC (3 + tier ${c.T})`,
   mods:[{stat:'ac', type:'armor', calc:'enduringArm'}]},
 'Harmonious Mage':{tier:1, b:'You give up nothing to specialise. You have NO opposition schools — every school casts at full strength, at normal slot cost. For you that means Evocation and Enchantment are ordinary spells again.'},
 'Arcane Endurance':{tier:1, b:'Your caster level increases by 1 for all spells.',
   mods:[{stat:'cl', type:'untyped', v:1}]},
 'Competent Caster':{tier:1, b:'You can take 10 on concentration checks, even when distracted or threatened.'},
 'Abundant Casting':{tier:1, b:'You gain one extra spell slot of each of your three highest spell levels.'},
 'Perfect Preparation':{tier:1, b:'Leave some slots open when you prepare; fill them later with 1 minute of study instead of an hour.'},
 'Rapid Preparation':{tier:1, b:'Spend 1 Mythic Power to prepare spells in 1 minute instead of 1 hour.'},
 'Deep Understanding':{tier:1, b:'Choose a Knowledge skill. You may take 10 on it always, and roll twice taking the better result once per day.'},
 'Flexible Counterspell':{tier:1, b:'Spend 1 Mythic Power to counter a spell with any prepared spell of the same or higher level.'},
 'Flexible School':{tier:1, b:'Once per day, swap your school power for another school’s for the day.'},
 'Mythic School':{tier:1, b:'Your arcane school power becomes stronger — for Necromancy, Grave Touch also staggers.'},
 'Energy Conversion':{tier:1, b:'Spend 1 Mythic Power to absorb an energy attack and convert it into a spell slot.'},
 'Eldritch Breach':{tier:1, b:'Spend 1 Mythic Power to ignore a target’s spell resistance entirely.'},
 'Crafting Mastery':{tier:1, b:'You craft magic items at double speed and can craft without meeting prerequisites.'},
 'Enhance Magic Items':{tier:1, b:'Spend 1 Mythic Power to increase a magic item’s effective caster level.'},
 'Resilient Arcana':{tier:1, b:'Non-mythic creatures take a –2 penalty on saves against your spells.'},
 'Throw Spell':{tier:1, b:'Spend 1 Mythic Power to move a touch spell’s delivery to a ranged touch attack.'},
 'Telekinetic Master':{tier:1, b:'You gain a permanent telekinetic hand you can direct as a move action.'},
 'Sensory Link':{tier:1, b:'See and hear through a familiar or a willing creature at great distance.'},
 'Greater Familiar Link':{tier:1, b:'Your familiar becomes mythic and shares your mythic power.'},
 'Transformative Familiar':{tier:1, b:'Your familiar can change shape into other creature types.'},
 'Shapeshifting Mastery':{tier:1, b:'Polymorph effects you cast last far longer and can be changed at will.'},
 'Shifting Mastery':{tier:1, b:'You can change your form as a swift action.'},
 'Elemental Bond':{tier:1, b:'Choose an element. Your spells of that element gain +2 caster level and pierce resistance.'},
 'Bloodline Intensity':{tier:1, b:'Sorcerer only — your bloodline powers improve.'},
 'Mythic Bloodline':{tier:1, b:'Sorcerer only — gain a mythic version of a bloodline power.'},
 'Mythic Hexes':{tier:1, b:'Witch only — your hexes become mythic.'},
 'Coupled Arcana':{tier:1, b:'Spend 1 Mythic Power to cast a second spell of 2 levels lower as a swift action.'},
 'Flash of Omniscience':{tier:1, b:'Spend 1 Mythic Power to answer any Knowledge question as if you had rolled a 20 + tier.'},
 'Spellbane Counterstrike':{tier:1, b:'When you successfully counter a spell, you may turn it back on its caster.'},
 'Remixer':{tier:1, b:'Swap a prepared spell for another of the same level as a standard action.'},
 'Competent Defender':{tier:1, b:'Universal — add your tier as a dodge bonus to AC against attacks of opportunity.'},
 'Display of Strength':{tier:1, b:'Universal — add your tier to Strength checks and CMB.'},
 'Fleet Charge':{tier:1, b:'Universal — spend 1 Mythic Power to move your speed and make one attack as a swift action.'},
 'Sudden Block':{tier:1, b:'Universal — spend 1 Mythic Power as an immediate action to deny an enemy’s attack.'},
 'Titan’s Bane':{tier:1, b:'Universal — treat larger creatures as your own size for combat maneuvers.'}
};
