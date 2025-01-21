import { delay } from 'base/delay';
import { Automation } from 'index';
import { Light, Switch } from 'types/schema';

const lightsOn = () =>
  Promise.all([
    Light.turnOn('light.workshop_pixar_lamp'),
    Switch.turnOn('switch.workshop_downlights'),
  ]);

const lightsOff = () =>
  Promise.all([
    Light.turnOff('light.workshop_pixar_lamp'),
    Switch.turnOff('switch.workshop_downlights'),
  ]);

const blinkLamp = async () => {
  Light.turnOn('light.workshop_pixar_lamp', { brightness_step: -50 });
  await delay(500);
  Light.turnOn('light.workshop_pixar_lamp', { brightness_step: 50 });
};

export const WorkshopMotion: Automation = {
  name: 'Workshop motion lights',
  init: (entityStore, hassWs) => {
    // Enable automation
    hassWs.createTrigger('workshop_switch_zmr4', 'action.3_single', async () => {
      Switch.turnOn('switch.workshop_light_automation');
      await lightsOn();
      await delay(500);
      await blinkLamp();
    });

    // Disable automation
    hassWs.createTrigger('workshop_switch_zmr4', 'action.4_single', async () => {
      Switch.turnOff('switch.workshop_light_automation');
      await lightsOff();
      if (entityStore.get('light.workshop_pixar_lamp').state === 'on') {
        await blinkLamp();
      }
    });
  },
  effect: async (entityStore) => {
    // Automation is disabled - don't do anything
    if (!entityStore.get('switch.workshop_light_automation').state) {
      return;
    }

    if (entityStore.get('binary_sensor.workshop_presence_radar_target').state) {
      await lightsOn();
    } else {
      await lightsOff();
    }
  },
};
