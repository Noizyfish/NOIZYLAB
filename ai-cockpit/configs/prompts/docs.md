# Generate Documentation

Generate clear documentation for the selected code.

## Documentation Types

1. **Docstrings** - Function/class documentation
2. **README sections** - If generating for a module
3. **API docs** - If endpoints/interfaces

## Style

- Google docstring format
- Concise but complete
- Include examples where helpful
- Note any gotchas or warnings

## Output Format

### For Functions

```python
def function_name(param1: type, param2: type) -> return_type:
    """Short description.

    Longer description if needed.

    Args:
        param1: Description of param1.
        param2: Description of param2.

    Returns:
        Description of return value.

    Raises:
        ErrorType: When this error occurs.

    Example:
        >>> function_name("value", 123)
        "result"
    """
```

### For Classes

```python
class ClassName:
    """Short description.

    Longer description if needed.

    Attributes:
        attr1: Description.
        attr2: Description.

    Example:
        >>> obj = ClassName()
        >>> obj.method()
    """
```
