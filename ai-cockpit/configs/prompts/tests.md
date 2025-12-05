# Generate Tests

Generate robust tests for the selected code.

## Test Types Required

1. **Unit tests** - Individual function behavior
2. **Edge cases** - Boundary conditions, empty inputs, nulls
3. **Error cases** - Exception handling
4. **Integration** - If applicable

## Framework

Use `pytest` unless otherwise specified.

## Rules

- Each test should test ONE thing
- Use descriptive test names: `test_<function>_<scenario>_<expected>`
- Include docstrings explaining what's tested
- Use fixtures for setup
- Mock external dependencies

## Output Format

```python
import pytest

class TestClassName:
    """Tests for ClassName"""

    def test_function_valid_input_returns_expected(self):
        """Test that valid input produces expected output"""
        # Arrange
        # Act
        # Assert
```

### Coverage Notes
- [what's covered]
- [what needs manual testing]
