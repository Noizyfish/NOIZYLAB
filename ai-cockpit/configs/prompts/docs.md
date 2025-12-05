# Generate Documentation

Produce concise documentation optimized for quick scanning.

## Required Sections

1. **Purpose** - What it does (1-2 sentences)
2. **Inputs/Outputs** - Parameters and return values
3. **Invariants** - Assumptions that must hold
4. **Side Effects** - External state changes
5. **Example Usage** - Copy-paste ready
6. **Known Limitations** - What it can't do

## Style

- Google docstring format
- **Concise** - No filler words
- **Scannable** - Headers, bullets, tables
- **Actionable** - Examples that work

## Output Format

### For Functions

```python
def function_name(param1: type, param2: type) -> return_type:
    """One-line purpose.

    Args:
        param1: What it is. Constraints.
        param2: What it is. Defaults to X.

    Returns:
        What you get back. Type and structure.

    Raises:
        ValueError: When param1 is invalid.
        IOError: When file not found.

    Invariants:
        - param1 must be non-empty
        - Database connection must exist

    Side Effects:
        - Writes to filesystem
        - Modifies global state

    Example:
        >>> result = function_name("input", 42)
        >>> print(result)
        "expected output"

    Limitations:
        - Max 1000 items
        - UTF-8 only
    """
```

### For Classes

```python
class ClassName:
    """One-line purpose.

    Use this when you need to [scenario].

    Attributes:
        attr1 (type): Description.
        attr2 (type): Description. Default: X.

    Invariants:
        - Must call init() before use
        - Not thread-safe

    Example:
        >>> obj = ClassName(config)
        >>> obj.process(data)
        >>> obj.close()

    Limitations:
        - Single-threaded only
        - Memory scales with input size
    """
```

### For Modules/README

```markdown
# Module Name

> One-line description

## Quick Start

\`\`\`python
from module import Thing
result = Thing().do_work()
\`\`\`

## API

| Function | Purpose | Returns |
|----------|---------|---------|
| `func1()` | Does X | `str` |
| `func2(n)` | Does Y | `int` |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `API_KEY` | None | Required |
| `TIMEOUT` | 30 | Seconds |

## Limitations

- Max 1MB payload
- Requires Python 3.10+
```
