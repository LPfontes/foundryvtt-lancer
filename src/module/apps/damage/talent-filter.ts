import type { LancerTALENT } from "../../item/lancer-item";

export function isDamageTalent(talent: LancerTALENT): boolean {
  if (!talent) return false;
  const currRank = talent.system.curr_rank || 1;
  const unlockedRanks = talent.system.ranks ? talent.system.ranks.slice(0, currRank) : [];

  const damageKeywords =
    /dano|damage|bonus_damage|dano bônus|bônus de dano|dano adicional|additional damage|\bqueimadura\b|\bburn\b|\bcausa\b|\bdeals?\b|\+\d+d\d+|\+\d+\s+(dano|damage|heat|calor|burn|cinético|kinetic|energia|energy|explosivo|explosive)|acerto crítico|critical hit|ao acertar|on hit|on a hit/i;
  const hitOrCritKeywords = /acerto|acertar|crítico|critico|critical|crit|\bhit\b|\bhits\b/i;
  const movementOnlyRegex = /1d6\s*(espaços|spaces)|mover\s*1d6|move\s*1d6/i;

  for (const rank of unlockedRanks) {
    // 1. Check rank.bonuses structure (e.g. { id: "damage", val: ... })
    if (rank.bonuses && Array.isArray(rank.bonuses)) {
      for (const b of rank.bonuses) {
        const bId = ((b as any).id || (b as any).lid || "").toLowerCase();
        if (bId.includes("damage") || bId.includes("heat") || bId.includes("burn")) {
          return true;
        }
      }
    }

    // 2. Check rank.actions structure (e.g. damage array, trigger, or detail)
    if (rank.actions && Array.isArray(rank.actions)) {
      for (const act of rank.actions) {
        if ((act as any).damage && Array.isArray((act as any).damage) && (act as any).damage.length > 0) {
          return true;
        }
        if (act.trigger && (damageKeywords.test(act.trigger) || hitOrCritKeywords.test(act.trigger))) {
          return true;
        }
        if (act.detail && damageKeywords.test(act.detail)) {
          if (!movementOnlyRegex.test(act.detail) || /dano|damage|causa|deals/i.test(act.detail)) {
            return true;
          }
        }
      }
    }

    // 3. Check rank.active_effects structure (e.g. damage array or condition)
    const activeEffects = (rank as any).active_effects;
    if (activeEffects && Array.isArray(activeEffects)) {
      for (const effect of activeEffects) {
        if (effect.damage && Array.isArray(effect.damage) && effect.damage.length > 0) {
          return true;
        }
        if (effect.condition && (damageKeywords.test(effect.condition) || hitOrCritKeywords.test(effect.condition))) {
          return true;
        }
        if (effect.detail && damageKeywords.test(effect.detail)) {
          if (!movementOnlyRegex.test(effect.detail) || /dano|damage|causa|deals/i.test(effect.detail)) {
            return true;
          }
        }
      }
    }

    // 4. Check rank.synergies structure (e.g. damage array or detail)
    if (rank.synergies && Array.isArray(rank.synergies)) {
      for (const syn of rank.synergies) {
        if ((syn as any).damage && Array.isArray((syn as any).damage) && (syn as any).damage.length > 0) {
          return true;
        }
        if (syn.detail && damageKeywords.test(syn.detail)) {
          if (!movementOnlyRegex.test(syn.detail) || /dano|damage|causa|deals/i.test(syn.detail)) {
            return true;
          }
        }
      }
    }

    // 5. Fallback check on rank description
    if (rank.description && damageKeywords.test(rank.description)) {
      if (!movementOnlyRegex.test(rank.description) || /dano|damage|causa|deals/i.test(rank.description)) {
        return true;
      }
    }
  }

  return false;
}
