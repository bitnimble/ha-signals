import { HassWebsocket } from './api/websocket';
import { entityRegistry } from './define';
import { Signal } from './signal';
import { EntityStore } from './store';
import { DomainId, EntityId, Schema } from './types/base';

global.WebSocket = require('ws');

export type HassAutomation<S extends Schema> = {
  name: string;
  init?: (hassWs: HassWebsocket<S>, entityStore: EntityStore<S>) => void | Promise<void>;
  effect: (hassWs: HassWebsocket<S>, entityStore: EntityStore<S>) => void | Promise<void>;
  debounceMs?: number;
};

export class HassAutomations<S extends Schema> {
  entityStore = new EntityStore<S>();
  private hassWs?: HassWebsocket<S>;
  private automations: HassAutomation<S>[] = [];
  constructor(
    private readonly deviceNameMap: Map<string, string>,
    initialAutomations?: HassAutomation<S>[]
  ) {
    if (initialAutomations) {
      this.automations.push(...initialAutomations);
    }
  }

  async init() {
    this.entityStore = new EntityStore<S>();
    this.hassWs?.close();

    await this.entityStore.reloadStates();
    this.hassWs = new HassWebsocket(this.entityStore, this.deviceNameMap);
    await this.hassWs.connect();

    // Register any defined entities with the HA Signals integration
    await this.registerDefinedEntities();

    for (const automation of this.automations) {
      automation.init?.(this.hassWs, this.entityStore);
      Signal.effect(
        () => {
          try {
            automation.effect(this.hassWs!, this.entityStore);
          } catch (e) {
            console.error(`Automation "${automation.name}" failed with the following error:\n`);
            console.error(e);
          }
        },
        {
          debounceMs: automation.debounceMs,
        }
      );
      console.log(`Registered ${automation.name}`);
    }
  }

  addAutomations(...automations: HassAutomation<S>[]) {
    this.automations.push(...automations);
  }

  /**
   * Register all defined entities with the HA Signals integration.
   * Resolves entity IDs and wires up the push-state callback on each handle.
   * Safe to call multiple times, only sends definitions not yet registered.
   */
  async registerDefinedEntities() {
    const entities = [...entityRegistry.values()];
    const definitions = entities.map((e) => e.definition);
    if (definitions.length === 0 || !this.hassWs?.connection) {
      return;
    }

    const result = await this.hassWs.registerEntities(definitions);

    // Wire up each DefinedEntity handle
    for (const entity of entities) {
      const resolvedId = result.entities[entity.definition.id];
      if (resolvedId) {
        entity.resolvedEntityId = resolvedId;
        entity._entityStore = this.entityStore;
        entity._pushState = (id, state, attributes) => {
          if (this.hassWs?.connection) {
            this.hassWs.pushEntityState(id, state, attributes);
          }
        };
      }
    }

    // Reload states so the entity store picks up the newly-created entities
    await this.entityStore.reloadStates();
  }
}
