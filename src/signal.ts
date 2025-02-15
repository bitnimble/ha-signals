// ha-signals is based on a generic form of signals, ideally migrating to TC39 signals when that
// releases fully. For now, we move all implementation details of the underlying signal library
// (e.g. preact-signal, MobX, etc) into this file to make refactoring later easier.

import * as mobx from 'mobx';

export namespace Signal {
  export class State<T> {
    constructor(private t: T) {
      mobx.makeObservable<typeof this, 't'>(this, {
        t: mobx.observable.deep,
      });
    }

    get() {
      return this.t;
    }
    set(t: T) {
      mobx.runInAction(() => (this.t = t));
    }
  }

  export class Computed<T> {
    constructor(private fn: () => T) {
      mobx.makeObservable<typeof this, 'value'>(this, {
        value: mobx.computed.struct,
      });
    }

    private get value() {
      return this.fn();
    }

    get() {
      return this.value;
    }
  }

  export function effect(fn: () => void): () => void {
    return mobx.autorun(fn);
  }

  export function wrapEffect<F extends Function>(fn: F): F {
    return mobx.action(fn);
  }
}
