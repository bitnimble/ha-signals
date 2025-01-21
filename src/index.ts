import { HassWebsocket } from 'api/websocket';
import { AmberPrice } from 'automations/amber_price';
import { HallwayNightLight } from 'automations/hallway_night_light';
import { WorkshopMotion } from 'automations/workshop_motion';
import { Signal } from 'signal';
import { EntityStore } from 'store';

global.WebSocket = require('ws');

export type Automation = {
  name: string;
  init?: (entityStore: EntityStore, hassWs: HassWebsocket) => void | Promise<void>;
  effect: (entityStore: EntityStore, hassWs: HassWebsocket) => void | Promise<void>;
};

class Automations {
  private entityStore = new EntityStore();
  private hassWs?: HassWebsocket;
  constructor(private readonly automations: Automation[]) {}

  async init() {
    this.entityStore = new EntityStore();
    this.hassWs?.close();

    this.entityStore.reloadStates();
    this.hassWs = new HassWebsocket(this.entityStore);
    await this.hassWs.connect();
    for (const automation of this.automations) {
      automation.init?.(this.entityStore, this.hassWs);
      Signal.effect(() => automation.effect(this.entityStore, this.hassWs!));
      console.log(`Registered ${automation.name}`);
    }
  }
}

const automations = new Automations([AmberPrice, HallwayNightLight, WorkshopMotion]);
automations.init();
