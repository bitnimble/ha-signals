import { EntityStore } from './store';
import { DomainId, Schema } from './types/base';
import { EntityState } from './types/entity';

export type DefinedEntityType =
  | 'input_boolean'
  | 'input_number'
  | 'input_select'
  | 'input_text'
  | 'input_datetime'
  | 'sensor'
  | 'binary_sensor';

export type InputBooleanOpts = { name: string; icon?: string };
export type InputNumberOpts = {
  name: string;
  icon?: string;
  min?: number;
  max?: number;
  step?: number;
  unit_of_measurement?: string;
  mode?: 'auto' | 'box' | 'slider';
};
export type InputSelectOpts = { name: string; icon?: string; options: string[] };
export type InputTextOpts = {
  name: string;
  icon?: string;
  min?: number;
  max?: number;
  pattern?: string;
  mode?: 'text' | 'password';
};
export type InputDatetimeOpts = { name: string; icon?: string };
export type SensorOpts = {
  name: string;
  icon?: string;
  device_class?: string;
  unit_of_measurement?: string;
  state_class?: string;
};
export type BinarySensorOpts = {
  name: string;
  icon?: string;
  device_class?: string;
};

export type EntityDefinition = {
  type: DefinedEntityType;
  id: string;
  name: string;
  icon?: string;
  config: Record<string, unknown>;
};

export class DefinedEntity<
  S extends Schema,
  D extends S['DomainId'] = S['DomainId'],
  State extends EntityState<S, D> = EntityState<S, D>,
> {
  readonly definition: EntityDefinition;

  /**
   * Resolved HA entity ID (e.g. `switch.ha_signals_night_mode`).
   * Available after `registerDefinedEntities()` resolves.
   */
  resolvedEntityId?: S['EntityId'];

  _pushState?: (id: string, state: unknown, attributes?: Record<string, unknown>) => void;

  _entityStore?: EntityStore<S>;

  constructor(definition: EntityDefinition) {
    this.definition = definition;
  }

  get state(): State | undefined {
    if (!this._entityStore || !this.resolvedEntityId) {
      return undefined;
    }
    return this._entityStore.get(this.resolvedEntityId).state as State | undefined;
  }

  set state(value: State) {
    if (this._pushState) {
      this._pushState(this.definition.id, value as unknown, undefined);
    }
  }

  get attributes(): Record<string, unknown> | undefined {
    if (!this._entityStore || !this.resolvedEntityId) {
      return undefined;
    }
    return this._entityStore.get(this.resolvedEntityId).attributes as
      | Record<string, unknown>
      | undefined;
  }

  set attributes(value: Record<string, unknown>) {
    if (this._pushState) {
      // Send current state along with updated attributes
      const currentState = this.state;
      this._pushState(this.definition.id, currentState as unknown, value);
    }
  }
}

export const entityRegistry = new Map<string, DefinedEntity<Schema, EntityState<any, any>>>();

/**
 * Serialised representation of each entity's opts, used for deduplication.
 * If `Define.inputBoolean('x', opts)` is called again with identical opts,
 * it returns the existing handle without sending anything to the server.
 */
const entityOptsHashes = new Map<string, string>();
function hashDefinition(
  type: DefinedEntityType,
  id: string,
  opts: Record<string, unknown>
): string {
  return JSON.stringify({ type, id, ...opts });
}

function getOrCreate<D extends DefinedEntityType, S extends Schema>(
  type: D,
  id: string,
  definition: EntityDefinition
): DefinedEntity<S, D> {
  const hash = hashDefinition(type, id, definition);
  const existingHash = entityOptsHashes.get(id);

  if (existingHash != null && existingHash === hash) {
    // Exact same definition — return existing handle (no-op).
    return entityRegistry.get(id) as DefinedEntity<S, D>;
  }

  // New or changed definition.
  const entity = new DefinedEntity<S, D>(definition);
  entityRegistry.set(id, entity);
  entityOptsHashes.set(id, hash);
  return entity;
}

function extractConfig(opts: Record<string, unknown>): Record<string, unknown> {
  const { name, icon, ...config } = opts;
  return config;
}

function define<
  S extends Schema,
  D extends DefinedEntityType,
  E extends string,
  O extends { name: string; icon?: string },
>(type: D, id: E, opts: O): DefinedEntity<S, D> {
  return getOrCreate<D, S>(type, id, {
    type,
    id,
    name: opts.name,
    icon: opts.icon,
    config: extractConfig(opts),
  });
}

export namespace Define {
  export function inputBoolean<E extends string>(id: E, opts: InputBooleanOpts) {
    return define('input_boolean', id, opts);
  }

  export function inputNumber<E extends string>(id: E, opts: InputNumberOpts) {
    return define('input_number', id, opts);
  }

  export function inputSelect<E extends string>(id: E, opts: InputSelectOpts) {
    return define('input_select', id, opts);
  }

  export function inputText<E extends string>(id: E, opts: InputTextOpts) {
    return define('input_text', id, opts);
  }

  export function inputDatetime<E extends string>(id: E, opts: InputDatetimeOpts) {
    return define('input_datetime', id, opts);
  }

  export function sensor<E extends string>(id: E, opts: SensorOpts) {
    return define('sensor', id, opts);
  }

  export function binarySensor<E extends string>(id: E, opts: BinarySensorOpts) {
    return define('binary_sensor', id, opts);
  }
}
