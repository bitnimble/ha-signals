import { TZDate } from '@date-fns/tz';
import { now, time } from 'base/time';
import { EntityStore } from 'store';
import { Service } from 'types/schema';

export function isLightsOut(entityStore: EntityStore) {
  const sunriseState = entityStore.get('sensor.sun_next_rising').state;
  const start = '2300';
  const end = sunriseState ? time(new TZDate(sunriseState, 'Australia/Sydney')) : '0700';
  return time(now()) > start || time(now()) < end;
}

export const LightColor: Record<string, Service<'light', 'turn_on'>['data']> = {
  BLUE: { rgb_color: [57, 80, 255], brightness: 97 },
  WHITE: { rgb_color: [255, 255, 165], brightness: 54 },
  YELLOW: { rgb_color: [255, 207, 35], brightness: 97 },
  ORANGE: { rgb_color: [255, 127, 36], brightness: 97 },
  RED: { rgb_color: [230, 3, 47], brightness: 97 },
  BRIGHT_RED: { rgb_color: [255, 30, 50], brightness: 178 },
};
