"""Switch platform for HA Signals (input_boolean)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import HA_SIGNALS_DISCOVERY_NEW
from .discovery import async_setup_discovery
from .entity import HaSignalsEntity

PLATFORM = "switch"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up HA Signals switch platform."""
    # Set up the discovery listener (idempotent across platforms)
    async_setup_discovery(hass, entry)

    @callback
    def _async_discover(payload: dict[str, Any]) -> None:
        """Handle new entity discovery for this platform."""
        async_add_entities([HaSignalsSwitch(payload)])

    entry.async_on_unload(
        async_dispatcher_connect(
            hass, HA_SIGNALS_DISCOVERY_NEW.format(PLATFORM), _async_discover
        )
    )


class HaSignalsSwitch(HaSignalsEntity, SwitchEntity):
    """Representation of a HA Signals switch (input_boolean)."""

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the switch."""
        super().__init__(config)
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

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn the switch on."""
        self._internal_state = True
        self._attr_is_on = True
        self.async_write_ha_state()
        self._fire_interaction_event(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn the switch off."""
        self._internal_state = False
        self._attr_is_on = False
        self.async_write_ha_state()
        self._fire_interaction_event(False)

    def _restore_state(self, last_state) -> None:
        """Restore switch state."""
        super()._restore_state(last_state)
        if last_state.state is not None:
            self._internal_state = last_state.state == "on"
            self._update_attr_state()
