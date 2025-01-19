import { callService } from 'api/rest';
import { Signal } from 'signal';
import { Entity } from 'types/entity';

export function createMotionLight(sensor: Entity<'binary_sensor'>, light: Entity<'light'>) {
  Signal.effect(() => {
    callService('light', 'toggle', light.id, { brightness: sensor.state === 'on' ? 255 : 0 });
  });
}
