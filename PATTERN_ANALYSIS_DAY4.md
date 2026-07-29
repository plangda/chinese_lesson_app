# Pattern Analysis: hsk1_day4 Failure

## Current Pattern (in generate_hsk_full.py)

```regex
_CJK_PROTECT_PATTERN = re.compile(
    r"("
    r"'[一-鿿]+'(?:\s*\([^-,)]*\))?"
    r"|"[^"]+"(?:\s*\([^-,)]*\))?"
    r"|[一-鿿　-〿＀-￯_]+(?:\s*\([^-,)]*\))?"
    r")"
)
```

This pattern protects **citations within English text**, like:
- `'心' (xin - heart)` ← protects only `'心' (xin` part
- `"朋友" (friend)` ← protects the quoted Chinese + pinyin
- Bare CJK followed by romanization

## Why hsk1_day4 Still Fails

**The validation error:** `grammar[Expressing Possession with "的" (de)].examples: cn/py field altered`

The examples in day4 grammar lessons have this structure:
```json
{
  "cn": "这是我的朋友。",
  "py": "Zhè shì wǒ de péngyou.",
  "en": "This is my friend."
}
```

**The root cause:** When we send the FULL lesson JSON to the LLM, the LLM is modifying the `"cn"` and `"py"` fields even though the prompt says "NEVER modify". The protection pattern is **useless here** because:

1. `_CJK_PROTECT_PATTERN` only works on TEXT strings with embedded citations
2. It doesn't apply to field *names* or *entire field contents* in JSON
3. The LLM receives the raw JSON and can modify any field regardless of the pattern

## The Real Solution: Field Masking

Instead of trying to protect cn/py fields with a pattern, we should **prevent the LLM from seeing them in the first place**:

### Before (Current - Fails):
```json
{
  "grammar": [{
    "title": "Expressing Possession with \"的\" (de)",
    "examples": [
      { "cn": "这是我的朋友。", "py": "Zhè shì wǒ de péngyou.", "en": "This is my friend." },
      ...
    ]
  }]
}
```

### After (Proposed - Masks cn/py):
```json
{
  "grammar": [{
    "title": "Expressing Possession with \"的\" (de)",
    "examples": [
      { "_cn": "这是我的朋友。", "_py": "Zhè shì wǒ de péngyou.", "en": "This is my friend." },
      ...
    ]
  }]
}
```

Then inject them back after LLM response.

## Implementation

Three steps:

1. **Mask function** - Before sending to LLM, rename cn→_cn, py→_py, character→_character
2. **Unmask function** - After LLM returns, rename _cn→cn, _py→py, _character→character in the response
3. **Update LLM call** - Use masked JSON in prompt, unmask response before validation

This approach:
- ✅ Guarantees cn/py fields are never modified (LLM doesn't see them)
- ✅ Scales to future fields that shouldn't be translated
- ✅ More robust than pattern-based protection
- ✅ Less fragile than hoping LLM follows "never modify" instructions

## Pattern Expansion Alternative (NOT RECOMMENDED)

Could we expand `_CJK_PROTECT_PATTERN` to protect more cases? **No**, because:
- Pattern works on string *content*, not JSON *structure*
- JSON arrays and field names aren't text to protect
- Pattern would have zero effect on `{"cn": "..."}` keys/values

Pattern expansion would be **rigid and ineffective** for this case.
