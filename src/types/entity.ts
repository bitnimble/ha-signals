import { HassEntity } from 'home-assistant-js-websocket';
import { match } from 'ts-pattern';
import { Signal } from '@/signal';
import { DomainId, Entities, EntityId } from '@/types/schema';

export type OnOff = 'on' | 'off';

type EntityStates = {
  ['light']: OnOff;
  ['binary_sensor']: OnOff;
  ['input_boolean']: boolean;
  ['sensor']: string;
};
export type EntityState<D extends DomainId> = D extends keyof EntityStates
  ? EntityStates[D]
  : string;

export type RawEntity<
  D extends DomainId,
  Id extends Entities[D] = Entities[D],
  A extends {} = {},
> = {
  id: Id;
  domain: D;
  state?: EntityState<D>;
  lastChanged: Date;
  attributes: A;
};

export function convertHassEntity(hassEntity: HassEntity): RawEntity<DomainId> {
  const domain = hassEntity.entity_id.substring(0, hassEntity.entity_id.indexOf('.')) as DomainId;
  const state =
    hassEntity.state === 'unavailable' || hassEntity.state === 'unknown'
      ? undefined
      : match(domain)
          .with('input_boolean', () => (hassEntity.state === 'on' ? true : false))
          .otherwise(() => hassEntity.state);
  return {
    id: hassEntity.entity_id as EntityId,
    domain,
    state,
    lastChanged: new Date(hassEntity.last_updated), // last_updated = state or attribute change, last_changed = state change only
    attributes: hassEntity.attributes,
  };
}

export class Entity<D extends DomainId, Id extends Entities[D] = Entities[D], A extends {} = {}> {
  readonly id: Id;
  readonly domain: D;

  private entity: Signal.State<RawEntity<D, Id, A>>;
  private rawEntity: RawEntity<D, Id, A>;
  private computedState = new Signal.Computed(() => this.entity.get().state);
  private computedAttributes = new Signal.Computed(() => this.entity.get().attributes);
  private computedLastChanged = new Signal.Computed(() => this.entity.get().lastChanged);

  constructor(initialState: RawEntity<D, Id, A>) {
    this.entity = new Signal.State(initialState);
    this.rawEntity = initialState;
    this.domain = initialState.domain;
    this.id = initialState.id;
  }

  set(e: RawEntity<D, Id, A>) {
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
