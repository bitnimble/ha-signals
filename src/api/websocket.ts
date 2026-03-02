import {
  Connection,
  createConnection,
  createLongLivedTokenAuth,
  StateChangedEvent,
} from 'home-assistant-js-websocket';
import { EntityDefinition } from '../define';
import { globals } from '../globals';
import { EntityStore } from '../store';
import { Schema } from '../types/base';
import { convertHassEntity } from '../types/entity';

export type RegisterEntitiesResult = {
  entities: Record<string, string | null>;
};

export class HassWebsocket<S extends Schema> {
  connection?: Connection;

  constructor(
    private readonly store: EntityStore<S>,
    private readonly deviceNameMap: Map<string, string>
  ) {}

  async connect() {
    const auth = createLongLivedTokenAuth(globals.hassUrl, globals.authToken);
    this.connection = await createConnection({ auth });
    this.subscribeToStateChanges();
  }

  get isConnected() {
    return this.connection && this.connection.connected;
  }

  subscribeToStateChanges() {
    if (!this.connection) {
      throw new Error('Websocket connection was not alive');
    }
    this.connection.subscribeEvents<StateChangedEvent>((e) => {
      const entityId = e.data.entity_id as S['EntityId'];
      if (!e.data.new_state) {
        this.store.deleteState(entityId);
        return;
      }
      this.store.setState(entityId, convertHassEntity(e.data.new_state));
    }, 'state_changed');
  }

  createTrigger<D extends string, T extends string, F extends () => void | Promise<void>>(
    device: D,
    trigger: T,
    fn: F
  ) {
    if (!this.connection) {
      throw new Error('Websocket connection was not alive');
    }
    const deviceId = this.deviceNameMap.get(device);
    if (!deviceId) {
      throw new Error('Unknown device name' + device);
    }
    const type = trigger.substring(0, trigger.indexOf('.'));
    const subtype = trigger.substring(trigger.indexOf('.') + 1);
    this.connection.subscribeMessage<TriggerEvent>(
      (event) => {
        fn();
      },
      {
        type: 'subscribe_trigger',
        trigger: {
          trigger: 'device',
          domain: 'mqtt',
          device_id: deviceId,
          type,
          subtype,
        },
      }
    );
  }

  async registerEntities(definitions: EntityDefinition[]): Promise<RegisterEntitiesResult> {
    if (!this.connection) {
      throw new Error('Websocket connection was not alive');
    }
    return this.connection.sendMessagePromise<RegisterEntitiesResult>({
      type: 'ha_signals/register',
      entities: definitions.map((d) => ({
        type: d.type,
        id: d.id,
        name: d.name,
        icon: d.icon,
        config: d.config,
      })),
    });
  }

  async pushEntityState(
    id: string,
    state: unknown,
    attributes?: Record<string, unknown>
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('Websocket connection was not alive');
    }
    await this.connection.sendMessagePromise({
      type: 'ha_signals/state',
      entity_id: id,
      state,
      attributes,
    });
  }

  async getRegisteredEntities(): Promise<{ entities: EntityDefinition[] }> {
    if (!this.connection) {
      throw new Error('Websocket connection was not alive');
    }
    return this.connection.sendMessagePromise({
      type: 'ha_signals/get_registered',
    });
  }

  close() {
    this.connection?.close();
  }
}

type TriggerEvent = {
  variables: {
    trigger: {};
  };
};
