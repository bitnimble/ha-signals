import { Signal } from 'signal';
import { DomainId, Entities } from 'types/schema';

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
  state: EntityState<D>;
  lastChanged: Date;
  attributes: A;
};

export class Entity<D extends DomainId, Id extends Entities[D] = Entities[D], A extends {} = {}> {
  readonly id: Id;
  readonly domain: D;

  private entity: Signal.State<RawEntity<D, Id, A>>;
  private computedState = new Signal.Computed(() => this.entity.get().state);
  private computedAttributes = new Signal.Computed(() => this.entity.get().attributes);
  private computedLastChanged = new Signal.Computed(() => this.entity.get().lastChanged);

  constructor(initialState: RawEntity<D, Id, A>) {
    this.entity = new Signal.State(initialState);
    this.domain = initialState.domain;
    this.id = initialState.id;
  }

  set(e: RawEntity<D, Id, A>) {
    this.entity.set(e);
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
