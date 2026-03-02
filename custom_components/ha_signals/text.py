"""Text platform for HA Signals (input_text)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.text import TextEntity, TextMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import HA_SIGNALS_DISCOVERY_NEW
from .discovery import async_setup_discovery
from .entity import HaSignalsEntity

PLATFORM = "text"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up HA Signals text platform."""
    async_setup_discovery(hass, entry)

    @callback
    def _async_discover(payload: dict[str, Any]) -> None:
        """Handle new entity discovery for this platform."""
        async_add_entities([HaSignalsText(payload)])

    entry.async_on_unload(
        async_dispatcher_connect(
            hass, HA_SIGNALS_DISCOVERY_NEW.format(PLATFORM), _async_discover
        )
    )


class HaSignalsText(HaSignalsEntity, TextEntity):
    """Representation of a HA Signals text (input_text)."""

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the text entity."""
        super().__init__(config)
        entity_config = config.get("config", {})
        self._attr_native_min = entity_config.get("min", 0)
        self._attr_native_max = entity_config.get("max", 100)
        self._attr_pattern = entity_config.get("pattern")
        mode = entity_config.get("mode", "text")
        self._attr_mode = TextMode(mode) if mode in ("text", "password") else TextMode.TEXT
        self._internal_state = entity_config.get("initial", "")
        self._attr_native_value: str | None = str(self._internal_state) if self._internal_state is not None else None

    def _update_attr_state(self) -> None:
        """Sync internal state to _attr_native_value."""
        self._attr_native_value = str(self._internal_state) if self._internal_state is not None else None

    async def async_set_value(self, value: str) -> None:
        """Set the text value."""
        self._internal_state = value
        self._update_attr_state()
        self.async_write_ha_state()
        self._fire_interaction_event(value)

    def _update_config(self, config: dict[str, Any]) -> None:
        """Update text-specific config."""
        if "min" in config:
            self._attr_native_min = config["min"]
        if "max" in config:
            self._attr_native_max = config["max"]
        if "pattern" in config:
            self._attr_pattern = config["pattern"]
        if "mode" in config:
            self._attr_mode = TextMode(config["mode"])

    def _restore_state(self, last_state) -> None:
        """Restore text state."""
        super()._restore_state(last_state)
        if last_state.state is not None:
            self._internal_state = last_state.state
            self._update_attr_state()
