import { AccDiffHudData, getPilotTalents } from "../acc_diff";
import type { StructStressData } from "../struct_stress/data.svelte";
import { DamageHudData } from "../damage";
import { isDamageTalent } from "../damage/talent-filter";
import { mount } from "svelte";

// TODO: Find a better type for this
let hud: ReturnType<typeof mount>;
// Look - I don't really know enough typescript to get it right,
// but these will hold the success/reject of any
let activeCallbacks: Record<keyof HUDData, null | [(value: any) => any, () => any]> = {
  hase: null,
  attack: null,
  damage: null,
  struct: null,
  stress: null,
  talent: null,
  talentDamage: null,
};

export async function attach() {
  if (!hud) {
    let HUDZone = (await import("./SlidingHUDZone.svelte")).default;
    const events: Record<string, (e: any) => any> = {};
    for (const key of ["attack", "damage", "hase", "struct", "stress", "talent", "talentDamage"] as Array<
      keyof HUDData
    >) {
      events[`${key}.submit`] = (ev: any) => {
        activeCallbacks[key]?.[0](ev.detail);
        activeCallbacks[key] = null;
      };
      events[`${key}.cancel`] = () => {
        activeCallbacks[key]?.[1]();
        activeCallbacks[key] = null;
      };
    }
    hud = mount(HUDZone, {
      target: document.body,
      events,
      props: { faded: false },
    });
  }
  return hud;
}

export async function openSlidingHud<T extends keyof HUDData>(key: T, data: HUDData[T]): Promise<HUDData[T]> {
  hud = await attach();

  // open the hud, cancelling existing listeners
  hud.open(key, data);

  if ((key === "attack" || key === "hase") && data instanceof AccDiffHudData) {
    const talents = getPilotTalents(data.lancerActor);
    if (talents.length > 0) {
      hud.open("talent", data);
    } else {
      hud.close("talent");
    }
  }

  if (key === "damage" && data instanceof DamageHudData) {
    const talents = getPilotTalents(data.lancerActor).filter(isDamageTalent);
    if (talents.length > 0) {
      hud.open("talentDamage", data);
    } else {
      hud.close("talentDamage");
    }
  }

  return new Promise((resolve, reject) => {
    activeCallbacks[key] = [resolve, reject];
  });
}

export async function isHudOpen(key: keyof HUDData): Promise<boolean> {
  let hud = await attach();
  return hud.isOpen(key);
}

export async function fade(dir: "out" | "in" = "out") {
  let hud = await attach();
  hud.fade(dir);
}

type HUDData = {
  hase: AccDiffHudData;
  attack: AccDiffHudData;
  damage: DamageHudData;
  struct: StructStressData;
  stress: StructStressData;
  talent: AccDiffHudData;
  talentDamage: DamageHudData;
};
