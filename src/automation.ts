import { HassWebsocket } from './api/websocket';
import { Signal } from './signal';
import { EntityStore } from './store';

global.WebSocket = require('ws');

export type HassAutomation = {
  name: string;
  init?: (hassWs: HassWebsocket, entityStore: EntityStore) => void | Promise<void>;
  effect: (hassWs: HassWebsocket, entityStore: EntityStore) => void | Promise<void>;
  debounceMs?: number;
};

export class HassAutomations {
  entityStore = new EntityStore();
  private hassWs?: HassWebsocket;
  private automations: HassAutomation[] = [];
  constructor(initialAutomations?: HassAutomation[]) {
    if (initialAutomations) {
      this.automations.push(...initialAutomations);
    }
  }

  async init() {
    this.entityStore = new EntityStore();
    this.hassWs?.close();

    await this.entityStore.reloadStates();
    this.hassWs = new HassWebsocket(this.entityStore);
    await this.hassWs.connect();
    for (const automation of this.automations) {
      automation.init?.(this.hassWs, this.entityStore);
      Signal.effect(() => automation.effect(this.hassWs!, this.entityStore), {
        debounceMs: automation.debounceMs,
      });
      console.log(`Registered ${automation.name}`);
    }
  }

  addAutomations(...automations: HassAutomation[]) {
    this.automations.push(...automations);
  }
}
