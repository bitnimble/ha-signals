"""Select platform for HA Signals (input_select)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import HA_SIGNALS_DISCOVERY_NEW
from .discovery import async_setup_discovery
from .entity import HaSignalsEntity

PLATFORM = "select"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up HA Signals select platform."""
    async_setup_discovery(hass, entry)

    @callback
    def _async_discover(payload: dict[str, Any]) -> None:
        """Handle new entity discovery for this platform."""
        async_add_entities([HaSignalsSelect(payload)])

    entry.async_on_unload(
        async_dispatcher_connect(
            hass, HA_SIGNALS_DISCOVERY_NEW.format(PLATFORM), _async_discover
        )
    )


class HaSignalsSelect(HaSignalsEntity, SelectEntity):
    """Representation of a HA Signals select (input_select)."""

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the select."""
        super().__init__(config)
        entity_config = config.get("config", {})
        self._attr_options: list[str] = entity_config.get("options", [])
        initial = entity_config.get("initial")
        self._internal_state = initial if initial in self._attr_options else (
            self._attr_options[0] if self._attr_options else None
        )
        self._attr_current_option: str | None = str(self._internal_state) if self._internal_state is not None else None

    def _update_attr_state(self) -> None:
        """Sync internal state to _attr_current_option."""
        self._attr_current_option = str(self._internal_state) if self._internal_state is not None else None

    async def async_select_option(self, option: str) -> None:
        """Select an option."""
        self._internal_state = option
        self._update_attr_state()
        self.async_write_ha_state()
        self._fire_interaction_event(option)

    def _update_config(self, config: dict[str, Any]) -> None:
        """Update select-specific config."""
        if "options" in config:
            self._attr_options = config["options"]

    def _restore_state(self, last_state) -> None:
        """Restore select state."""
        super()._restore_state(last_state)
        if last_state.state is not None and last_state.state in self._attr_options:
            self._internal_state = last_state.state
            self._update_attr_state()
