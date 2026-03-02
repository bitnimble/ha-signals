"""WebSocket command handlers for HA Signals."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components.websocket_api import (
    async_register_command,
    decorators,
)
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    CLIENT_TYPE_TO_PLATFORM,
    DATA_ALREADY_DISCOVERED,
    DOMAIN,
    HA_SIGNALS_DISCOVERY,
    HA_SIGNALS_DISCOVERY_UPDATED,
)

@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register WebSocket commands for HA Signals."""
    async_register_command(hass, handle_register)
    async_register_command(hass, handle_state)
    async_register_command(hass, handle_get_registered)


@decorators.websocket_command(
    {
        vol.Required("type"): "ha_signals/register",
        vol.Required("entities"): [
            vol.Schema(
                {
                    vol.Required("type"): vol.In(CLIENT_TYPE_TO_PLATFORM.keys()),
                    vol.Required("id"): str,
                    vol.Required("name"): str,
                    vol.Optional("icon"): str,
                    vol.Optional("config"): dict,
                },
            )
        ],
    }
)
@decorators.require_admin
@decorators.async_response
async def handle_register(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle ha_signals/register command."""
    entities = msg["entities"]
    result: dict[str, str | None] = {}

    for entity_def in entities:
        client_type = entity_def["type"]
        entity_id_str = entity_def["id"]
        unique_id = f"ha_signals_{entity_id_str}"
        platform = CLIENT_TYPE_TO_PLATFORM[client_type]

        discovery_payload = {
            "unique_id": unique_id,
            "client_id": entity_id_str,
            "client_type": client_type,
            "platform": platform,
            "name": entity_def["name"],
            "icon": entity_def.get("icon"),
            "config": entity_def.get("config", {}),
        }

        # Dispatch discovery signal for the platform to pick up
        async_dispatcher_send(hass, HA_SIGNALS_DISCOVERY, discovery_payload)

    # Allow entity platform to process
    await hass.async_block_till_done()

    # Look up entity IDs from entity registry
    ent_reg = er.async_get(hass)
    for entity_def in entities:
        entity_id_str = entity_def["id"]
        unique_id = f"ha_signals_{entity_id_str}"
        entry = ent_reg.async_get_entity_id(
            CLIENT_TYPE_TO_PLATFORM[entity_def["type"]], DOMAIN, unique_id
        )
        result[entity_id_str] = entry

    connection.send_result(msg["id"], {"entities": result})


@decorators.websocket_command(
    {
        vol.Required("type"): "ha_signals/state",
        vol.Required("entity_id"): str,
        vol.Required("state"): vol.Any(str, int, float, bool, None),
        vol.Optional("attributes"): dict,
    }
)
@decorators.require_admin
@decorators.async_response
async def handle_state(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle ha_signals/state command — push state from TS client."""
    entity_id_str = msg["entity_id"]
    unique_id = f"ha_signals_{entity_id_str}"
    state = msg["state"]
    attributes = msg.get("attributes")

    async_dispatcher_send(
        hass,
        HA_SIGNALS_DISCOVERY_UPDATED.format(unique_id),
        {"state": state, "attributes": attributes},
    )

    connection.send_result(msg["id"])


@decorators.websocket_command(
    {
        vol.Required("type"): "ha_signals/get_registered",
    }
)
@decorators.require_admin
@decorators.async_response
async def handle_get_registered(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle ha_signals/get_registered — return all registered entities."""
    discovered = hass.data.get(DOMAIN, {}).get(DATA_ALREADY_DISCOVERED, {})
    entities = list(discovered.values())
    connection.send_result(msg["id"], {"entities": entities})
