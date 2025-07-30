#!/usr/bin/env python3
"""
Test script to simulate realistic container environment matching the Dockerfile.
"""

import sys
import os

def test_dockerfile_environment():
    """Test the exact environment setup from the Dockerfile."""
    print("🧪 Testing Dockerfile environment setup...")
    
    try:
        # Save original path and cwd
        original_path = sys.path.copy()
        original_cwd = os.getcwd()
        
        # Simulate Dockerfile environment variables
        os.environ['PYTHONUNBUFFERED'] = '1'
        os.environ['PYTHONPATH'] = '/app'
        os.environ['PORT'] = '8080'
        
        # Add /app to path (like the container would)
        if '/app' not in sys.path:
            sys.path.insert(0, '/app')
        
        # Add current directory to simulate copied files
        current_dir = os.path.dirname(os.path.abspath(__file__))
        if current_dir not in sys.path:
            sys.path.insert(0, current_dir)
        
        print(f"  PYTHONPATH: {os.environ.get('PYTHONPATH')}")
        print(f"  Current sys.path: {sys.path[:3]}...")
        
        # Test the exact sequence from main.py
        print("  Setting up environment like main.py...")
        
        from dotenv import load_dotenv
        import certifi
        
        load_dotenv()
        os.environ["SSL_CERT_FILE"] = certifi.where()
        
        # This is the critical line 36 test
        print("  Executing line 36: from backend.auth_utils import get_rest_session, PROJECT_ID")
        from backend.auth_utils import get_rest_session, PROJECT_ID
        
        print("  ✅ Dockerfile environment import successful!")
        print(f"  get_rest_session: {callable(get_rest_session)}")
        print(f"  PROJECT_ID: {PROJECT_ID}")
        
        # Test function call
        print("  Testing function call...")
        session = get_rest_session()
        print(f"  ✅ Function call successful, session: {type(session)}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Dockerfile environment test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Restore environment
        if 'PYTHONUNBUFFERED' in os.environ:
            del os.environ['PYTHONUNBUFFERED']
        if 'PYTHONPATH' in os.environ and os.environ['PYTHONPATH'] == '/app':
            del os.environ['PYTHONPATH']
        if 'PORT' in os.environ:
            del os.environ['PORT']

def test_module_resolution():
    """Test how Python resolves the auth_utils module."""
    print("🧪 Testing module resolution...")
    
    try:
        import importlib.util
        import inspect
        
        # Find auth_utils module
        print("  Locating auth_utils module...")
        import auth_utils
        
        module_file = inspect.getfile(auth_utils)
        print(f"  ✅ auth_utils found at: {module_file}")
        
        # Check if get_rest_session is defined
        if hasattr(auth_utils, 'get_rest_session'):
            func = getattr(auth_utils, 'get_rest_session')
            func_file = inspect.getfile(func)
            func_line = inspect.getsourcelines(func)[1]
            print(f"  ✅ get_rest_session defined at: {func_file}:{func_line}")
        else:
            print("  ❌ get_rest_session not found in auth_utils")
            return False
        
        # Check if PROJECT_ID is defined
        if hasattr(auth_utils, 'PROJECT_ID'):
            project_id = getattr(auth_utils, 'PROJECT_ID')
            print(f"  ✅ PROJECT_ID found: {project_id}")
        else:
            print("  ❌ PROJECT_ID not found in auth_utils")
            return False
        
        return True
        
    except Exception as e:
        print(f"  ❌ Module resolution test failed: {e}")
        return False

def test_import_order():
    """Test different import orders to check for dependency issues."""
    print("🧪 Testing import order dependencies...")
    
    try:
        # Test 1: Import auth_utils first
        print("  Test 1: Import auth_utils first")
        import importlib
        
        # Remove auth_utils from cache if present
        modules_to_remove = [name for name in sys.modules.keys() if 'auth_utils' in name]
        for module in modules_to_remove:
            del sys.modules[module]
        
        from backend.auth_utils import get_rest_session, PROJECT_ID
        print("  ✅ Test 1 passed")
        
        # Test 2: Import FastAPI components first, then auth_utils
        print("  Test 2: Import FastAPI first, then auth_utils")
        
        # Remove from cache again
        modules_to_remove = [name for name in sys.modules.keys() if 'auth_utils' in name]
        for module in modules_to_remove:
            del sys.modules[module]
        
        from fastapi import FastAPI, HTTPException
        from backend.auth_utils import get_rest_session, PROJECT_ID
        print("  ✅ Test 2 passed")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Import order test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run realistic container tests."""
    print("🚀 Testing line 36 import in realistic container environment...")
    print("=" * 70)
    
    tests_passed = 0
    total_tests = 3
    
    if test_dockerfile_environment():
        tests_passed += 1
    
    if test_module_resolution():
        tests_passed += 1
    
    if test_import_order():
        tests_passed += 1
    
    print("=" * 70)
    print(f"📊 Results: {tests_passed}/{total_tests} realistic tests passed")
    
    if tests_passed == total_tests:
        print("🎉 Line 36 import works correctly in realistic environments!")
        print("✅ No import errors detected on line 36")
        print("✅ get_rest_session function exists and is properly exported")
        print("✅ PROJECT_ID variable exists and is properly exported")
        print("✅ No circular import issues detected")
        return 0
    else:
        print("❌ Some realistic environment issues found.")
        return 1

if __name__ == "__main__":
    sys.exit(main())