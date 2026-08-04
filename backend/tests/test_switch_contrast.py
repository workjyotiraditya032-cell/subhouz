"""
Test suite to audit switch component classes and high-contrast color styling.
"""
from pathlib import Path

def test_switch_component_classes():
    """Verify switch.jsx contains high-contrast track and thumb classes."""
    project_root = Path(__file__).parent.parent.parent
    switch_file = project_root / "frontend" / "src" / "components" / "ui" / "switch.jsx"

    assert switch_file.exists(), f"Switch file not found at {switch_file}"
    content = switch_file.read_text(encoding="utf-8")

    # Verify high-contrast OFF track styling
    assert "data-[state=unchecked]:bg-slate-300" in content, "Missing high-contrast OFF state track background (bg-slate-300)"
    
    # Verify high-contrast ON track styling
    assert "data-[state=checked]:bg-[#2D5F3F]" in content, "Missing high-contrast ON state track background"

    # Verify thumb styling with shadow and border to prevent white-on-white collision
    assert "bg-white" in content, "Thumb missing explicit white background"
    assert "shadow-md" in content or "shadow-lg" in content, "Thumb missing shadow for depth"
    assert "border" in content, "Thumb missing border for outline contrast"
