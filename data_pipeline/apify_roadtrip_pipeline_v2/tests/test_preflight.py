from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from src.preflight import check_outputs, read_env_token


class PreflightTests(unittest.TestCase):
    def test_read_env_token_does_not_accept_placeholder(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir_name:
            env_path = Path(temp_dir_name) / ".env"
            env_path.write_text(
                "APIFY_API_TOKEN=replace_with_your_apify_token\n",
                encoding="utf-8",
            )

            self.assertFalse(read_env_token(env_path))

    def test_read_env_token_accepts_configured_value(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir_name:
            env_path = Path(temp_dir_name) / ".env"
            env_path.write_text("APIFY_API_TOKEN=test_token\n", encoding="utf-8")

            self.assertTrue(read_env_token(env_path))

    def test_check_outputs_reports_dataset_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir_name:
            data_dir = Path(temp_dir_name)
            processed_dir = data_dir / "processed"
            processed_dir.mkdir()
            for name in [
                "places_ai_suggestions.jsonl",
                "clean_summary.json",
            ]:
                (processed_dir / name).write_text("x", encoding="utf-8")

            outputs = check_outputs(data_dir)

            self.assertTrue(all(outputs.values()))


if __name__ == "__main__":
    unittest.main()
