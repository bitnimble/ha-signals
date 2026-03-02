"""Number platform for HA Signals (input_number)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import HA_SIGNALS_DISCOVERY_NEW
from .discovery import async_setup_discovery
from .entity import HaSignalsEntity

PLATFORM = "number"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up HA Signals number platform."""
    async_setup_discovery(hass, entry)

    @callback
    def _async_discover(payload: dict[str, Any]) -> None:
        """Handle new entity discovery for this platform."""
        async_add_entities([HaSignalsNumber(payload)])

    entry.async_on_unload(
        async_dispatcher_connect(
            hass, HA_SIGNALS_DISCOVERY_NEW.format(PLATFORM), _async_discover
        )
    )


class HaSignalsNumber(HaSignalsEntity, NumberEntity):
    """Representation of a HA Signals number (input_number)."""

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the number."""
        super().__init__(config)
        entity_config = config.get("config", {})
        self._attr_native_min_value = entity_config.get("min", 0)
        self._attr_native_max_value = entity_config.get("max", 100)
        self._attr_native_step = entity_config.get("step", 1)
        self._attr_native_unit_of_measurement = entity_config.get("unit_of_measurement")
        mode = entity_config.get("mode", "auto")
        self._attr_mode = NumberMode(mode) if mode in ("auto", "box", "slider") else NumberMode.AUTO
        self._internal_state = entity_config.get("initial", self._attr_native_min_value)
        self._attr_native_value: float | None = float(self._internal_state) if self._internal_state is not None else None

    def _update_attr_state(self) -> None:
        """Sync internal state to _attr_native_value."""
        if self._internal_state is None:
            self._attr_native_value = None
        else:
            try:
                self._attr_native_value = float(self._internal_state)
            except (ValueError, TypeError):
                self._attr_native_value = None

    async def async_set_native_value(self, value: float) -> None:
        """Set the value."""
        self._internal_state = value
        self._update_attr_state()
        self.async_write_ha_state()
        self._fire_interaction_event(value)

    def _update_config(self, config: dict[str, Any]) -> None:
        """Update number-specific config."""
        if "min" in config:
            self._attr_native_min_value = config["min"]
        if "max" in config:
            self._attr_native_max_value = config["max"]
        if "step" in config:
            self._attr_native_step = config["step"]
        if "unit_of_measurement" in config:
            self._attr_native_unit_of_measurement = config["unit_of_measurement"]
        if "mode" in config:
            self._attr_mode = NumberMode(config["mode"])

    def _restore_state(self, last_state) -> None:
        """Restore number state."""
        super()._restore_state(last_state)
        if last_state.state is not None:
            try:
                self._internal_state = float(last_state.state)
                self._update_attr_state()
            except (ValueError, TypeError):
                pass
