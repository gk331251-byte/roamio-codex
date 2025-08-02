#!/usr/bin/env python3
"""
Test script to verify backend startup and imports work correctly.
"""

import sys
import os

# Add the current directory to Python path
if "/app" not in sys.path:
    sys.path.insert(0, "/app")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_imports():
    """Test that all critical imports work."""
    print("🧪 Testing imports...")

    try:
        print("  Testing auth_utils...")
        from backend.auth_utils import get_rest_session, PROJECT_ID

        print("  ✅ auth_utils imported successfully")
    except Exception as e:
        print(f"  ❌ auth_utils failed: {e}")
        return False

    try:
        print("  Testing FastAPI...")
        from fastapi import FastAPI

        print("  ✅ FastAPI imported successfully")
    except Exception as e:
        print(f"  ❌ FastAPI failed: {e}")
        return False

    try:
        print("  Testing firebase_admin...")
        import firebase_admin

        print("  ✅ firebase_admin imported successfully")
    except Exception as e:
        print(f"  ❌ firebase_admin failed: {e}")
        return False

    try:
        print("  Testing googlemaps...")
        import googlemaps

        print("  ✅ googlemaps imported successfully")
    except Exception as e:
        print(f"  ❌ googlemaps failed: {e}")
        return False

    try:
        print("  Testing openai...")
        import openai

        print("  ✅ openai imported successfully")
    except Exception as e:
        print(f"  ❌ openai failed: {e}")
        return False

    return True


def test_app_creation():
    """Test that the FastAPI app can be created."""
    print("🧪 Testing app creation...")

    try:
        # Set environment variables for testing
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "test-project")

        # Import the main module
        import main

        # Check if app exists
        if hasattr(main, "app"):
            print("  ✅ FastAPI app created successfully")

            # Test health endpoint exists
            routes = [route.path for route in main.app.routes]
            if "/health" in routes:
                print("  ✅ Health endpoint registered")
            else:
                print("  ⚠️ Health endpoint not found in routes")

            return True
        else:
            print("  ❌ FastAPI app not found")
            return False

    except Exception as e:
        print(f"  ❌ App creation failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("🚀 Starting backend startup tests...")
    print("=" * 50)

    tests_passed = 0
    total_tests = 2

    if test_imports():
        tests_passed += 1

    if test_app_creation():
        tests_passed += 1

    print("=" * 50)
    print(f"📊 Results: {tests_passed}/{total_tests} tests passed")

    if tests_passed == total_tests:
        print("🎉 All tests passed! Backend should start successfully.")
        return 0
    else:
        print("❌ Some tests failed. Check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
