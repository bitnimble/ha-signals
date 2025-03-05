import { HassWebsocket } from './api/websocket';
import { Signal } from './signal';
import { EntityStore } from './store';

global.WebSocket = require('ws');

export type HassAutomation = {
  name: string;
  init?: (entityStore: EntityStore, hassWs: HassWebsocket) => void | Promise<void>;
  effect: (entityStore: EntityStore, hassWs: HassWebsocket) => void | Promise<void>;
  debounceMs?: number;
};

export class HassAutomations {
  private entityStore = new EntityStore();
  private hassWs?: HassWebsocket;
  constructor(private readonly automations: HassAutomation[]) {}

  async init() {
    this.entityStore = new EntityStore();
    this.hassWs?.close();

    await this.entityStore.reloadStates();
    this.hassWs = new HassWebsocket(this.entityStore);
    await this.hassWs.connect();
    for (const automation of this.automations) {
      automation.init?.(this.entityStore, this.hassWs);
      Signal.effect(() => automation.effect(this.entityStore, this.hassWs!), {
        debounceMs: automation.debounceMs,
      });
      console.log(`Registered ${automation.name}`);
    }
  }
}
