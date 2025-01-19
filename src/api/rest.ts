import { globals } from 'globals';
import { RawEntity } from 'types/entity';
import { Domain, DomainId, EntityId, Service } from 'types/schema';

const API_URL = globals.hassUrl + '/api';
const headers = {
  'Authorization': `Bearer ${globals.authToken}`,
  'Content-Type': 'application/json',
};

export async function getStates(): Promise<RawEntity<DomainId>[]> {
  const resp = (await fetch(API_URL + '/states', {
    headers,
  }).then((r) => r.json())) as {
    attributes: any;
    entity_id: string;
    last_changed: string;
    state: any;
  }[];

  return resp.map((state) => {
    const prefix = state.entity_id.substring(0, state.entity_id.indexOf('.'));
    return {
      id: state.entity_id as EntityId,
      domain: prefix as DomainId,
      attributes: state.attributes,
      lastChanged: new Date(state.last_changed),
      state: state.state,
    };
  });
}

export async function getServices() {
  return await fetch(API_URL + '/services', {
    headers,
  }).then((r) => r.json());
}

export async function callService<
  D extends DomainId,
  S extends Domain<D>['services'][number]['id'],
>(domain: D, service: S, target: Service<D, S>['target'], data?: Service<D, S>['data']) {
  const resp = await fetch(API_URL + `/services/${domain}/${service}`, {
    headers,
    method: 'POST',
    body: JSON.stringify({
      ...data,
      ['entity_id']: target,
    }),
  }).then((r) => r.json());
}
