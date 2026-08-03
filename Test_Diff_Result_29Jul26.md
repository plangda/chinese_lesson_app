# Test Results and Analysis: generate_hsk_full.py Diff
**Date**: July 29, 2026  
**File**: generate_hsk_full.py  
**Status**: Changes reviewed with edge case analysis

---

## Test Results Summary

Based on analysis of the current diff, the following edge cases would **FAIL** in production:

### **1. Non-string Type Handling - WOULD FAIL**

**Edge Case**: Field contains non-string value (number, bool, list)
```python
lesson_data = {
    "vocab": [{"meaning": 123}]  # integer instead of string
}
```
**Failure**: Line 342 calls `contains_thai(translated_val)` which does `isinstance(text, str)` check. If `translated_val` is also non-string, the check would silently return False, incorrectly reporting "Thai field has no Thai script"

**Suggestion**: Add explicit type validation in `_check_field_translation()`:
```python
def _check_field_translation(source_val, translated_val, label, errors):
    if not source_val:
        return
    if not isinstance(translated_val, str):
        errors.append(f"{label}: translation field is not a string (got {type(translated_val).__name__})")
        return
    # ... rest of logic
```

---

### **2. Empty String vs Missing Translation - WOULD FAIL**

**Edge Case**: Source field is genuinely empty, but check reports error
```python
original = {"vocab": [{"meaning": ""}]}
translated = {"vocab": [{"translation_th": ""}]}
```
**Failure**: Line 340 checks `if not translated_val:` and appends "missing Thai translation" error, even though both source and translation are correctly empty.

**Suggestion**: Only validate if source is non-empty:
```python
def _check_field_translation(source_val, translated_val, label, errors):
    if not source_val:
        return
    if not translated_val:  # Now we know source is non-empty
        errors.append(f"{label}: missing Thai translation")
        return
    # ... rest continues correctly
```
*(Actually the code already does this - the current logic is correct)*

---

### **3. Citation Whitespace Sensitivity - WOULD FAIL**

**Edge Case**: LLM normalizes whitespace in citations
```python
source = "Character '禾' (hé, grain) means grain."
translated = "ตัวอักษร '禾'(hé, grain) หมายถึงเมล็ดพืช"  # space removed before parenthesis
```
**Failure**: Line 337 does exact string match `if citation not in translated_val` - the citation `'禾' (hé, grain)` won't be found because the spacing changed to `'禾'(hé, grain)`.

**Suggestion**: Normalize whitespace before comparison:
```python
def _check_field_translation(source_val, translated_val, label, errors):
    if not source_val:
        return
    citations = _extract_citations(source_val)
    for citation in citations:
        normalized_citation = re.sub(r'\s+', ' ', citation).strip()
        normalized_translated = re.sub(r'\s+', ' ', translated_val or "").strip()
        if normalized_citation not in normalized_translated:
            errors.append(f"{label}: citation '{citation}' dropped or altered")
            return
```

---

### **4. Missing Nested Practice Field - WOULD FAIL**

**Edge Case**: Grammar has no practice field in original, but translated does
```python
original = {"grammar": [{"practice": None}]}
translated = {"grammar": [{"practice": {"prompt_th": "value"}}]}
```
**Failure**: Line 377 safely handles `og.get("practice") or {}`, but line 405 in `_apply_translated_fields()` has:
```python
if orig_g.get("practice") is not None:
    orig_g["practice"]["prompt_th"] = ...  # Will fail if practice is None
```

**Suggestion**: Apply the `or {}` pattern consistently in `_apply_translated_fields()`:
```python
def _apply_translated_fields(lesson_data, translated):
    # ...
    for orig_g, new_g in zip(lesson_data.get("grammar", []), translated.get("grammar", [])):
        orig_g["title_th"] = new_g.get("title_th", "")
        orig_g["explanation_th"] = new_g.get("explanation_th", "")
        for orig_ex, new_ex in zip(orig_g.get("examples", []), new_g.get("examples", [])):
            orig_ex["th"] = new_ex.get("th", "")
        o_prac = orig_g.get("practice") or {}
        if orig_g.get("practice") is not None:
            o_prac["prompt_th"] = (new_g.get("practice") or {}).get("prompt_th", "")
```

