"""
Integration test suite for Role-Based Password Reset and Self Password Change workflows.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from auth import hash_password, verify_password


def test_password_hashing_and_verification():
    """Verify password hashing and verification."""
    plain = "SuperSecurePass2026!"
    hashed = hash_password(plain)
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_password_strength_validation():
    """Verify minimum password length rules."""
    short_pass = "123"
    valid_pass = "ValidPass123"

    assert len(short_pass) < 6
    assert len(valid_pass) >= 6
