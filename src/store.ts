import { getStates } from '@/api/rest';
import { Entity, RawEntity } from '@/types/entity';
import { DomainForEntity, DomainId, Entities, EntityId } from '@/types/schema';

export class EntityStore {
  private statesById = new Map<EntityId, Entity<DomainId>>();

  async reloadStates() {
    const states = await getStates();
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

  get<E extends EntityId>(id: E): Entity<DomainForEntity[E]> {
    const existing = this.statesById.get(id);
    if (existing) {
      return existing as Entity<DomainForEntity[E]>;
    }

    const preEntity = new Entity<DomainForEntity[E]>({
      id: id as any as Entities[DomainForEntity[E]],
      domain: id.substring(0, id.indexOf('.')) as DomainForEntity[E],
      attributes: {},
      lastChanged: new Date(),
      state: undefined,
    });
    this.statesById.set(id, preEntity);
    return preEntity;
  }

  setState(id: EntityId, entity: RawEntity<DomainId>) {
    const existing = this.statesById.get(id);
    if (existing) {
      existing.set(entity);
    } else {
      this.statesById.set(id, new Entity(entity));
    }
  }

  deleteState(id: EntityId) {
    const existing = this.statesById.get(id);
    if (existing) {
      existing.set({
        id: existing.id,
        domain: existing.domain,
        attributes: {},
        lastChanged: new Date(),
        state: undefined,
      });
      this.statesById.delete(id);
    }
  }
}
