import { HassEntity } from 'home-assistant-js-websocket';
import { globals } from '../globals';
import { Schema } from '../types/base';
import { convertHassEntity, RawEntity } from '../types/entity';

const API_URL = globals.hassUrl + '/api';
const headers = {
  'Authorization': `Bearer ${globals.authToken}`,
  'Content-Type': 'application/json',
};

export async function getStates<S extends Schema>(): Promise<RawEntity<S>[]> {
  const resp = (await fetch(API_URL + '/states', {
    headers,
  }).then((r) => r.json())) as HassEntity[];

  return resp.map(convertHassEntity<S>);
}

export async function callService(
  domain: string,
  service: string,
  target: string | string[] | null,
  data?: object
) {
  await fetch(API_URL + `/services/${domain}/${service}`, {
    headers,
    method: 'POST',
    body:
      target == null
        ? JSON.stringify(data)
        : JSON.stringify({
            ['entity_id']: target,
            ...data,
          }),
  });
}