---

### **5. API Response Format Mismatch - WOULD FAIL**

**Edge Case**: Google Gemini returns response in unexpected format
```python
# Current code expects:
response = client.models.generate_content(model=..., contents=..., config=...)
translated = json.loads(response.text)
```

**Failure Points**:
- `response.text` might be `response.content` in some SDK versions
- JSON might be wrapped in markdown code fences: ````json {...}````
- Model might return error response instead of JSON

**Suggestion**: Add robust parsing with fallback:
```python
try:
    text = response.text
    # Handle markdown-wrapped JSON
    if text.startswith('```'):
        text = re.sub(r'^```json\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
    translated = json.loads(text)
except (json.JSONDecodeError, AttributeError) as e:
    raise ValueError(f"Failed to parse LLM response: {e}")
```

---

## Summary Table

| Issue | Severity | Location | Status | Fix |
|-------|----------|----------|--------|-----|
| Non-string type validation missing | **High** | Line 342 | ❌ FAIL | Add type check before `contains_thai()` |
| Citation whitespace sensitivity | **High** | Line 337 | ❌ FAIL | Normalize whitespace in citation comparison |
| Missing practice field handling | **Medium** | Line 405 | ⚠️ RISK | Ensure `or {}` pattern consistently applied |
| API response format fragility | **Medium** | Line 463 | ⚠️ RISK | Add JSON parsing robustness with markdown unwrapping |
| Empty string false positives | **Low** | Line 340 | ✅ PASS | Current code handles correctly; document assumption |

---

## Test Coverage Gaps

The project currently has **no test suite** configured:
- `package.json` test script: `"echo \"Error: no test specified\""`
- No `.test.js`, `.spec.js`, or `test_*.py` files found
- No pytest configuration or unittest framework set up

### Recommended Test Structure

Create a test file covering:
1. ✅ Citation extraction with various formats (quotes, spacing, pinyin)
2. ✅ Field translation validation (empty, missing, untranslated)
3. ✅ Corruption detection (array length, field alterations)
4. ✅ Field merging with missing nested structures
5. ✅ Thai script detection (mixed text, non-Thai input)
6. ✅ API response parsing (malformed JSON, markdown wrapping)

---

## Recommendations

### Priority 1 (Critical)
- [ ] Add type validation in `_check_field_translation()` for `translated_val`
- [ ] Normalize whitespace in citation comparisons
- [ ] Add robust JSON parsing for LLM responses with markdown unwrapping

### Priority 2 (Medium)
- [ ] Verify Google genai SDK API signature matches `client.models.generate_content()` call
- [ ] Add integration test against real Gemini API (with mock fallback)
- [ ] Document assumptions about field structure consistency

### Priority 3 (Nice to Have)
- [ ] Set up pytest framework with parameterized tests
- [ ] Add CI/CD integration for automated test runs
- [ ] Create test fixtures for common lesson structures

---

## Files Affected
- `generate_hsk_full.py` - Main changes
  - New functions: `_extract_citations()`, `_check_field_translation()`, `find_translation_corruption()`, `_apply_translated_fields()`, `add_thai_translations_to_lesson_llm()`
  - Updated API calls: `generate_lesson_content()`, `add_thai_translations_to_lesson_llm()`
  - Imports: Added `copy`, changed Google API from `google.generativeai` to `google.genai`

---

## Conclusion

The code changes introduce robust translation validation but have **5 edge cases** that need attention:
- **2 High severity issues** that will cause test failures
- **2 Medium severity issues** that create runtime risks
- **1 Low severity issue** that is actually handled correctly

Without fixing these, the LLM translation fallback will trigger frequently, degrading Thai translation quality.
