#!/usr/bin/env python3
"""
Test script to verify the import issue on line 36 of main.py.
"""

import sys
import os

# Add the current directory to Python path (same as main.py)
if "/app" not in sys.path:
    sys.path.insert(0, "/app")

# Add current directory for local testing
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_auth_utils_import():
    """Test importing get_rest_session from backend.auth_utils."""
    print("🧪 Testing auth_utils import...")

    try:
        print("  Attempting to import auth_utils module...")
        import auth_utils

        print("  ✅ auth_utils module imported successfully")

        print("  Checking if get_rest_session exists...")
        if hasattr(auth_utils, "get_rest_session"):
            print("  ✅ get_rest_session function found")
        else:
            print("  ❌ get_rest_session function not found")
            print(f"  Available attributes: {dir(auth_utils)}")
            return False

        print("  Checking if PROJECT_ID exists...")
        if hasattr(auth_utils, "PROJECT_ID"):
            print("  ✅ PROJECT_ID variable found")
        else:
            print("  ❌ PROJECT_ID variable not found")
            return False

        print("  Attempting direct import like line 36...")
        from backend.auth_utils import get_rest_session, PROJECT_ID

        print("  ✅ Direct import successful")

        print("  Testing function call...")
        session = get_rest_session()
        print(f"  ✅ Function call successful, returned: {type(session)}")

        return True

    except ImportError as e:
        print(f"  ❌ ImportError: {e}")
        return False
    except Exception as e:
        print(f"  ❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_circular_import():
    """Test for potential circular import issues."""
    print("🧪 Testing for circular imports...")

    try:
        # Test importing main.py components separately
        print("  Testing FastAPI import...")
        from fastapi import FastAPI

        print("  ✅ FastAPI imported successfully")

        print("  Testing auth_utils import...")
        from backend.auth_utils import get_rest_session

        print("  ✅ auth_utils imported successfully")

        print("  Testing combined import (simulating main.py)...")
        # This simulates what main.py does
        from fastapi import FastAPI
        from backend.auth_utils import get_rest_session, PROJECT_ID

        app = FastAPI()
        session = get_rest_session()

        print("  ✅ No circular import issues detected")
        return True

    except Exception as e:
        print(f"  ❌ Circular import issue detected: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run import tests."""
    print("🚀 Testing import issues on line 36 of main.py...")
    print("=" * 60)

    tests_passed = 0
    total_tests = 2

    if test_auth_utils_import():
        tests_passed += 1

    if test_circular_import():
        tests_passed += 1

    print("=" * 60)
    print(f"📊 Results: {tests_passed}/{total_tests} tests passed")

    if tests_passed == total_tests:
        print("🎉 No import issues detected!")
        return 0
    else:
        print("❌ Import issues found. Check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
