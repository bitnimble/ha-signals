import { isLightsOut, LightColor } from 'automations/lights';
import { debounce } from 'base/debounce';
import { Automation } from 'index';
import { match, P } from 'ts-pattern';
import { Entities, Light } from 'types/schema';

const light: Entities['light'] = 'light.balcony_hektar_lamp';

export const AmberPrice: Automation = {
  name: 'Amber price notifications',
  effect: debounce(async (entityStore) => {
    if (isLightsOut(entityStore)) {
      return;
    }

    // Current price spike
    const currentPrice = entityStore.get('sensor.16z_general_price').state;
    if (currentPrice != null && currentPrice > 0.8) {
      // Bright red
      await Light.turnOn(light, LightColor.BRIGHT_RED);
      return;
    }

    // Forecasted price spike - average over the next hour
    const forecastedPrices = (
      entityStore.get('sensor.16z_general_forecast') as unknown as AmberForecast
    ).attributes.forecasts;
    if (currentPrice == null || forecastedPrices.length < 2) {
      return;
    }
    const nextHourPrice =
      (currentPrice + forecastedPrices[0].per_kwh + forecastedPrices[1].per_kwh) / 3;

    const lightData = match(nextHourPrice)
      .with(P.number.lt(0.17), () => LightColor.BLUE)
      .with(P.number.lt(0.25), () => LightColor.WHITE)
      .with(P.number.lt(0.35), () => LightColor.YELLOW)
      .with(P.number.lt(0.45), () => LightColor.ORANGE)
      .with(P.number.lt(0.8), () => LightColor.RED)
      .otherwise(() => LightColor.BRIGHT_RED);
    await Light.turnOn(light, lightData);
  }, 1000),
};

// TODO: automatically generate attribute types in schema, where possible
type AmberForecast = {
  attributes: {
    forecasts: {
      per_kwh: number;
    }[];
  };
};
