"""
Unit tests for Room models, formatting, and attached bathroom logic.
"""
import pytest
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from routes.room_routes import RoomCreate, RoomUpdate, format_room


def test_room_create_defaults():
    """Verify RoomCreate defaults has_attached_bathroom, has_bathroom to False."""
    rc = RoomCreate(hostel_id="12345678-1234-1234-1234-123456789012", room_number="101")
    assert rc.has_attached_bathroom is False
    assert rc.has_bathroom is False
    assert rc.hasAttachedBathroom is None


def test_room_create_custom_attached_bathroom():
    """Verify RoomCreate with explicit attached bathroom values."""
    rc = RoomCreate(
        hostel_id="12345678-1234-1234-1234-123456789012",
        room_number="102",
        has_attached_bathroom=True
    )
    assert rc.has_attached_bathroom is True

    rc_camel = RoomCreate(
        hostel_id="12345678-1234-1234-1234-123456789012",
        room_number="103",
        hasAttachedBathroom=True
    )
    assert rc_camel.hasAttachedBathroom is True


def test_room_update_model():
    """Verify RoomUpdate model supports optional attached bathroom flags."""
    ru = RoomUpdate(has_attached_bathroom=True)
    assert ru.has_attached_bathroom is True

    ru_camel = RoomUpdate(hasAttachedBathroom=False)
    assert ru_camel.hasAttachedBathroom is False


def test_format_room_helper():
    """Verify format_room normalizes room dictionaries with all field variants."""
    raw_room = {
        "id": "abc-123",
        "has_attached_bathroom": True,
        "has_bathroom": False
    }
    formatted = format_room(raw_room)
    assert formatted["_id"] == "abc-123"
    assert formatted["has_attached_bathroom"] is True
    assert formatted["hasAttachedBathroom"] is True
    assert formatted["has_bathroom"] is True

    raw_room_false = {
        "id": "def-456",
        "has_attached_bathroom": False,
        "has_bathroom": False
    }
    formatted_false = format_room(raw_room_false)
    assert formatted_false["has_attached_bathroom"] is False
    assert formatted_false["hasAttachedBathroom"] is False
    assert formatted_false["has_bathroom"] is False
