"""The HA Signals integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    DATA_ALREADY_DISCOVERED,
    DOMAIN,
    EVENT_LOADED,
    SUPPORTED_PLATFORMS,
)
from .websocket import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

type HaSignalsConfigEntry = ConfigEntry


async def async_setup_entry(hass: HomeAssistant, entry: HaSignalsConfigEntry) -> bool:
    """Set up HA Signals from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][DATA_ALREADY_DISCOVERED] = {}

    # Register WebSocket commands
    async_register_websocket_commands(hass)

    # Forward entry setup to all supported platforms
    await hass.config_entries.async_forward_entry_setups(entry, SUPPORTED_PLATFORMS)

    # Fire event so the TS client can detect readiness
    hass.bus.async_fire(EVENT_LOADED, {"type": "loaded"})

    _LOGGER.info("HA Signals integration loaded")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: HaSignalsConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, SUPPORTED_PLATFORMS)
    if unload_ok:
        hass.data.pop(DOMAIN, None)
    return unload_ok
