#!/usr/bin/env python3
"""
Comprehensive code quality checker for the Roamio backend.
Checks for duplicate functions, code complexity, error handling, and logging.
"""
import ast
import re
import sys
import logging
from collections import defaultdict
from typing import List, Dict, Tuple, Set
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


class CodeQualityChecker:
    """Comprehensive code quality checker for Python files."""

    def __init__(self):
        self.errors = []
        self.warnings = []

    def check_duplicate_functions(self, filename: str) -> List[str]:
        """Check for duplicate function definitions."""
        issues = []
        try:
            with open(filename, "r") as f:
                content = f.read()

            tree = ast.parse(content)
            functions = defaultdict(list)

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    functions[node.name].append(node.lineno)

            for func_name, line_numbers in functions.items():
                if len(line_numbers) > 1:
                    issues.append(
                        f"Duplicate function '{func_name}' at lines: {line_numbers}"
                    )

        except Exception as e:
            issues.append(f"Error checking duplicates: {e}")

        return issues

    def check_error_handling(self, filename: str) -> List[str]:
        """Check for proper error handling in functions."""
        issues = []
        try:
            with open(filename, "r") as f:
                content = f.read()

            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Skip if function is very short (likely a simple getter/setter)
                    if len(node.body) < 3:
                        continue

                    has_try_except = any(
                        isinstance(child, ast.Try) for child in ast.walk(node)
                    )
                    has_api_calls = any(
                        isinstance(child, ast.Call)
                        and isinstance(child.func, ast.Attribute)
                        and child.func.attr
                        in ["get", "post", "put", "delete", "request"]
                        for child in ast.walk(node)
                    )
                    has_external_calls = any(
                        isinstance(child, ast.Call)
                        and isinstance(child.func, ast.Name)
                        and child.func.id in ["open", "requests", "json", "os"]
                        for child in ast.walk(node)
                    )

                    if (has_api_calls or has_external_calls) and not has_try_except:
                        issues.append(
                            f"Function '{node.name}' (line {node.lineno}) may need error handling"
                        )

        except Exception as e:
            issues.append(f"Error checking error handling: {e}")

        return issues

    def check_logging(self, filename: str) -> List[str]:
        """Check for proper logging in functions."""
        issues = []
        try:
            with open(filename, "r") as f:
                content = f.read()

            tree = ast.parse(content)

            # Check if logging is imported
            has_logging_import = False
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name == "logging":
                            has_logging_import = True
                elif isinstance(node, ast.ImportFrom):
                    if node.module == "logging":
                        has_logging_import = True

            if not has_logging_import:
                issues.append(
                    "No logging import found - consider adding logging for better debugging"
                )

            # Check for API endpoint functions without logging
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Check if this looks like an API endpoint
                    decorators = [
                        (
                            d.id
                            if isinstance(d, ast.Name)
                            else d.attr if isinstance(d, ast.Attribute) else None
                        )
                        for d in node.decorator_list
                    ]

                    is_api_endpoint = any(
                        dec in ["get", "post", "put", "delete"] for dec in decorators
                    )

                    if is_api_endpoint:
                        has_logging_call = any(
                            isinstance(child, ast.Call)
                            and isinstance(child.func, ast.Attribute)
                            and child.func.attr
                            in ["debug", "info", "warning", "error", "critical"]
                            for child in ast.walk(node)
                        )

                        if not has_logging_call:
                            issues.append(
                                f"API endpoint '{node.name}' (line {node.lineno}) should have logging"
                            )

        except Exception as e:
            issues.append(f"Error checking logging: {e}")

        return issues

    def check_code_complexity(self, filename: str) -> List[str]:
        """Check for overly complex functions."""
        issues = []
        try:
            with open(filename, "r") as f:
                content = f.read()

            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    complexity = self._calculate_complexity(node)
                    if complexity > 10:
                        issues.append(
                            f"Function '{node.name}' (line {node.lineno}) has high complexity: {complexity}"
                        )

        except Exception as e:
            issues.append(f"Error checking complexity: {e}")

        return issues

    def _calculate_complexity(self, node: ast.FunctionDef) -> int:
        """Calculate cyclomatic complexity of a function."""
        complexity = 1  # Base complexity

        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1

        return complexity

    def check_file(self, filename: str) -> Dict[str, List[str]]:
        """Run all checks on a file."""
        results = {
            "duplicates": self.check_duplicate_functions(filename),
            "error_handling": self.check_error_handling(filename),
            "logging": self.check_logging(filename),
            "complexity": self.check_code_complexity(filename),
        }

        return results

    def generate_report(self, results: Dict[str, List[str]], filename: str) -> None:
        """Generate a comprehensive report."""
        print(f"\n{'='*60}")
        print(f"CODE QUALITY REPORT FOR: {filename}")
        print(f"{'='*60}")

        total_issues = sum(len(issues) for issues in results.values())

        if total_issues == 0:
            print("✅ No issues found! Code quality looks good.")
            return

        for category, issues in results.items():
            if issues:
                print(f"\n🔍 {category.upper().replace('_', ' ')}:")
                for i, issue in enumerate(issues, 1):
                    print(f"  {i}. {issue}")

        print(f"\n📊 SUMMARY: {total_issues} total issues found")

        # Provide recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if results["duplicates"]:
            print("  • Remove duplicate functions to reduce maintenance burden")
        if results["error_handling"]:
            print(
                "  • Add try-catch blocks around external API calls and file operations"
            )
        if results["logging"]:
            print("  • Add logging statements for better debugging and monitoring")
        if results["complexity"]:
            print(
                "  • Consider breaking down complex functions into smaller, more focused functions"
            )


def main():
    """Main execution function."""
    if len(sys.argv) != 2:
        print("Usage: python code_quality_check.py <python_file>")
        sys.exit(1)

    filename = sys.argv[1]

    if not Path(filename).exists():
        print(f"Error: File '{filename}' not found")
        sys.exit(1)

    checker = CodeQualityChecker()
    results = checker.check_file(filename)
    checker.generate_report(results, filename)

    # Exit with error code if issues found
    total_issues = sum(len(issues) for issues in results.values())
    if total_issues > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
