<script lang="ts">
  import { onDestroy } from "svelte";
  import tippy, { type Instance } from "tippy.js";
  import type { DamageHudData } from "./data.svelte";
  import { getPilotTalents } from "../acc_diff/data.svelte";
  import type { LancerTALENT } from "../../item/lancer-item";
  import { DamageType } from "../../enums";
  import type { DamageData } from "../../models/bits/damage";
  import { isDamageTalent } from "./talent-filter";

  /* ===== PROPS ===== */

  let {
    data,
  }: {
    data: DamageHudData;
  } = $props();

  /* ===== STATE ===== */

  let selectedDamageType: Record<string, DamageType> = $state({});
  let customDiceValue: Record<string, string> = $state({});
  // Track which bonus damage array items belong to which talent lid
  let talentBonusMap: Record<string, DamageData[]> = $state({});

  /* ===== DERIVED VALUES ===== */

  const lancerActor = $derived(data.lancerActor);
  const base = $derived(data.base);
  const allTalents = $derived(getPilotTalents(lancerActor));
  const talents = $derived(allTalents.filter(isDamageTalent));
  const pilotName = $derived(
    lancerActor?.is_mech() ? lancerActor.system.pilot?.value?.name || "Pilot" : lancerActor?.name || "Pilot"
  );
  const damageTypeOptions = Object.values(DamageType).filter(t => t !== DamageType.Variable);

  let tippyInstances: Instance[] = [];

  function initTippy(node: HTMLElement, targetId: string) {
    setTimeout(() => {
      const contentEl = document.getElementById(targetId);
      if (!contentEl) return;
      contentEl.style.display = "block";
      const instance = tippy(node, {
        content: contentEl,
        interactive: true,
        allowHTML: true,
        trigger: "click mouseenter",
        placement: "left",
        theme: "lancer-large",
        maxWidth: 500,
        appendTo: () => document.body,
      });
      tippyInstances.push(instance);
    }, 0);

    return {
      destroy() {
        // cleaned up automatically on unmount
      },
    };
  }

  onDestroy(() => {
    tippyInstances.forEach(i => i.destroy());
    tippyInstances = [];
  });

  /* ===== FUNCTIONS ===== */

  function getTalentType(lid: string): DamageType {
    return selectedDamageType[lid] || DamageType.Kinetic;
  }

  function setTalentType(lid: string, type: DamageType) {
    selectedDamageType[lid] = type;
  }

  function getCustomValue(lid: string): string {
    return customDiceValue[lid] || "1d6";
  }

  function addBonusDamage(talent: LancerTALENT, val: string) {
    const lid = talent.system.lid || talent.id || talent.name;
    const type = getTalentType(lid);
    const newEntry: DamageData = { type, val };

    if (!talentBonusMap[lid]) {
      talentBonusMap[lid] = [];
    }
    talentBonusMap[lid].push(newEntry);
    base.bonusDamage = [...base.bonusDamage, newEntry];
  }

  function removeBonusDamage(lid: string, entryIndex: number) {
    if (!talentBonusMap[lid]) return;
    const targetEntry = talentBonusMap[lid][entryIndex];
    if (!targetEntry) return;

    talentBonusMap[lid].splice(entryIndex, 1);
    const baseIdx = base.bonusDamage.indexOf(targetEntry);
    if (baseIdx !== -1) {
      base.bonusDamage.splice(baseIdx, 1);
      base.bonusDamage = [...base.bonusDamage];
    }
  }
  function handleAddBonus(talent: LancerTALENT, lid: string) {
    const rawVal = customDiceValue[lid]?.trim() || "1d6";
    addBonusDamage(talent, rawVal);
    customDiceValue[lid] = "";
  }
</script>

