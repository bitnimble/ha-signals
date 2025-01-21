import { isLightsOut } from 'automations/lights';
import { Automation } from 'index';
import { Entities, Light } from 'types/schema';

const sensors: Entities['binary_sensor'][] = [
  'binary_sensor.hallway_motion_sensor_north_occupancy',
  'binary_sensor.hallway_motion_sensor_south_occupancy',
];

const lights: Entities['light'][] = ['light.hallway_light_strip', 'light.hallway_terrazzo'];

export const HallwayNightLight: Automation = {
  name: 'Hallway night light',
  effect: (entityStore) => {
    if (isLightsOut(entityStore)) {
      return;
    }
    const hasMotion = sensors.map(entityStore.get).some((e) => e.state === 'on');
    if (hasMotion) {
      Light.turnOn(lights);
    } else {
      Light.turnOff(lights);
    }
  },
};
