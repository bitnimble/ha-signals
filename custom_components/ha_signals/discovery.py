"""Discovery handling for HA Signals entities."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send

from .const import (
    DATA_ALREADY_DISCOVERED,
    DOMAIN,
    HA_SIGNALS_DISCOVERY,
    HA_SIGNALS_DISCOVERY_NEW,
    HA_SIGNALS_DISCOVERY_UPDATED,
)

_LOGGER = logging.getLogger(__name__)


DATA_DISCOVERY_SETUP = "discovery_setup"


@callback
def async_setup_discovery(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Set up discovery listener. Idempotent — safe to call from each platform."""
    if hass.data.get(DOMAIN, {}).get(DATA_DISCOVERY_SETUP):
        return
    hass.data[DOMAIN][DATA_DISCOVERY_SETUP] = True

    @callback
    def _async_entity_discovered(payload: dict[str, Any]) -> None:
        """Handle a discovered entity."""
        unique_id = payload["unique_id"]
        platform = payload["platform"]
        already_discovered = hass.data[DOMAIN][DATA_ALREADY_DISCOVERED]

        if unique_id in already_discovered:
            # Entity already exists — dispatch update
            _LOGGER.debug("Updating existing entity: %s", unique_id)
            already_discovered[unique_id] = payload
            async_dispatcher_send(
                hass, HA_SIGNALS_DISCOVERY_UPDATED.format(unique_id), payload
            )
        else:
            # New entity — store and dispatch creation
            _LOGGER.debug("Discovering new entity: %s on platform %s", unique_id, platform)
            already_discovered[unique_id] = payload
            async_dispatcher_send(
                hass, HA_SIGNALS_DISCOVERY_NEW.format(platform), payload
            )

    entry.async_on_unload(
        async_dispatcher_connect(hass, HA_SIGNALS_DISCOVERY, _async_entity_discovered)
    )
