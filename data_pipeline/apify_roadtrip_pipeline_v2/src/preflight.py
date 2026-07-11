from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path


DEFAULT_DATA_DIR = Path("data")
DEFAULT_ENV_PATH = Path(".env")

REQUIRED_IMPORTS = {
    "apify_client": "apify-client",
    "dotenv": "python-dotenv",
    "numpy": "numpy",
    "pandas": "pandas",
    "yaml": "PyYAML",
}

EXPECTED_OUTPUTS = [
    "processed/places_ai_suggestions.jsonl",
    "processed/clean_summary.json",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check whether the Apify POI pipeline can produce dataset artifacts."
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_PATH)
    parser.add_argument(
        "--require-token",
        action="store_true",
        help="Fail when APIFY_API_TOKEN is not available.",
    )
    return parser.parse_args()


def read_env_token(env_path: Path) -> bool:
    if os.getenv("APIFY_API_TOKEN"):
        return True

    if not env_path.exists():
        return False

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if not line.startswith("APIFY_API_TOKEN="):
            continue
        value = line.split("=", 1)[1].strip().strip('"').strip("'")
        return bool(value and value != "replace_with_your_apify_token")

    return False


def check_imports() -> dict[str, bool]:
    return {
        package: importlib.util.find_spec(module) is not None
        for module, package in REQUIRED_IMPORTS.items()
    }


def check_outputs(data_dir: Path) -> dict[str, bool]:
    return {
        output: (data_dir / output).exists()
        for output in EXPECTED_OUTPUTS
    }


def main() -> int:
    args = parse_args()
    imports = check_imports()
    outputs = check_outputs(args.data_dir)
    token_available = read_env_token(args.env_file)

    status = {
        "python_version": sys.version.split()[0],
        "token_available": token_available,
        "dependencies": imports,
        "expected_outputs": outputs,
    }

    missing_dependencies = [
        package for package, available in imports.items() if not available
    ]
    missing_outputs = [
        output for output, available in outputs.items() if not available
    ]

    status["ready_for_apify_crawl"] = (
        token_available and not missing_dependencies
    )
    status["dataset_present"] = not missing_outputs

    print(json.dumps(status, ensure_ascii=False, indent=2))

    if missing_dependencies:
        print(
            "Missing dependencies: " + ", ".join(missing_dependencies),
            file=sys.stderr,
        )
    if args.require_token and not token_available:
        print("APIFY_API_TOKEN is not configured.", file=sys.stderr)

    if missing_dependencies or (args.require_token and not token_available):
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
