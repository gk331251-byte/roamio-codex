#!/usr/bin/env python3
"""
Test script to simulate exact container environment and verify line 36 import.
"""

import sys
import os
import tempfile
import shutil


def test_container_environment():
    """Test import in simulated container environment."""
    print("🧪 Testing in simulated container environment...")

    # Create a temporary /app directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        app_dir = os.path.join(temp_dir, "app")
        backend_dir = os.path.join(app_dir, "backend")

        # Create directory structure
        os.makedirs(backend_dir, exist_ok=True)

        # Copy files to simulate container structure
        current_dir = os.path.dirname(os.path.abspath(__file__))

        # Copy main.py to app root
        shutil.copy(os.path.join(current_dir, "main.py"), app_dir)

        # Copy auth_utils and other modules to backend
        for module in [
            "auth_utils.py",
            "emotion_utils.py",
            "stripe_utils.py",
            "firestore_utils.py",
            "group_utils.py",
        ]:
            src_file = os.path.join(current_dir, module)
            if os.path.exists(src_file):
                shutil.copy(src_file, backend_dir)

        # Create __init__.py files
        with open(os.path.join(app_dir, "__init__.py"), "w") as f:
            f.write("")
        with open(os.path.join(backend_dir, "__init__.py"), "w") as f:
            f.write("")

        # Modify sys.path to simulate container
        original_path = sys.path.copy()
        try:
            # Clear path and add container paths
            sys.path.clear()
            sys.path.extend(
                [
                    app_dir,
                    backend_dir,
                    "/usr/local/lib/python3.11/site-packages",  # Standard container paths
                    "/usr/lib/python3.11",
                    "/usr/lib/python3.11/lib-dynload",
                ]
            )

            print(f"  Simulated container sys.path: {sys.path[:3]}...")

            # Change to app directory
            original_cwd = os.getcwd()
            os.chdir(app_dir)

            try:
                # Test the exact import pattern from main.py line 36
                print("  Testing import from simulated /app directory...")

                # First test if auth_utils is importable
                print("    Checking auth_utils module availability...")
                import importlib.util

                # Look for auth_utils in backend directory
                auth_utils_path = os.path.join(backend_dir, "auth_utils.py")
                if not os.path.exists(auth_utils_path):
                    print(f"    ❌ auth_utils.py not found at {auth_utils_path}")
                    return False

                print(f"    ✅ auth_utils.py found at {auth_utils_path}")

                # Add backend to path if not already there
                if backend_dir not in sys.path:
                    sys.path.insert(0, backend_dir)

                # Now test the import
                print(
                    "    Executing: from backend.auth_utils import get_rest_session, PROJECT_ID"
                )
                from backend.auth_utils import get_rest_session, PROJECT_ID

                print("    ✅ Container environment import successful!")
                print(f"    get_rest_session: {callable(get_rest_session)}")
                print(f"    PROJECT_ID: {PROJECT_ID}")

                return True

            except Exception as e:
                print(f"    ❌ Container import failed: {e}")
                import traceback

                traceback.print_exc()
                return False
            finally:
                os.chdir(original_cwd)

        finally:
            # Restore original path
            sys.path.clear()
            sys.path.extend(original_path)


def test_docker_python_path():
    """Test the exact Python path setup that Docker would use."""
    print("🧪 Testing Docker-style Python path setup...")

    try:
        # Save original path
        original_path = sys.path.copy()

        # Clear and setup Docker-style paths
        sys.path.clear()
        sys.path.extend(
            [
                "/app",  # Main app directory
                "/app/backend",  # Backend modules
                "/usr/local/lib/python3.11/site-packages",
                "/usr/lib/python3.11",
                "/usr/lib/python3.11/lib-dynload",
            ]
        )

        # Add current directory for testing
        current_dir = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, current_dir)

        print(f"  Docker-style sys.path: {sys.path[:3]}...")

        # Test import
        print("  Testing import with Docker paths...")
        from backend.auth_utils import get_rest_session, PROJECT_ID

        print("  ✅ Docker path import successful!")
        return True

    except Exception as e:
        print(f"  ❌ Docker path import failed: {e}")
        return False
    finally:
        # Restore original path
        sys.path.clear()
        sys.path.extend(original_path)


def main():
    """Run container environment tests."""
    print("🚀 Testing line 36 import in container environments...")
    print("=" * 70)

    tests_passed = 0
    total_tests = 2

    if test_docker_python_path():
        tests_passed += 1

    if test_container_environment():
        tests_passed += 1

    print("=" * 70)
    print(f"📊 Results: {tests_passed}/{total_tests} container tests passed")

    if tests_passed == total_tests:
        print("🎉 Line 36 import works in all container environments!")
        return 0
    else:
        print("❌ Some container import issues found.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
