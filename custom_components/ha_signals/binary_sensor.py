"""Binary sensor platform for HA Signals."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import HA_SIGNALS_DISCOVERY_NEW
from .discovery import async_setup_discovery
from .entity import HaSignalsEntity

_LOGGER = logging.getLogger(__name__)

PLATFORM = "binary_sensor"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up HA Signals binary sensor platform."""
    async_setup_discovery(hass, entry)

    @callback
    def _async_discover(payload: dict[str, Any]) -> None:
        """Handle new entity discovery for this platform."""
        async_add_entities([HaSignalsBinarySensor(payload)])

    entry.async_on_unload(
        async_dispatcher_connect(
            hass, HA_SIGNALS_DISCOVERY_NEW.format(PLATFORM), _async_discover
        )
    )


class HaSignalsBinarySensor(HaSignalsEntity, BinarySensorEntity):
    """Representation of a HA Signals binary sensor (read-only, state pushed from TS)."""

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the binary sensor."""
        super().__init__(config)
        entity_config = config.get("config", {})

        device_class = entity_config.get("device_class")
        if device_class:
            try:
                self._attr_device_class = BinarySensorDeviceClass(device_class)
            except ValueError:
                _LOGGER.warning("Unknown binary sensor device class: %s", device_class)

        self._internal_state = False
        self._attr_is_on = False

    def _update_attr_state(self) -> None:
        """Sync internal state to _attr_is_on."""
        if isinstance(self._internal_state, bool):
            self._attr_is_on = self._internal_state
        elif isinstance(self._internal_state, str):
            self._attr_is_on = self._internal_state.lower() in ("on", "true", "1")
        else:
            self._attr_is_on = bool(self._internal_state)

    def _update_config(self, config: dict[str, Any]) -> None:
        """Update binary sensor-specific config."""
        if "device_class" in config:
            try:
                self._attr_device_class = BinarySensorDeviceClass(config["device_class"])
            except ValueError:
                pass

    def _restore_state(self, last_state) -> None:
        """Restore binary sensor state."""
        super()._restore_state(last_state)
        if last_state.state is not None:
            self._internal_state = last_state.state == "on"
            self._update_attr_state()
