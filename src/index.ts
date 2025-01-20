import { HassWebsocket } from 'api/websocket';
import { createButtonLight } from 'automations/motion_light';
import { EntityStore } from 'store';

global.WebSocket = require('ws');

async function main() {
  // Setup
  const store = new EntityStore();
  store.reloadStates();
  const hassWs = new HassWebsocket(store);
  await hassWs.connect();

  // Test automation
  createButtonLight(hassWs, 'dimmer_bedroom_lamp', 'action.on', 'light.balcony_hektar_lamp');

  console.log('Running!');
}

main();
