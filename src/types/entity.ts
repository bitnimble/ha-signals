import { HassEntity } from 'home-assistant-js-websocket';
import { match } from 'ts-pattern';
import { Signal } from '../signal';
import { Schema } from './base';

export type OnOff = 'on' | 'off';

type _EntityStates = {
  ['light']: OnOff;
  ['binary_sensor']: OnOff;
  ['input_boolean']: boolean;
  ['sensor']: string;
};
export type EntityState<S extends Schema, D extends S['DomainId']> = D extends keyof _EntityStates
  ? _EntityStates[D]
  : string;
export type EntityStates = _EntityStates[keyof _EntityStates];

export type RawEntity<
  S extends Schema,
  D extends S['DomainId'] = S['DomainId'],
  Id extends S['Entities'][D]['entityId'] = S['Entities'][D]['entityId'],
  A extends S['Attributes'][D][Id] = S['Attributes'][D][Id],
> = {
  id: Id;
  domain: D;
  state?: EntityState<S, D>;
  lastChanged: Date;
  attributes?: A;
};

export function convertHassEntity<
  S extends Schema,
  Id extends S['EntityId'] = S['EntityId'],
  D extends S['DomainForEntity'][S['EntityId']] = S['DomainForEntity'][Id],
  A extends S['Attributes'][D][Id] = S['Attributes'][D][Id],
>(hassEntity: HassEntity): RawEntity<S> {
  const domain = hassEntity.entity_id.substring(0, hassEntity.entity_id.indexOf('.'));
  const state =
    hassEntity.state === 'unavailable' || hassEntity.state === 'unknown'
      ? undefined
      : match(domain)
          .with('input_boolean', () => (hassEntity.state === 'on' ? true : false))
          .otherwise(() => hassEntity.state);
  return {
    id: hassEntity.entity_id as Id,
    domain: domain as D,
    state: state as EntityState<S, D>,
    lastChanged: new Date(hassEntity.last_updated), // last_updated = state or attribute change, last_changed = state change only
    attributes: hassEntity.attributes as A,
  };
}

export class Entity<
  S extends Schema,
  D extends S['DomainId'] = S['DomainId'],
  Id extends S['Entities'][D]['entityId'] = S['Entities'][D]['entityId'],
  A extends S['Attributes'][D][Id] = S['Attributes'][D][Id],
  R extends RawEntity<S, D, Id, A> = RawEntity<S, D, Id, A>,
> {
  readonly id: Id;
  readonly domain: D;

  private entity: Signal.State<R>;
  private rawEntity: R;
  private computedState = new Signal.Computed(() => this.entity.get().state);
  private computedAttributes = new Signal.Computed(() => this.entity.get().attributes);
  private computedLastChanged = new Signal.Computed(() => this.entity.get().lastChanged);

  constructor(initialState: R) {
    this.entity = new Signal.State(initialState);
    this.rawEntity = initialState;
    this.domain = initialState.domain;
    this.id = initialState.id;
  }

  set(e: R) {
    this.entity.set(e);
    this.rawEntity = e;
  }

  getRawEntity() {
    return this.rawEntity;
  }

  get state() {
    return this.computedState.get();
  }

  get numericState() {
    const numericState = Number(this.state);
    return isNaN(numericState) ? undefined : numericState;
  }

  get attributes() {
    return this.computedAttributes.get();
  }

  get lastChanged() {
    return this.computedLastChanged.get();
  }
}
