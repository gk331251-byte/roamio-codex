#!/usr/bin/env python3
"""
Test script to specifically test line 36 of main.py by importing it directly.
"""

import sys
import os

# Add the current directory to Python path (same as main.py)
if '/app' not in sys.path:
    sys.path.insert(0, '/app')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_main_py_line_36():
    """Test the exact import that happens on line 36 of main.py."""
    print("🧪 Testing line 36 of main.py...")
    
    try:
        # Set up the same environment as main.py
        from dotenv import load_dotenv
        import certifi
        
        load_dotenv()
        os.environ["SSL_CERT_FILE"] = certifi.where()
        
        print("  Environment setup complete")
        
        # Test the exact import from line 36
        print("  Executing: from auth_utils import get_rest_session, PROJECT_ID")
        from backend.auth_utils import get_rest_session, PROJECT_ID
        
        print("  ✅ Line 36 import successful!")
        print(f"  get_rest_session: {get_rest_session}")
        print(f"  PROJECT_ID: {PROJECT_ID}")
        
        # Test calling the function
        print("  Testing function call...")
        session = get_rest_session()
        print(f"  ✅ Function call successful, session type: {type(session)}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Line 36 import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_main_py_startup():
    """Test if main.py can start up without errors."""
    print("🧪 Testing main.py startup...")
    
    try:
        # Try importing the main module
        print("  Importing main module...")
        import main
        print("  ✅ main.py imported successfully!")
        
        # Check if the app was created
        if hasattr(main, 'app'):
            print("  ✅ FastAPI app created successfully")
        else:
            print("  ❌ FastAPI app not found")
            return False
        
        # Check if key functions are available
        if hasattr(main, 'get_rest_session'):
            print("  ✅ get_rest_session available in main module")
        else:
            print("  ⚠️ get_rest_session not directly available in main module (this is okay)")
        
        return True
        
    except Exception as e:
        print(f"  ❌ main.py startup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests."""
    print("🚀 Testing specific line 36 import issue...")
    print("="*60)
    
    tests_passed = 0
    total_tests = 2
    
    if test_main_py_line_36():
        tests_passed += 1
    
    if test_main_py_startup():
        tests_passed += 1
    
    print("="*60)
    print(f"📊 Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 Line 36 import works correctly!")
        return 0
    else:
        print("❌ Import issues found on line 36.")
        return 1

if __name__ == "__main__":
    sys.exit(main())