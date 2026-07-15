"""
services/event_bus.py
─────────────────────
Lightweight async event bus for the Subhouz automation engine.

Usage in any route:
    from services.event_bus import EventBus
    await EventBus.emit("NEW_ENQUIRY", enquiry_data)

Every emit:
  1. Runs in a non-blocking background asyncio Task (fire-and-forget).
  2. Catches and logs all exceptions — never raises to the caller.
  3. The matching AutomationService method checks whether the automation
     is enabled in the DB before doing any real work.
"""

import asyncio
import logging

logger = logging.getLogger(__name__)

# ── Event name constants ────────────────────────────────────────────────────
NEW_ENQUIRY        = "NEW_ENQUIRY"
BOOKING_CONFIRMED  = "BOOKING_CONFIRMED"
KYC_REQUESTED      = "KYC_REQUESTED"
DOCUMENT_SUBMITTED = "DOCUMENT_SUBMITTED"
PAYMENT_RECORDED   = "PAYMENT_RECORDED"
VACANCY_UPDATE     = "VACANCY_UPDATE"
RENT_DUE           = "RENT_DUE"          # fired by the daily scheduler


class EventBus:
    """Central event dispatcher — all automation triggers go through here."""

    @staticmethod
    async def emit(event: str, *args, **kwargs) -> None:
        """
        Dispatch an event to its automation handler asynchronously.

        This is a fire-and-forget call: it schedules the handler as a
        background asyncio Task and returns immediately so the HTTP
        response is never delayed by automation processing.
        """
        logger.info(f"[EventBus] ▶ Emitting event: {event}")
        try:
            coro = EventBus._resolve(event, *args, **kwargs)
            if coro is not None:
                asyncio.ensure_future(EventBus._safe_run(event, coro))
        except Exception as exc:
            logger.error(f"[EventBus] Failed to schedule handler for {event}: {exc}")

    # ── Internal helpers ────────────────────────────────────────────────────

    @staticmethod
    async def _safe_run(event: str, coro) -> None:
        """Wrap a coroutine so exceptions never crash the event loop."""
        try:
            await coro
            logger.info(f"[EventBus] ✅ Handler completed for event: {event}")
        except Exception as exc:
            logger.error(f"[EventBus] ❌ Handler failed for event {event}: {exc}")

    @staticmethod
    def _resolve(event: str, *args, **kwargs):
        """
        Map an event name to the corresponding AutomationDispatcher coroutine.
        Imported lazily to avoid circular imports.
        """
        from services.automation_dispatcher import AutomationDispatcher

        handlers = {
            NEW_ENQUIRY:        lambda: AutomationDispatcher.handle_new_enquiry(*args, **kwargs),
            BOOKING_CONFIRMED:  lambda: _emit_booking(*args, **kwargs),
            KYC_REQUESTED:      lambda: AutomationDispatcher.handle_kyc_request(*args, **kwargs),
            DOCUMENT_SUBMITTED: lambda: AutomationDispatcher.handle_document_submitted(*args, **kwargs),
            PAYMENT_RECORDED:   lambda: AutomationDispatcher.handle_payment_recorded(*args, **kwargs),
            VACANCY_UPDATE:     lambda: AutomationDispatcher.handle_vacancy_update(*args, **kwargs),
            RENT_DUE:           lambda: AutomationDispatcher.handle_rent_due(),
        }

        handler_fn = handlers.get(event)
        if handler_fn is None:
            logger.warning(f"[EventBus] No handler registered for event: {event}")
            return None
        return handler_fn()


async def _emit_booking(resident_data):
    """Booking confirmed fires both Booking Confirmation and KYC Request."""
    from services.automation_dispatcher import AutomationDispatcher
    await AutomationDispatcher.handle_booking_confirmed(resident_data)
    await AutomationDispatcher.handle_kyc_request(resident_data)
