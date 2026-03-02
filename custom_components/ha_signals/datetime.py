"""Datetime platform for HA Signals (input_datetime)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.datetime import DateTimeEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import HA_SIGNALS_DISCOVERY_NEW
from .discovery import async_setup_discovery
from .entity import HaSignalsEntity

PLATFORM = "datetime"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up HA Signals datetime platform."""
    async_setup_discovery(hass, entry)

    @callback
    def _async_discover(payload: dict[str, Any]) -> None:
        """Handle new entity discovery for this platform."""
        async_add_entities([HaSignalsDatetime(payload)])

    entry.async_on_unload(
        async_dispatcher_connect(
            hass, HA_SIGNALS_DISCOVERY_NEW.format(PLATFORM), _async_discover
        )
    )


class HaSignalsDatetime(HaSignalsEntity, DateTimeEntity):
    """Representation of a HA Signals datetime (input_datetime)."""

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the datetime entity."""
        super().__init__(config)
        self._internal_state: datetime | None = None
        self._attr_native_value: datetime | None = None

    def _update_attr_state(self) -> None:
        """Sync internal state to _attr_native_value."""
        if self._internal_state is None:
            self._attr_native_value = None
        elif isinstance(self._internal_state, datetime):
            self._attr_native_value = self._internal_state
        elif isinstance(self._internal_state, str):
            try:
                self._attr_native_value = datetime.fromisoformat(self._internal_state)
            except (ValueError, TypeError):
                self._attr_native_value = None
        else:
            self._attr_native_value = None

    async def async_set_value(self, value: datetime) -> None:
        """Set the datetime value."""
        self._internal_state = value
        self._update_attr_state()
        self.async_write_ha_state()
        self._fire_interaction_event(value.isoformat())

    def _restore_state(self, last_state) -> None:
        """Restore datetime state."""
        super()._restore_state(last_state)
        if last_state.state is not None:
            try:
                self._internal_state = datetime.fromisoformat(last_state.state)
                self._update_attr_state()
            except (ValueError, TypeError):
                pass