{#if talents.length > 0}
  <div id="talent-damage-hud" class="lancer lancer-hud damage talent-hud window-content">
    <div class="lancer-header lancer-talent medium">
      <i class="fas fa-award i--4 i--light"></i>
      <span>{game.i18n.format("lancer.talent_hud.title", { name: pilotName })}</span>
    </div>

    <div class="lancer-hud-body talent-body">
      {#each talents as talent (talent.id || talent.system.lid)}
        {@const lid = talent.system.lid || talent.id || talent.name}
        {@const activeType = getTalentType(lid)}
        {@const bonusList = talentBonusMap[lid] || []}

        <div class="talent-item-card">
          <div class="talent-row">
            <div class="talent-info">
              {#if talent.img}
                <img src={talent.img} alt={talent.name} class="talent-icon">
              {/if}
              <div class="talent-name-rank">
                <span class="talent-name">{talent.name}</span>
                <span class="talent-rank-badge">
                  {game.i18n.format("lancer.talent_hud.rank_badge", { rank: talent.system.curr_rank || 1 })}
                </span>
              </div>

              <!-- Hidden Content Container for Floating Tippy Popup -->
              <div id="talent-dmg-popup-{lid}" style="display: none">
                <div class="talent-description-box">
                  <h4 class="popup-title">
                    {talent.name} ({
                      game.i18n.format("lancer.talent_hud.rank_title", { rank: talent.system.curr_rank || 1 })
                    })
                  </h4>
                  {#if talent.system.ranks && talent.system.ranks.length > 0}
                    <div class="talent-ranks-list">
                      {#each talent.system.ranks.slice(0, talent.system.curr_rank || 1) as rank, idx}
                        <div class="talent-rank-item">
                          <strong>{game.i18n.format("lancer.talent_hud.rank_title", { rank: idx + 1 })}{
                            rank.name ? `: ${rank.name}` : ""
                          }</strong>
                          {#if rank.description}
                            <div>{@html rank.description}</div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Info Button Triggering Tippy Popup -->
              <button
                type="button"
                class="talent-info-btn"
                title={game.i18n.localize("lancer.talent_hud.view_description")}
                aria-label={game.i18n.localize("lancer.talent_hud.view_description")}
                use:initTippy={`talent-dmg-popup-${lid}`}
              >
                <i class="fas fa-info-circle"></i>
              </button>
            </div>

            <!-- Damage Type Selector & Custom Bonus Input -->
            <div class="talent-damage-controls">
              <select
                class="talent-damage-type-select"
                value={activeType}
                onchange={e => setTalentType(lid, e.currentTarget.value as DamageType)}
              >
                {#each damageTypeOptions as dType}
                  <option value={dType}>{dType}</option>
                {/each}
              </select>

              <div class="talent-bonus-input-group">
                <input
                  type="text"
                  class="lancer-input talent-bonus-val-input"
                  placeholder="1d6"
                  bind:value={customDiceValue[lid]}
                  onkeydown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBonus(talent, lid);
                    }
                  }}
                  title="Valor do dano bônus (ex: 1d6, 1d3, 2, 1d6+2)"
                >
                <button
                  type="button"
                  class="preset-btn add-btn"
                  onclick={() => handleAddBonus(talent, lid)}
                  title="Adicionar dano bônus"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <!-- Applied Bonus Damage Tags for this Talent -->
          {#if bonusList.length > 0}
            <div class="talent-applied-bonus-list">
              {#each bonusList as bonus, idx}
                <span class="bonus-tag">
                  <i class="cci cci-{bonus.type.toLowerCase()} damage--{bonus.type.toLowerCase()}"></i>
                  +{bonus.val} {bonus.type}
                  <button
                    type="button"
                    class="tag-remove-btn"
                    onclick={() => removeBonusDamage(lid, idx)}
                    title="Remover este bônus"
                    aria-label="Remover este bônus"
                  >
                    &times;
                  </button>
                </span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  @layer lancer {
    @layer applications {
      #talent-damage-hud {
        background: rgba(20, 24, 33, 0.95);
        border: 1px solid var(--lancer-color-primary, #b23b3b);
        border-radius: 4px;
        flex-direction: column;
        color: #e0e0e0;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      #talent-damage-hud .lancer-header.lancer-talent {
        background: #2b3342;
        color: #fff;
        padding: 6px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .talent-body {
        padding: 8px;

        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .talent-item-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .talent-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .talent-info {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }

      .talent-icon {
        width: 24px;
        height: 24px;
        border-radius: 3px;
        object-fit: cover;
      }

      .talent-name-rank {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .talent-name {
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #f0f0f0;
      }

      .talent-rank-badge {
        font-size: 11px;
        color: #aaa;
      }

      .talent-info-btn {
        background: none;
        border: none;
        color: #88aaff;
        cursor: pointer;
        padding: 2px 4px;
        font-size: 14px;
        line-height: 1;
        transition: color 0.15s;
      }

      .talent-info-btn:hover {
        color: #ffd700;
      }

      .talent-damage-controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .talent-damage-type-select {
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        font-size: 11px;
        padding: 2px 4px;
        max-width: 80px;
      }

      .talent-bonus-input-group {
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .talent-bonus-val-input {
        width: 60px;
        max-width: 70px;
        height: 22px;
        padding: 1px 4px;
        font-size: 12px;
        text-align: center;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        color: #fff;
      }

      .preset-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.15s;
      }

      .preset-btn.add-btn {
        width: 22px;
        height: 22px;
        line-height: 18px;
        text-align: center;
        padding: 0;
        font-size: 14px;
      }

      .preset-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        color: #ffd700;
      }

      .talent-applied-bonus-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 2px;
      }

      .bonus-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(178, 59, 59, 0.3);
        border: 1px solid var(--lancer-color-primary, #b23b3b);
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: bold;
        color: #fff;
      }

      .tag-remove-btn {
        background: none;
        border: none;
        color: #ff8888;
        cursor: pointer;
        padding: 0 2px;
        font-size: 13px;
        line-height: 1;
        font-weight: bold;
      }

      .tag-remove-btn:hover {
        color: #ff3333;
      }

      :global(.talent-description-box) {
        padding: 6px;
        color: #e0e0e0;
        font-size: 11px;
        line-height: 1.4;
      }

      :global(.talent-description-box .popup-title) {
        margin: 0 0 6px 0;
        color: #8f0000ff;
        font-size: 24px;
        font-weight: bold;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding-bottom: 4px;
      }

      :global(.talent-description-box .talent-ranks-list) {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 16px;
      }

      :global(.talent-description-box .talent-rank-item) {
        background: rgba(255, 255, 255, 0.04);
        padding: 4px;
        border-radius: 2px;
        border-left: 3px solid var(--lancer-color-primary, #b23b3b);
      }
    }
  }
</style>
