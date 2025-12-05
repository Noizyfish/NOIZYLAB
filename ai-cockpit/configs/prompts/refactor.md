# Refactor Code

Refactor the selected code:

## Goals

1. **Improve clarity and naming** - Self-documenting, descriptive
2. **Add small, focused functions** - Single responsibility
3. **Maintain behavior** - Show diffs to prove equivalence
4. **Add tests for key paths** - Cover happy path and edge cases
5. **Highlight any API or breaking change** - Flag for review

## Rules

- Keep changes minimal and focused
- Don't add features not requested
- Preserve existing behavior exactly
- Add type hints where missing
- Remove dead code
- Show before/after diffs

## Output Format

### Patch

```diff
- old code
+ new code
```

### Comments

Inline comments explaining non-obvious changes.

### Tests

```python
def test_refactored_function():
    """Test key behavior is preserved"""
    # Arrange
    # Act
    # Assert
```

### Rationale

Brief explanation of why each change improves the code.

### Breaking Changes

- [ ] None
- [ ] API signature changed: [details]
- [ ] Return type changed: [details]
- [ ] Side effects changed: [details]
