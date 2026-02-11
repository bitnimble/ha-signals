import { callService } from './api/rest';
import { Signal } from './signal';
import { EntityStore } from './store';
import { Attributes, DomainId, EntityId } from './types/schema';
import { Entity, EntityState } from './types/entity';

/**
 * Options for defining an input_boolean entity
 */
export type InputBooleanOptions = {
  /**
   * The unique identifier for the entity (e.g., 'input_boolean.my_entity')
   * If not provided, one will be generated from the name
   */
  id?: EntityId;
  /**
   * Human-readable name for the entity
   */
  name?: string;
  /**
   * Icon for the entity (e.g., 'mdi:lightbulb')
   */
  icon?: string;
  /**
   * Initial state for the entity
   */
  initialState?: boolean;
};

/**
 * A defined entity that allows setting state and attributes
 */
export class DefinedEntity<
  D extends DomainId,
  Id extends EntityId = EntityId,
  A extends Attributes<D, Id> = Attributes<D, Id>,
> {
  private entity: Entity<any, Id, any>;

  constructor(
    private readonly entityId: Id,
    private readonly store: EntityStore
  ) {
    this.entity = store.get<Id>(entityId);
  }

  /**
   * Get or set the state of the entity
   */
  get state(): EntityState<D> | undefined {
    return this.entity.state;
  }

  set state(value: EntityState<D> | undefined) {
    if (value === undefined) {
      return;
    }

    // Update local state immediately for reactivity
    const domain = this.entityId.substring(0, this.entityId.indexOf('.')) as D;

    // Convert boolean to 'on'/'off' for input_boolean
    let serviceValue: any = value;
    if (domain === 'input_boolean') {
      const service = value ? 'turn_on' : 'turn_off';
      callService('input_boolean' as any, service as any, this.entityId, undefined).catch((err) =>
        console.error(`Failed to update state for ${this.entityId}:`, err)
      );
      return;
    }

    // For other entity types, we might need different service calls
    console.warn(`State setting not fully implemented for domain: ${domain}`);
  }

  /**
   * Get or set the attributes of the entity
   */
  get attributes(): A | undefined {
    return this.entity.attributes;
  }

  set attributes(value: A | undefined) {
    if (value === undefined) {
      return;
    }

    // Update attributes via Home Assistant service
    // Note: Most entities don't support direct attribute updates via services
    // This would need to be implemented based on the specific entity domain
    console.warn(
      `Attribute setting not fully implemented. Use domain-specific services to update attributes.`
    );
  }

  /**
   * Get the entity ID
   */
  get id(): Id {
    return this.entityId;
  }

  /**
   * Get the raw entity for advanced use cases
   */
  getRawEntity(): Entity<any, Id, any> {
    return this.entity;
  }
}

/**
 * Track defined entities to ensure idempotency
 */
const definedEntities = new Map<string, DefinedEntity<any, any, any>>();

/**
 * Helper to generate entity key for tracking
 */
function getEntityKey(id: string, opts: any): string {
  return JSON.stringify({ id, opts });
}

/**
 * Define namespace for creating entities
 */
export const Define = {
  /**
   * Define an input_boolean entity
   * Redefining with the same ID and options is a no-op
   */
  inputBoolean(
    store: EntityStore,
    opts: InputBooleanOptions
  ): DefinedEntity<'input_boolean', any, any> {
    // Generate entity ID if not provided
    const entityId: EntityId = opts.id || `input_boolean.${opts.name?.toLowerCase().replace(/\s+/g, '_') || 'unnamed'}`;

    // Check if already defined with same options (idempotent)
    const key = getEntityKey(entityId, opts);
    const existing = definedEntities.get(key);
    if (existing) {
      return existing;
    }

    // Create a new defined entity
    const definedEntity = new DefinedEntity<'input_boolean', any, any>(entityId, store);

    // Store it for idempotency
    definedEntities.set(key, definedEntity);

    // Check if entity already exists in the store
    const entity = store.get(entityId);
    if (entity.state === undefined) {
      // Entity doesn't exist in Home Assistant, we should create it
      // Note: Creating input_boolean entities typically requires configuration.yaml changes
      // or using the UI. For runtime creation, we just track it locally.
      // The entity will appear once Home Assistant is configured or uses the Helpers UI.

      // Set initial state if provided
      if (opts.initialState !== undefined) {
        definedEntity.state = opts.initialState;
      }
    }

    return definedEntity;
  },
};
