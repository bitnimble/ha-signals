"""Sensor platform for HA Signals."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import HA_SIGNALS_DISCOVERY_NEW
from .discovery import async_setup_discovery
from .entity import HaSignalsEntity

_LOGGER = logging.getLogger(__name__)

PLATFORM = "sensor"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up HA Signals sensor platform."""
    async_setup_discovery(hass, entry)

    @callback
    def _async_discover(payload: dict[str, Any]) -> None:
        """Handle new entity discovery for this platform."""
        async_add_entities([HaSignalsSensor(payload)])

    entry.async_on_unload(
        async_dispatcher_connect(
            hass, HA_SIGNALS_DISCOVERY_NEW.format(PLATFORM), _async_discover
        )
    )


class HaSignalsSensor(HaSignalsEntity, SensorEntity):
    """Representation of a HA Signals sensor (read-only, state pushed from TS)."""

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the sensor."""
        super().__init__(config)
        entity_config = config.get("config", {})

        device_class = entity_config.get("device_class")
        if device_class:
            try:
                self._attr_device_class = SensorDeviceClass(device_class)
            except ValueError:
                _LOGGER.warning("Unknown sensor device class: %s", device_class)

        self._attr_native_unit_of_measurement = entity_config.get("unit_of_measurement")

        state_class = entity_config.get("state_class")
        if state_class:
            try:
                self._attr_state_class = SensorStateClass(state_class)
            except ValueError:
                _LOGGER.warning("Unknown sensor state class: %s", state_class)

        self._internal_state = None
        self._attr_native_value = None

    def _update_attr_state(self) -> None:
        """Sync internal state to _attr_native_value."""
        self._attr_native_value = self._internal_state

    def _update_config(self, config: dict[str, Any]) -> None:
        """Update sensor-specific config."""
        if "device_class" in config:
            try:
                self._attr_device_class = SensorDeviceClass(config["device_class"])
            except ValueError:
                pass
        if "unit_of_measurement" in config:
            self._attr_native_unit_of_measurement = config["unit_of_measurement"]
        if "state_class" in config:
            try:
                self._attr_state_class = SensorStateClass(config["state_class"])
            except ValueError:
                pass

    def _restore_state(self, last_state) -> None:
        """Restore sensor state."""
        super()._restore_state(last_state)
        if last_state.state is not None:
            self._internal_state = last_state.state
            self._update_attr_state()
