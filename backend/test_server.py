#!/usr/bin/env python3
"""
Test script to verify the server can start on port 8080 and respond to health checks.
"""

import asyncio
import sys
import os
import subprocess
import time
import requests
from threading import Thread


def test_server_startup():
    """Test that the server can start and respond to health checks."""
    print("🧪 Testing server startup on port 8080...")

    # Set required environment variables
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "test-project")
    os.environ.setdefault("PORT", "8080")

    try:
        # Start the server in a subprocess
        print("  Starting server...")
        process = subprocess.Popen(
            [sys.executable, "main.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        # Wait a moment for server to start
        time.sleep(5)

        # Check if process is still running
        if process.poll() is not None:
            stdout, stderr = process.communicate()
            print(f"  ❌ Server process exited early")
            print(f"  stdout: {stdout}")
            print(f"  stderr: {stderr}")
            return False

        # Test health endpoint
        try:
            response = requests.get("http://localhost:8080/health", timeout=10)
            if response.status_code == 200:
                print("  ✅ Health endpoint responding")
                print(f"  Response: {response.json()}")
                success = True
            else:
                print(f"  ❌ Health endpoint returned {response.status_code}")
                print(f"  Response: {response.text}")
                success = False
        except Exception as e:
            print(f"  ❌ Failed to connect to health endpoint: {e}")
            success = False

        # Test root endpoint
        try:
            response = requests.get("http://localhost:8080/", timeout=10)
            if response.status_code == 200:
                print("  ✅ Root endpoint responding")
                print(f"  Response: {response.json()}")
            else:
                print(f"  ⚠️ Root endpoint returned {response.status_code}")
        except Exception as e:
            print(f"  ⚠️ Failed to connect to root endpoint: {e}")

        # Terminate the server process
        process.terminate()
        process.wait()

        return success

    except Exception as e:
        print(f"  ❌ Server startup test failed: {e}")
        return False


def main():
    """Run server startup test."""
    print("🚀 Starting server startup test...")
    print("=" * 50)

    if test_server_startup():
        print("=" * 50)
        print("🎉 Server startup test passed!")
        print("✅ Server can start on port 8080")
        print("✅ Health checks are working")
        return 0
    else:
        print("=" * 50)
        print("❌ Server startup test failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
