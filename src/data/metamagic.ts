// GENERATED from legacy/Kaldaran_Sheet.html (v36) by scripts/gen-tables.mjs, then kept by hand.
// Metamagic feats. Each level adjustment was read off the feat's own page in v36.
// Verification status: docs/VERIFY.md. Text is v36's, not yet re-checked against d20pfsrd.

export const METAMAGIC: Record<string, { adj: number; d: string; pre?: string; heighten?: boolean; varies?: boolean }> = {
  'Merciful Spell'    :{adj:0, d:'Damage becomes nonlethal.'},
  'Bouncing Spell'    :{adj:1, d:'A single-target spell that is resisted entirely can be redirected to another target as a swift action.'},
  'Enlarge Spell'     :{adj:1, d:'Range doubles.'},
  'Extend Spell'      :{adj:1, d:'Duration doubles. Nothing with a duration of concentration, instantaneous or permanent.'},
  'Flaring Spell'     :{adj:1, d:'The spell also dazzles.'},
  'Focused Spell'     :{adj:1, d:'One target takes a penalty on its save.'},
  'Intensified Spell' :{adj:1, d:'The damage cap rises by 5 caster levels. You must actually have the levels to pass the old cap.'},
  'Lingering Spell'   :{adj:1, d:'An instantaneous area effect stays until the start of your next turn.'},
  'Piercing Spell'    :{adj:1, d:'Treat spell resistance as 5 lower.'},
  'Rime Spell'        :{adj:1, d:'A cold spell entangles for rounds equal to the spell’s original level.'},
  'Selective Spell'   :{adj:1, d:'Exclude allies from an instantaneous area effect.', pre:'Spellcraft 10 ranks'},
  'Silent Spell'      :{adj:1, d:'No verbal component — cast while silenced or gagged.'},
  'Still Spell'       :{adj:1, d:'No somatic component — cast while bound or grappled.'},
  'Toppling Spell'    :{adj:1, d:'A force spell trips its target. Force spells only.'},
  'Empower Spell'     :{adj:2, d:'All variable numeric effects increase by half.'},
  'Persistent Spell'  :{adj:2, d:'A target that saves must save a second time, and takes the full effect if it fails.'},
  'Seeking Spell'     :{adj:2, d:'A ray ignores concealment and cover.'},
  'Sickening Spell'   :{adj:2, d:'The spell also sickens.'},
  'Threnodic Spell'   :{adj:2, d:'Mind-affecting spells work on undead, even mindless ones — and stop working on the living.',
                        pre:'Knowledge (religion) 6 ranks, Spell Focus (necromancy)'},
  'Thundering Spell'  :{adj:2, d:'The spell also deafens.'},
  'Dazing Spell'      :{adj:3, d:'A damaged creature is dazed for rounds equal to the spell’s original level. Damaging spells only.'},
  'Maximize Spell'    :{adj:3, d:'All variable numeric effects are at maximum.'},
  'Widen Spell'       :{adj:3, d:'Area doubles.'},
  'Quicken Spell'     :{adj:4, d:'Cast as a swift action.'},
  'Reach Spell'       :{adj:1, d:'Range up one category — touch, close, medium, long — at +1 slot level per step.', varies:true},
  'Heighten Spell'    :{adj:1, d:'Treat the spell as a higher level. This one DOES raise the save DC.',
                        heighten:true, varies:true}
};
