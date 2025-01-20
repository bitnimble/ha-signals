import { HassEntity } from 'home-assistant-js-websocket';
import { Signal } from 'signal';
import { DomainId, Entities, EntityId } from 'types/schema';

export type OnOff = 'on' | 'off';

type EntityStates = {
  ['light']: OnOff;
  ['binary_sensor']: OnOff;
  ['sensor']: number;
};
export type EntityState<D extends DomainId> = D extends keyof EntityStates ? EntityStates[D] : any;

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
  return {
    id: hassEntity.entity_id as EntityId,
    domain: hassEntity.entity_id.substring(0, hassEntity.entity_id.indexOf('.')) as DomainId,
    state: hassEntity.state, // TODO: parsing for numbers, booleans, etc
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

  get attributes() {
    return this.computedAttributes.get();
  }

  get lastChanged() {
    return this.computedLastChanged.get();
  }
}
