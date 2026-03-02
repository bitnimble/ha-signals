import { getStates } from './api/rest';
import { Schema } from './types/base';
import { Entity, RawEntity } from './types/entity';

export class EntityStore<S extends Schema> {
  private statesById = new Map<S['EntityId'], Entity<S>>();

  async reloadStates() {
    const states = await getStates<S>();
    const remaining = new Set(this.statesById.keys());
    for (const state of states) {
      const existing = this.statesById.get(state.id);
      if (existing != null) {
        existing.set(state);
      } else {
        this.statesById.set(state.id, new Entity(state));
      }
      remaining.delete(state.id);
    }

    for (const id of remaining) {
      this.deleteState(id);
    }
  }

  get<
    Id extends S['EntityId'],
    D extends S['DomainForEntity'][Id] = S['DomainForEntity'][Id],
    A extends S['Attributes'][D][Id] = S['Attributes'][D][Id],
  >(id: Id): Entity<S, D, Id, A> {
    const existing = this.statesById.get(id);
    if (existing) {
      return existing as Entity<S, D, Id, A>;
    }

    const preEntity = new Entity<S, D, Id, A>({
      id: id as Id,
      domain: id.substring(0, id.indexOf('.')) as D,
      attributes: undefined,
      lastChanged: new Date(),
      state: undefined,
    });
    this.statesById.set(id, preEntity);
    return preEntity;
  }

  setState(id: S['EntityId'], entity: RawEntity<S>) {
    const existing = this.statesById.get(id);
    if (existing) {
      existing.set(entity);
    } else {
      this.statesById.set(id, new Entity(entity));
    }
  }

  deleteState(id: S['EntityId']) {
    const existing = this.statesById.get(id);
    if (existing) {
      existing.set({
        id: existing.id,
        domain: existing.domain,
        attributes: undefined,
        lastChanged: new Date(),
        state: undefined,
      });
      this.statesById.delete(id);
    }
  }
}
