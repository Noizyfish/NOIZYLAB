# Generate Tests

Generate robust tests for the selected code.

## Test Types Required

1. **Unit tests** - Individual function behavior
2. **Integration tests** - Component interactions (where applicable)
3. **Error paths** - Exception handling, invalid inputs
4. **Boundary conditions** - Empty, null, max values, off-by-one

## Framework

Use `pytest` unless otherwise specified.

## Naming Convention

```
test_<function>_<scenario>_<expected_outcome>
```

Examples:
- `test_calculate_total_empty_list_returns_zero`
- `test_parse_config_missing_key_raises_keyerror`
- `test_save_file_disk_full_raises_ioerror`

## Rules

- Each test should test ONE thing
- Use descriptive test names
- Include docstrings explaining what's tested
- Use fixtures for setup/teardown
- Mock external dependencies (network, filesystem, time)
- **Prefer deterministic patterns** - avoid flaky tests
- No random data without seeds

## Output Format

```python
import pytest
from unittest.mock import Mock, patch

# ============================================================
# FIXTURES
# ============================================================

@pytest.fixture
def sample_data():
    """Provide consistent test data"""
    return {"key": "value"}

@pytest.fixture
def mock_database():
    """Mock database connection"""
    with patch('module.Database') as mock:
        yield mock

# ============================================================
# UNIT TESTS
# ============================================================

class TestFunctionName:
    """Tests for function_name()"""

    def test_valid_input_returns_expected(self, sample_data):
        """Happy path: valid input produces expected output"""
        # Arrange
        expected = "result"

        # Act
        result = function_name(sample_data)

        # Assert
        assert result == expected

    def test_empty_input_returns_default(self):
        """Edge case: empty input returns default value"""
        # Arrange
        # Act
        # Assert

    def test_invalid_input_raises_valueerror(self):
        """Error path: invalid input raises ValueError"""
        with pytest.raises(ValueError, match="expected message"):
            function_name(invalid_input)

# ============================================================
# INTEGRATION TESTS
# ============================================================

class TestIntegration:
    """Integration tests for component interactions"""

    def test_end_to_end_workflow(self, mock_database):
        """Test complete workflow from input to output"""
        pass

# ============================================================
# BOUNDARY TESTS
# ============================================================

@pytest.mark.parametrize("input_val,expected", [
    (0, "zero"),
    (1, "one"),
    (-1, "negative"),
    (999999, "large"),
])
def test_boundary_values(input_val, expected):
    """Test boundary conditions"""
    assert function(input_val) == expected
```

## Setup/Teardown Notes

- **Setup**: What needs to be initialized before tests
- **Teardown**: What needs cleanup after tests
- **Isolation**: How tests are isolated from each other
- **Dependencies**: External services that need mocking

## Coverage Notes

- **Covered**: [list of scenarios tested]
- **Not Covered**: [scenarios requiring manual/integration testing]
- **Flaky Risk**: [any tests that might be non-deterministic]
