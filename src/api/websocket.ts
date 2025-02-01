import {
  Connection,
  createConnection,
  createLongLivedTokenAuth,
  StateChangedEvent,
} from 'home-assistant-js-websocket';
import { globals } from '../globals';
import { EntityStore } from '../store';
import { convertHassEntity } from '../types/entity';
import { DeviceName, deviceNameMap, DeviceTriggers, EntityId } from '../types/schema';

export class HassWebsocket {
  connection?: Connection;

  constructor(private readonly store: EntityStore) {}

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
      const entityId = e.data.entity_id as EntityId;
      if (!e.data.new_state) {
        this.store.deleteState(entityId);
        return;
      }
      this.store.setState(entityId, convertHassEntity(e.data.new_state));
    }, 'state_changed');
  }

  createTrigger<D extends DeviceName, F extends () => void | Promise<void>>(
    device: D,
    trigger: DeviceTriggers<D>,
    fn: F
  ) {
    if (!this.connection) {
      throw new Error('Websocket connection was not alive');
    }
    const deviceId = deviceNameMap.get(device);
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

  close() {
    this.connection?.close();
  }
}

type TriggerEvent = {
  variables: {
    trigger: {};
  };
};
