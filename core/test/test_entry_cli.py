import subprocess
import json
import os
import pytest
import allure

@allure.suite("CLI Tests")
class TestEntryCLI:
    
    @allure.title("Test 'list' command output format")
    @allure.description("Verify that 'python core/entry.py list' returns a valid JSON array of scripts")
    def test_list_scripts_format(self):
        result = subprocess.run(
            ["python", "core/entry.py", "list"],
            capture_output=True,
            text=True,
            env={**os.environ, "PYTHONPATH": "."}
        )
        
        assert result.returncode == 0
        
        # Extract JSON part (robustness check already in Go, but we verify here too)
        raw_output = result.stdout
        start = raw_output.find("[")
        end = raw_output.rfind("]")
        
        assert start != -1 and end != -1, f"No JSON array found in output: {raw_output}"
        
        json_data = json.loads(raw_output[start:end+1])
        assert isinstance(json_data, list)
        
        # Verify basic structure
        if len(json_data) > 0:
            script = json_data[0]
            assert "id" in script
            assert "name" in script
            assert "platform" in script

    @allure.title("Test unknown command")
    def test_unknown_command(self):
        result = subprocess.run(
            ["python", "core/entry.py", "invalid_cmd"],
            capture_output=True,
            text=True,
            env={**os.environ, "PYTHONPATH": "."}
        )
        # Should show help or error
        assert result.returncode != 0

    @allure.title("Test run command with missing script id")
    def test_run_missing_script(self):
        result = subprocess.run(
            ["python", "core/entry.py", "run"],
            capture_output=True,
            text=True,
            env={**os.environ, "PYTHONPATH": "."}
        )
        # Argparse should fail because --script is required
        assert result.returncode != 0
        assert "the following arguments are required: --script" in result.stderr
