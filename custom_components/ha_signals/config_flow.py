"""Config flow for HA Signals integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigFlow

from .const import DOMAIN


class HaSignalsConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for HA Signals."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        # Only allow a single instance of the integration
        self._async_abort_entries_match()

        if user_input is not None:
            return self.async_create_entry(title="HA Signals", data={})

        return self.async_show_form(step_id="user")
