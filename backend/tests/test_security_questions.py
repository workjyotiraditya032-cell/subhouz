"""
Unit test suite for Security Questions store and verification.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.security_questions_store import (
    set_user_security_answers,
    verify_user_security_answers,
    get_user_security_hashes
)

TEST_EMAIL = "test_user_sec@subhouz.com"


def test_set_and_get_security_hashes():
    """Verify security questions are normalized and stored as bcrypt hashes."""
    set_user_security_answers(TEST_EMAIL, "  Saint Mary School  ", " Mary ", " John ")
    hashes = get_user_security_hashes(TEST_EMAIL)

    assert hashes is not None
    assert "school_hash" in hashes
    assert "mother_hash" in hashes
    assert "father_hash" in hashes

    # Ensure plain text answers are NOT stored
    assert hashes["school_hash"] != "Saint Mary School"
    assert hashes["school_hash"].startswith("$2b$") or hashes["school_hash"].startswith("$2a$")


def test_verify_security_answers_case_and_whitespace_insensitive():
    """Verify security answers match regardless of uppercase/lowercase and leading/trailing spaces."""
    set_user_security_answers(TEST_EMAIL, "Delhi Public School", "Sunita", "Rajesh")

    # Exact match
    assert verify_user_security_answers(TEST_EMAIL, "Delhi Public School", "Sunita", "Rajesh") is True

    # Case & whitespace variations
    assert verify_user_security_answers(TEST_EMAIL, "  dElHi PuBlIc ScHoOl  ", "  sUnItA ", " rAjEsH ") is True


def test_verify_security_answers_incorrect():
    """Verify security question verification fails when any answer is incorrect."""
    set_user_security_answers(TEST_EMAIL, "St Xavier", "Anita", "Ramesh")

    # One wrong answer
    assert verify_user_security_answers(TEST_EMAIL, "St Xavier", "Anita", "Wrong Father") is False

    # All wrong answers
    assert verify_user_security_answers(TEST_EMAIL, "Wrong School", "Wrong Mother", "Wrong Father") is False
