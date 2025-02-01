import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { Signal } from '../signal';

const timeStore = new Signal.State({
  currentTime: new TZDate(new Date(), 'Australia/Sydney'),
});
let updaterInterval: NodeJS.Timeout | undefined;
function setupTimeUpdater() {
  if (updaterInterval) {
    return;
  }
  // Update the time store every minute
  updaterInterval = setInterval(() => {
    timeStore.set({
      currentTime: new TZDate(new Date(), 'Australia/Sydney'),
    });
  }, 60 * 1000);
}
setupTimeUpdater();

export function time(d: TZDate) {
  return format(d, 'HHmm');
}

export function now() {
  return timeStore.get().currentTime;
}
