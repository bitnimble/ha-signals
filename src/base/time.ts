import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

export function time(d: TZDate) {
  return format(d, 'HHmm');
}

export function now() {
  return new TZDate(new Date(), 'Australia/Sydney');
}
