import { getStates } from 'api/rest';
import { Entity } from 'types/entity';
import { DomainId, EntityId } from 'types/schema';

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
      const entity = this.statesById.get(id)!;
      entity.set({
        id: entity.id,
        domain: entity.domain,
        attributes: {},
        lastChanged: new Date(),
        state: undefined,
      });
      this.statesById.delete(id);
    }
  }

  getState(id: EntityId) {
    return this.statesById.get(id);
  }
}
