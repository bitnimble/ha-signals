"""Constants for the HA Signals integration."""

DOMAIN = "ha_signals"

# Dispatcher signals
HA_SIGNALS_DISCOVERY = f"{DOMAIN}_discovery"
HA_SIGNALS_DISCOVERY_NEW = f"{DOMAIN}_discovery_new_{{}}"
HA_SIGNALS_DISCOVERY_UPDATED = f"{DOMAIN}_discovery_updated_{{}}"

# Supported HA platforms
SUPPORTED_PLATFORMS = [
    "binary_sensor",
    "sensor",
    "switch",
    "number",
    "select",
    "text",
    "datetime",
]

# Map from client entity type names to HA platform names
CLIENT_TYPE_TO_PLATFORM = {
    "input_boolean": "switch",
    "input_number": "number",
    "input_select": "select",
    "input_text": "text",
    "input_datetime": "datetime",
    "sensor": "sensor",
    "binary_sensor": "binary_sensor",
}

# Key for storing integration data in hass.data
DATA_ALREADY_DISCOVERED = "already_discovered"

# Event names
EVENT_ENTITY_INTERACTION = f"{DOMAIN}_entity_interaction"
EVENT_LOADED = DOMAIN
