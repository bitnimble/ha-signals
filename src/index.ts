import { Signal } from 'signal';
import { EntityStore } from 'store';

async function main() {
  const store = new EntityStore();
  await store.reloadStates();

  Signal.effect(() => {
    console.log(store.getState('light.balcony_hektar_lamp')?.state);
  });

  setInterval(() => {
    store.reloadStates();
  }, 5000);
}

main();
