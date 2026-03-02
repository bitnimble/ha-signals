"""Base entity for HA Signals."""

from __future__ import annotations

from typing import Any

from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.restore_state import RestoreEntity

from .const import (
    DOMAIN,
    EVENT_ENTITY_INTERACTION,
    HA_SIGNALS_DISCOVERY_UPDATED,
)

class HaSignalsEntity(RestoreEntity):
    """Base class for HA Signals entities."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the entity."""
        self._client_id: str = config["client_id"]
        self._attr_unique_id: str | None = config["unique_id"]
        self._attr_name: str | None = config["name"]
        self._attr_icon: str | None = config.get("icon")
        self._internal_state: Any = None
        self._attr_extra_state_attributes: dict[str, Any] = {}
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, DOMAIN)},
            name="HA Signals",
            manufacturer="ha-signals",
            model="TypeScript Automations",
        )

    async def async_added_to_hass(self) -> None:
        """Run when entity is added to hass."""
        await super().async_added_to_hass()

        # Restore previous state
        last_state = await self.async_get_last_state()
        if last_state is not None:
            self._restore_state(last_state)

        # Listen for state updates from the TS client
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                HA_SIGNALS_DISCOVERY_UPDATED.format(self._attr_unique_id),
                self._handle_update,
            )
        )

    def _restore_state(self, last_state) -> None:
        """Restore state from previous run. Override in platform entities."""
        self._internal_state = last_state.state

    @callback
    def _handle_update(self, payload: dict[str, Any]) -> None:
        """Handle update from discovery or state push."""
        if "state" in payload:
            self._internal_state = payload["state"]
            self._update_attr_state()
        if "attributes" in payload and payload["attributes"] is not None:
            attrs = dict(self._attr_extra_state_attributes)
            attrs.update(payload["attributes"])
            self._attr_extra_state_attributes = attrs
        if "name" in payload:
            self._attr_name = payload["name"]
        if "icon" in payload:
            self._attr_icon = payload["icon"]
        if "config" in payload:
            self._update_config(payload["config"])
        self.async_write_ha_state()

    def _update_attr_state(self) -> None:
        """Sync _internal_state to the appropriate _attr_* value.

        Override in platform entities.
        """

    def _update_config(self, config: dict[str, Any]) -> None:
        """Update entity config. Override in platform entities for specific handling."""

    def _fire_interaction_event(self, state: Any, attributes: dict[str, Any] | None = None) -> None:
        """Fire a HA event to notify the TS client of a user interaction."""
        self.hass.bus.async_fire(
            EVENT_ENTITY_INTERACTION,
            {
                "id": self._client_id,
                "entity_id": self.entity_id,
                "state": state,
                "attributes": attributes,
            },
        )
