export type DomainId = string;
export type EntityId = string;

export type Attributes<D extends DomainId, E extends EntityId> = Record<
  D,
  Record<E, Record<string, unknown>>
>;

export type Entities = { [D in DomainId]: { entityId: string } };

export type DomainForEntity<E extends EntityId, D extends DomainId> = Record<E, D>;

export type Schema<D extends DomainId = DomainId, E extends EntityId = EntityId> = {
  DomainId: D;
  EntityId: E;
  Entities: Entities;
  DomainForEntity: DomainForEntity<E, D>;
  Attributes: Attributes<D, E>;
};
