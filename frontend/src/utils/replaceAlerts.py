#!/usr/bin/env python3
"""
Quick script to replace all alert() and confirm() calls with professional toast system
Run this once to do bulk replacements across the codebase
"""

import os
import re
import glob

# Define the replacements
ALERT_PATTERNS = [
    # Authentication alerts
    (r'alert\(["\'](?:Login required|You must be logged in!?)["\']?\)', "authError()"),
    # Validation alerts
    (
        r'alert\(["\']Select valid locations["\']?\)',
        'validationError("Please select valid locations")',
    ),
    (r'alert\(["\'](?:Login required)["\']?\)', "authError()"),
    # Success alerts
    (r'alert\(["\'](?:Report submitted|Draft saved!)["\']?\)', 'success("$1")'),
    (
        r'alert\(["\']Caption copied to clipboard["\']?\)',
        'success("Caption copied to clipboard")',
    ),
    (
        r'alert\(["\']You\'ve left the group\.["\']?\)',
        'success("You\'ve left the group")',
    ),
    # Error alerts
    (r'alert\(["\'](?:Failed to.*|Error.*)["\']?\)', 'warning("$1")'),
    # General info alerts
    (
        r'alert\(["\']Time limit too short.*["\']?\)',
        'warning("Time limit too short for full quest; using first stop only")',
    ),
]

CONFIRM_PATTERNS = [
    # Delete confirmations
    (
        r'window\.confirm\(["\']Delete this quest\?["\']?\)',
        'await confirmDelete("this quest")',
    ),
    (
        r'window\.confirm\(["\']Delete account permanently\?["\']?\)',
        'await confirmDelete("your account")',
    ),
    # Share confirmations
    (
        r'window\.confirm\(["\']Share this quest publicly\?["\']?\)',
        'await confirm("Share this quest publicly?")',
    ),
]


def get_frontend_files():
    """Get all JS/JSX files in the frontend"""
    patterns = [
        "/Users/gavinkelly/roamio-codex/frontend/src/**/*.js",
        "/Users/gavinkelly/roamio-codex/frontend/src/**/*.jsx",
    ]

    files = []
    for pattern in patterns:
        files.extend(glob.glob(pattern, recursive=True))

    return files


def replace_in_file(filepath):
    """Replace alert/confirm patterns in a single file"""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content
        changes = []

        # Apply alert patterns
        for pattern, replacement in ALERT_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, replacement, content)
                changes.extend(matches)

        # Apply confirm patterns - these need async handling
        for pattern, replacement in CONFIRM_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, replacement, content)
                changes.extend(matches)

        # Only write if changes were made
        if content != original_content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return len(changes)

        return 0

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return 0


def main():
    """Main replacement function"""
    files = get_frontend_files()
    total_changes = 0

    print(f"Processing {len(files)} files...")

    for filepath in files:
        changes = replace_in_file(filepath)
        if changes > 0:
            print(f"  {filepath}: {changes} replacements")
            total_changes += changes

    print(f"\nTotal replacements made: {total_changes}")
    print(
        "\nNOTE: Files with async confirm() calls may need manual review for proper async/await handling"
    )


if __name__ == "__main__":
    main()
