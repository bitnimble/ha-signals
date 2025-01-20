import { callService } from 'api/rest';
import { HassWebsocket } from 'api/websocket';
import { DeviceName, DeviceTriggers, Entities } from 'types/schema';

export function createButtonLight<D extends DeviceName>(
  hassWs: HassWebsocket,
  triggerDevice: D,
  trigger: DeviceTriggers<D>,
  light: Entities['light']
) {
  hassWs.createTrigger(triggerDevice, trigger, () => {
    callService('light', 'toggle', light);
  });
}
