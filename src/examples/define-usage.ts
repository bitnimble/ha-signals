/**
 * Example usage of Define API and DefinedEntity
 * 
 * This demonstrates:
 * 1. Creating entities with Define.inputBoolean
 * 2. Using state as a getter-setter
 * 3. Idempotent redefinition (calling Define multiple times)
 * 4. Reactive state updates from the entity store
 */

import { Define } from '../define';
import { EntityStore } from '../store';
import { Signal } from '../signal';

// Example: Create an entity store
const store = new EntityStore();

// Example 1: Define an input_boolean entity
const mySwitch = Define.inputBoolean(store, {
  id: 'input_boolean.my_switch',
  name: 'My Switch',
  icon: 'mdi:light-switch',
  initialState: false,
});

// Example 2: Get the state (reactive)
console.log('Current state:', mySwitch.state); // undefined initially, then boolean after HA sync

// Example 3: Set the state (updates Home Assistant)
mySwitch.state = true; // Calls input_boolean.turn_on service

// Example 4: Idempotent redefinition (no-op)
// Calling Define.inputBoolean again with same ID and options returns the same instance
const mySwitchAgain = Define.inputBoolean(store, {
  id: 'input_boolean.my_switch',
  name: 'My Switch',
  icon: 'mdi:light-switch',
  initialState: false,
});
console.log('Same instance?', mySwitch === mySwitchAgain); // true

// Example 5: Using in a reactive effect
Signal.effect(() => {
  // This effect will re-run whenever mySwitch.state changes
  // (either from local updates or from Home Assistant websocket events)
  console.log('Switch state changed to:', mySwitch.state);
  
  // You can safely redefine entities inside effects
  // This is a no-op if the entity is already defined
  const anotherSwitch = Define.inputBoolean(store, {
    id: 'input_boolean.another_switch',
    name: 'Another Switch',
  });
  
  // React to changes
  if (mySwitch.state) {
    console.log('Switch is ON');
  } else {
    console.log('Switch is OFF');
  }
});

// Example 6: The state updates are reactive
// When Home Assistant sends a state_changed event via websocket,
// the entity store updates, and all reactive computations re-run automatically.
// No separate subscription is needed!
