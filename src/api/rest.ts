import { HassEntity } from 'home-assistant-js-websocket';
import { globals } from '../globals';
import { convertHassEntity, RawEntity } from '../types/entity';
import { Domain, DomainId, Service } from '../types/schema';

const API_URL = globals.hassUrl + '/api';
const headers = {
  'Authorization': `Bearer ${globals.authToken}`,
  'Content-Type': 'application/json',
};

export async function getStates(): Promise<RawEntity<DomainId>[]> {
  const resp = (await fetch(API_URL + '/states', {
    headers,
  }).then((r) => r.json())) as HassEntity[];

  return resp.map(convertHassEntity);
}

export async function callService<
  D extends DomainId,
  S extends Domain<D>['services'][number]['id'],
>(domain: D, service: S, target: Service<D, S>['target'], data?: Service<D, S>['data']) {
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
