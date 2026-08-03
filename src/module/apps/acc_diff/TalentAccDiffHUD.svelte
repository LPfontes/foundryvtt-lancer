<script lang="ts">
  import { onDestroy } from "svelte";
  import tippy, { type Instance } from "tippy.js";
  import { type AccDiffHudData, getPilotTalents } from "./data.svelte";
  import type { LancerTALENT } from "../../item/lancer-item";

  /* ===== PROPS ===== */

  let {
    data,
  }: {
    data: AccDiffHudData;
  } = $props();

  /* ===== DERIVED VALUES ===== */

  const lancerActor = $derived(data.lancerActor);
  const base = $derived(data.base);
  const talents = $derived(getPilotTalents(lancerActor));
  const pilotName = $derived(
    lancerActor?.is_mech() ? lancerActor.system.pilot?.value?.name || "Pilot" : lancerActor?.name || "Pilot"
  );

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

  function getTalentAcc(lid: string): number {
    return base.talentModifiers[lid]?.accuracy || 0;
  }

  function getTalentDiff(lid: string): number {
    return base.talentModifiers[lid]?.difficulty || 0;
  }

  function setTalentAcc(talent: LancerTALENT, delta: number) {
    const lid = talent.system.lid || talent.id || talent.name;
    const currentAcc = getTalentAcc(lid);
    const currentDiff = getTalentDiff(lid);
    const newAcc = Math.max(0, currentAcc + delta);

    if (newAcc === 0 && currentDiff === 0) {
      delete base.talentModifiers[lid];
    } else {
      base.talentModifiers[lid] = {
        lid,
        name: talent.name,
        accuracy: newAcc,
        difficulty: currentDiff,
      };
    }
  }

  function setTalentDiff(talent: LancerTALENT, delta: number) {
    const lid = talent.system.lid || talent.id || talent.name;
    const currentAcc = getTalentAcc(lid);
    const currentDiff = getTalentDiff(lid);
    const newDiff = Math.max(0, currentDiff + delta);

    if (currentAcc === 0 && newDiff === 0) {
      delete base.talentModifiers[lid];
    } else {
      base.talentModifiers[lid] = {
        lid,
        name: talent.name,
        accuracy: currentAcc,
        difficulty: newDiff,
      };
    }
  }
</script>

{#if talents.length > 0}
  <div id="talent-accdiff-hud" class="lancer lancer-hud accdiff talent-hud window-content">
    <div class="lancer-header lancer-talent medium">
      <i class="fas fa-award i--4 i--light"></i>
      <span>{game.i18n.format("lancer.talent_hud.title", { name: pilotName })}</span>
    </div>

    <div class="lancer-hud-body talent-body">
      {#each talents as talent (talent.id || talent.system.lid)}
        {@const lid = talent.system.lid || talent.id || talent.name}
        {@const acc = getTalentAcc(lid)}
        {@const diff = getTalentDiff(lid)}

        <div class="talent-item-card">
          <div class="talent-row">
            <div class="talent-info">
              {#if talent.img}
                <img src={talent.img} alt={talent.name} class="talent-icon">
              {/if}
              <div class="talent-name-rank">
                <span class="talent-name">{talent.name}</span>
                <span class="talent-rank-badge">{
                  game.i18n.format("lancer.talent_hud.rank_badge", { rank: talent.system.curr_rank || 1 })
                }</span>
              </div>

              <!-- Hidden Content Container for Floating Tippy Popup -->
              <div id="talent-popup-{lid}" style="display: none">
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
                use:initTippy={`talent-popup-${lid}`}
              >
                <i class="fas fa-info-circle"></i>
              </button>
            </div>

            <div class="talent-controls">
              <!-- Accuracy control -->
              <div class="talent-modifier-control acc">
                <span class="mod-label">{game.i18n.localize("lancer.talent_hud.acc_label")}</span>
                <button
                  type="button"
                  class="mod-btn"
                  disabled={acc <= 0}
                  onclick={() => setTalentAcc(talent, -1)}
                >
                  -
                </button>
                <span class="mod-val" class:active={acc > 0}>+{acc}</span>
                <button
                  type="button"
                  class="mod-btn"
                  onclick={() => setTalentAcc(talent, 1)}
                >
                  +
                </button>
              </div>

              <!-- Difficulty control -->
              <div class="talent-modifier-control diff">
                <span class="mod-label">{game.i18n.localize("lancer.talent_hud.diff_label")}</span>
                <button
                  type="button"
                  class="mod-btn"
                  disabled={diff <= 0}
                  onclick={() => setTalentDiff(talent, -1)}
                >
                  -
                </button>
                <span class="mod-val" class:active={diff > 0}>-{diff}</span>
                <button
                  type="button"
                  class="mod-btn"
                  onclick={() => setTalentDiff(talent, 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      {/each}

      {#if base.talentAccuracy > 0 || base.talentDifficulty > 0}
        <div class="talent-total-summary">
          <span>{game.i18n.localize("lancer.talent_hud.summary_label")}</span>
          {#if base.talentAccuracy > 0}
            <span class="summary-acc">{
              game.i18n.format("lancer.talent_hud.summary_acc", { acc: base.talentAccuracy })
            }</span>
          {/if}
          {#if base.talentDifficulty > 0}
            <span class="summary-diff">{
              game.i18n.format("lancer.talent_hud.summary_diff", { diff: base.talentDifficulty })
            }</span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @layer lancer {
    @layer applications {
      #talent-accdiff-hud {
        background: rgba(20, 24, 33, 0.95);
        border: 1px solid var(--lancer-color-primary, #b23b3b);
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      #talent-accdiff-hud .lancer-header.lancer-talent {
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
        font-size: 10px;
        color: #aaa;
      }

      .talent-info-btn {
        background: none;
        border: none;
        color: #88aaff;
        cursor: pointer;
        padding: 2px 4px;
        font-size: 13px;
        line-height: 1;
        transition: color 0.15s;
      }

      .talent-info-btn:hover {
        color: #ffd700;
      }

      .talent-controls {
        display: flex;
        gap: 6px;
      }

      .talent-modifier-control {
        display: flex;
        align-items: center;
        gap: 2px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
        padding: 2px 4px;
      }

      .mod-label {
        font-size: 10px;
        font-weight: bold;
        margin-right: 2px;
        color: #888;
      }

      .talent-modifier-control.acc .mod-label {
        color: #4caf50;
      }

      .talent-modifier-control.diff .mod-label {
        color: #f44336;
      }

      .mod-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        width: 18px;
        height: 18px;
        line-height: 16px;
        text-align: center;
        border-radius: 2px;
        cursor: pointer;
        padding: 0;
        font-size: 12px;
        font-weight: bold;
      }

      .mod-btn:disabled {
        opacity: 0.3;
        cursor: default;
      }

      .mod-btn:not(:disabled):hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .mod-val {
        font-size: 16px;
        font-weight: bold;
        min-width: 16px;
        text-align: center;
      }

      .mod-val.active {
        color: #fff;
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

      .talent-total-summary {
        display: flex;
        gap: 8px;
        align-items: center;
        background: rgba(0, 0, 0, 0.4);
        padding: 6px 8px;
        border-radius: 3px;
        font-weight: bold;
        margin-top: 4px;
      }

      .summary-acc {
        color: #4caf50;
      }

      .summary-diff {
        color: #f44336;
      }
    }
  }
</style>
